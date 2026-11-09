"""Sinkron data siswa dari EMIS Kemenag — khusus admin.

Dua jalur:
1. POST /emis/import  — unggah file Excel/CSV hasil ekspor EMIS (langsung bisa dipakai).
2. POST /emis/sync    — tarik langsung dari server EMIS memakai kredensial di backend/.env
   (EMIS_USERNAME, EMIS_PASSWORD, EMIS_API_URL). Tanpa kredensial → 503 ramah.
Kunci upsert: NISN, lalu NISM. Kredensial tidak pernah dikirim ke browser atau ditulis ke log.
"""

import io
import logging
import os

import httpx
import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from lib.auth import require_admin
from lib.db import db
from models.models import EmisStatus, EmisSyncResult, uid

router = APIRouter()
logger = logging.getLogger(__name__)

ALIASES = {
    "nama": ["nama", "nama_lengkap", "nama siswa", "nama_siswa", "nama peserta didik", "name"],
    "nisn": ["nisn"],
    "nism": ["nism", "nis_madrasah", "nis madrasah", "nis lokal", "nis"],
    "jk": ["jk", "jenis_kelamin", "jenis kelamin", "l/p", "gender"],
    "tempat_lahir": ["tempat_lahir", "tempat lahir", "birth_place"],
    "tanggal_lahir": ["tanggal_lahir", "tanggal lahir", "tgl lahir", "tgl_lahir", "birth_date"],
    "alamat": ["alamat", "address"],
    "ayah": ["nama ayah", "nama_ayah", "ayah"],
    "ibu": ["nama ibu", "nama_ibu", "ibu", "nama ibu kandung"],
    "kelas": ["kelas", "rombel", "rombongan belajar", "tingkat_rombel"],
}


def _norm_key(k: str) -> str:
    return str(k).strip().lower().replace("\n", " ")


def _clean(v) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return ""
    if hasattr(v, "strftime"):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    return s[:-2] if s.endswith(".0") and s[:-2].isdigit() else s


def normalize(row: dict) -> dict:
    low = {_norm_key(k): v for k, v in row.items()}
    out = {}
    for field, names in ALIASES.items():
        for n in names:
            if n in low and _clean(low[n]):
                out[field] = _clean(low[n])
                break
    jk = out.get("jk", "").upper()
    out["jk"] = "P" if jk.startswith("P") else "L"
    return out


async def upsert_rows(rows: list[dict]) -> EmisSyncResult:
    kelas_by_nama = {k["nama"].replace(" ", "").upper(): k["id"] for k in await db.kelas.find().to_list(500)}
    dibuat = diperbarui = 0
    for raw in rows:
        r = normalize(raw)
        if not r.get("nama") or not (r.get("nisn") or r.get("nism")):
            continue
        q = {"nisn": r["nisn"]} if r.get("nisn") else {"nism": r["nism"]}
        fields = {k: r[k] for k in ("nama", "nisn", "nism", "jk", "tempat_lahir", "tanggal_lahir", "alamat", "ayah", "ibu") if r.get(k)}
        kelas_id = kelas_by_nama.get(r.get("kelas", "").replace(" ", "").upper())
        if kelas_id:
            fields["kelas_id"] = kelas_id
        existing = await db.siswa.find_one(q)
        if existing:
            await db.siswa.update_one({"id": existing["id"]}, {"$set": fields})
            diperbarui += 1
        else:
            await db.siswa.insert_one(
                {"id": uid(), "nis": r.get("nism", ""), "status": "aktif", "tahun_lulus": None,
                 "kelas_id": kelas_id, **{"nism": "", "nisn": "", **fields}}
            )
            dibuat += 1
    return EmisSyncResult(dibuat=dibuat, diperbarui=diperbarui, total=dibuat + diperbarui,
                          keterangan=f"{dibuat} siswa baru, {diperbarui} diperbarui")


def _configured() -> bool:
    return bool(os.environ.get("EMIS_API_URL") and os.environ.get("EMIS_USERNAME") and os.environ.get("EMIS_PASSWORD"))


@router.get("/emis/status", response_model=EmisStatus)
async def emis_status(_: dict = Depends(require_admin)):
    if _configured():
        return EmisStatus(terkonfigurasi=True, keterangan="Akun EMIS tersimpan aman di server.")
    return EmisStatus(
        terkonfigurasi=False,
        keterangan="Sambungan langsung belum aktif. Gunakan impor file ekspor EMIS (Excel/CSV).",
    )


@router.post("/emis/import", response_model=EmisSyncResult)
async def emis_import(file: UploadFile = File(...), _: dict = Depends(require_admin)):
    data = await file.read()
    if len(data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File terlalu besar (maks. 10MB)")
    name = (file.filename or "").lower()
    try:
        if name.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(data), dtype=str)
        elif name.endswith((".xlsx", ".xls")):
            df = pd.read_excel(io.BytesIO(data), dtype=str)
        else:
            raise HTTPException(status_code=400, detail="Format file harus .xlsx atau .csv")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=400, detail="File tidak dapat dibaca. Pastikan file ekspor EMIS asli.")
    res = await upsert_rows(df.to_dict(orient="records"))
    if res.total == 0:
        raise HTTPException(status_code=400, detail="Tidak ada baris valid (butuh kolom Nama dan NISN/NISM)")
    return res


@router.post("/emis/sync", response_model=EmisSyncResult)
async def emis_sync(_: dict = Depends(require_admin)):
    if not _configured():
        raise HTTPException(status_code=503, detail="Sambungan EMIS belum dikonfigurasi. Gunakan impor file ekspor EMIS.")
    base = os.environ["EMIS_API_URL"].rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            auth = await client.post(
                base + os.environ.get("EMIS_AUTH_PATH", "/auth/login"),
                json={"username": os.environ["EMIS_USERNAME"], "password": os.environ["EMIS_PASSWORD"]},
            )
            if auth.status_code in (401, 403):
                raise HTTPException(status_code=502, detail="Akun EMIS ditolak server EMIS")
            auth.raise_for_status()
            body = auth.json()
            token = body.get("access_token") or body.get("token") or (body.get("data") or {}).get("token")
            if not token:
                raise HTTPException(status_code=502, detail="Server EMIS tidak mengembalikan token")
            r = await client.get(
                base + os.environ.get("EMIS_STUDENTS_PATH", "/students"),
                headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            )
            r.raise_for_status()
            payload = r.json()
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("EMIS sync gagal: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Gagal terhubung ke EMIS. Coba lagi atau gunakan impor file.")
    rows = payload if isinstance(payload, list) else (payload.get("data") or payload.get("students") or [])
    if isinstance(rows, dict):
        rows = rows.get("items") or rows.get("data") or []
    return await upsert_rows(rows)
