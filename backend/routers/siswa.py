"""Siswa, kenaikan kelas (naik/tinggal/lulus) dan alumnus."""

from fastapi import APIRouter, Depends, HTTPException

from lib.access import check_siswa_wali_or_admin
from lib.auth import get_current_user, require_admin
from lib.db import db
from lib.dates import today_iso
from models.models import BiodataUpdate, MutasiKeluarIn, MutasiMasukIn, KenaikanItem, KenaikanRequest, KenaikanRow, SiswaCreate, SiswaOut, SiswaUpdate, uid

router = APIRouter()

MAX_FOTO = 2_800_000  # ~2MB gambar dalam data URL


async def _kelas_map() -> dict:
    return {k["id"]: k["nama"] for k in await db.kelas.find().to_list(500)}


@router.get("/siswa", response_model=list[SiswaOut])
async def list_siswa(
    kelas_id: str | None = None,
    status: str | None = None,
    _: dict = Depends(get_current_user),
):
    q: dict = {}
    if kelas_id:
        q["kelas_id"] = kelas_id
    if status:
        q["status"] = status
    docs = await db.siswa.find(q).sort("nama", 1).to_list(3000)
    kelas_map = await _kelas_map()
    return [
        SiswaOut(**{**s, "kelas_nama": kelas_map.get(s.get("kelas_id") or "")})
        for s in docs
    ]


@router.post("/siswa", response_model=SiswaOut)
async def create_siswa(body: SiswaCreate, _: dict = Depends(require_admin)):
    if body.kelas_id and not await db.kelas.find_one({"id": body.kelas_id}):
        raise HTTPException(status_code=400, detail="Kelas tidak ditemukan")
    doc = {
        "id": uid(),
        "nis": body.nis,
        "nism": body.nism,
        "nisn": body.nisn,
        "nama": body.nama,
        "jk": body.jk,
        "kelas_id": body.kelas_id,
        "status": "aktif",
        "tahun_lulus": None,
    }
    await db.siswa.insert_one(doc)
    kelas = await db.kelas.find_one({"id": body.kelas_id}) if body.kelas_id else None
    return SiswaOut(**{**doc, "kelas_nama": kelas["nama"] if kelas else None})


@router.put("/siswa/{siswa_id}", response_model=SiswaOut)
async def update_siswa(siswa_id: str, body: SiswaUpdate, _: dict = Depends(require_admin)):
    doc = await db.siswa.find_one({"id": siswa_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    set_fields = body.model_dump(exclude_unset=True)
    if set_fields.get("foto") and len(set_fields["foto"]) > MAX_FOTO:
        raise HTTPException(status_code=400, detail="Foto terlalu besar (maks. 2MB)")
    if set_fields:
        await db.siswa.update_one({"id": siswa_id}, {"$set": set_fields})
    merged = {**doc, **set_fields}
    kelas_map = await _kelas_map()
    return SiswaOut(**{**merged, "kelas_nama": kelas_map.get(merged.get("kelas_id") or "")})


@router.put("/siswa/{siswa_id}/biodata", response_model=SiswaOut)
async def update_biodata(siswa_id: str, body: BiodataUpdate, user: dict = Depends(get_current_user)):
    doc, kelas = await check_siswa_wali_or_admin(siswa_id, user)
    set_fields = body.model_dump(exclude_none=True)
    if set_fields.get("foto") and len(set_fields["foto"]) > MAX_FOTO:
        raise HTTPException(status_code=400, detail="Foto terlalu besar (maks. 2MB)")
    if set_fields:
        await db.siswa.update_one({"id": siswa_id}, {"$set": set_fields})
    return SiswaOut(**{**doc, **set_fields, "kelas_nama": kelas["nama"] if kelas else None})


@router.delete("/siswa/{siswa_id}")
async def delete_siswa(siswa_id: str, _: dict = Depends(require_admin)):
    await db.nilai.delete_many({"siswa_id": siswa_id})
    await db.wali_rapot.delete_many({"siswa_id": siswa_id})
    await db.siswa.delete_one({"id": siswa_id})
    return {"ok": True}


# ---------- Kenaikan kelas ----------
def _suffix(nama: str) -> str:
    return nama.split("-", 1)[1] if "-" in nama else ""


def _default_target(kelas_list: list[dict], kelas: dict | None) -> dict | None:
    if not kelas:
        return None
    cands = [c for c in kelas_list if c["tingkat"] == kelas["tingkat"] + 1]
    same = [c for c in cands if _suffix(c["nama"]) == _suffix(kelas["nama"])]
    return (same or cands or [None])[0]


@router.get("/kenaikan/preview", response_model=list[KenaikanRow])
async def kenaikan_preview(tahun: str, _: dict = Depends(require_admin)):
    kelas_list = await db.kelas.find().sort([("tingkat", 1), ("nama", 1)]).to_list(500)
    kelas_by_id = {k["id"]: k for k in kelas_list}
    siswa_list = await db.siswa.find({"status": "aktif"}).sort("nama", 1).to_list(3000)
    wali_docs = await db.wali_rapot.find({"tahun": tahun, "semester": "genap"}).to_list(3000)
    keputusan_by_siswa = {w["siswa_id"]: w.get("keputusan", "") for w in wali_docs}

    rows: list[KenaikanRow] = []
    for s in siswa_list:
        k = kelas_by_id.get(s.get("kelas_id") or "")
        tingkat = k["tingkat"] if k else 0
        kw = keputusan_by_siswa.get(s["id"], "")
        target = None
        if tingkat >= 3 or kw == "lulus":
            aksi = "lulus"
        elif kw == "tinggal":
            aksi = "tinggal"
        else:
            aksi = "naik"
            target = _default_target(kelas_list, k)
        rows.append(
            KenaikanRow(
                siswa=SiswaOut(**{**s, "kelas_nama": k["nama"] if k else ""}),
                kelas_nama=k["nama"] if k else "",
                tingkat=tingkat,
                keputusan_wali=kw,
                aksi=aksi,
                kelas_tujuan_id=target["id"] if target else None,
                kelas_tujuan_nama=target["nama"] if target else "",
            )
        )
    return rows


@router.post("/kenaikan")
async def kenaikan_apply(body: KenaikanRequest, _: dict = Depends(require_admin)):
    naik = lulus = tinggal = 0
    for item in body.keputusan:
        s = await db.siswa.find_one({"id": item.siswa_id})
        if not s or s.get("status") != "aktif":
            continue
        if item.aksi == "naik":
            if not item.kelas_tujuan_id:
                continue
            await db.siswa.update_one({"id": item.siswa_id}, {"$set": {"kelas_id": item.kelas_tujuan_id}})
            naik += 1
        elif item.aksi == "lulus":
            tahun_lulus = body.tahun.split("/")[-1] if "/" in body.tahun else body.tahun
            kelas = await db.kelas.find_one({"id": s.get("kelas_id")}) if s.get("kelas_id") else None
            mk = {"jenis": "lulus", "tanggal": today_iso("Asia/Jakarta"), "kelas": kelas["nama"] if kelas else "",
                  "tahun": body.tahun, "alasan": "Lulus", "tujuan": ""}
            await db.siswa.update_one(
                {"id": item.siswa_id},
                {"$set": {"status": "lulus", "kelas_id": None, "tahun_lulus": tahun_lulus, "mutasi_keluar": mk}},
            )
            lulus += 1
        else:
            tinggal += 1
    return {"naik": naik, "lulus": lulus, "tinggal": tinggal}

# ---------- Mutasi ----------
@router.post("/siswa/{siswa_id}/mutasi-keluar", response_model=SiswaOut)
async def mutasi_keluar(siswa_id: str, body: MutasiKeluarIn, _: dict = Depends(require_admin)):
    """Siswa pindah/keluar bukan karena lulus: status keluar + catatan untuk lampiran mutasi."""
    s = await db.siswa.find_one({"id": siswa_id})
    if not s:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    if s.get("status") != "aktif":
        raise HTTPException(status_code=400, detail="Hanya siswa aktif yang dapat dimutasi keluar")
    if not body.alasan.strip() or not body.tanggal:
        raise HTTPException(status_code=400, detail="Tanggal dan alasan mutasi wajib diisi")
    kelas = await db.kelas.find_one({"id": s.get("kelas_id")}) if s.get("kelas_id") else None
    settings = await db.settings.find_one({"_id": "settings"}) or {}
    mk = {"jenis": "pindah", "tanggal": body.tanggal, "kelas": kelas["nama"] if kelas else "",
          "tahun": settings.get("tahun_aktif", ""), "alasan": body.alasan.strip(), "tujuan": body.tujuan.strip()}
    await db.siswa.update_one({"id": siswa_id}, {"$set": {"status": "keluar", "kelas_id": None, "mutasi_keluar": mk}})
    return SiswaOut(**{**s, "status": "keluar", "kelas_id": None, "mutasi_keluar": mk, "kelas_nama": None})


@router.post("/siswa/mutasi-masuk", response_model=SiswaOut)
async def mutasi_masuk(body: MutasiMasukIn, _: dict = Depends(require_admin)):
    """Siswa pindahan (tengah semester/tahun): langsung aktif di kelas tujuan + catatan mutasi masuk."""
    kelas = await db.kelas.find_one({"id": body.kelas_id})
    if not kelas:
        raise HTTPException(status_code=400, detail="Kelas tujuan tidak ditemukan")
    if not body.nama.strip() or not body.sekolah_asal.strip() or not body.tanggal:
        raise HTTPException(status_code=400, detail="Nama, sekolah asal, dan tanggal masuk wajib diisi")
    if body.nisn and await db.siswa.find_one({"nisn": body.nisn}):
        raise HTTPException(status_code=400, detail="NISN sudah terdaftar")
    settings = await db.settings.find_one({"_id": "settings"}) or {}
    mm = {"tanggal": body.tanggal, "kelas": kelas["nama"], "tahun": settings.get("tahun_aktif", ""),
          "semester": settings.get("semester_aktif", ""), "sekolah_asal": body.sekolah_asal.strip(),
          "nomor_induk_asal": body.nomor_induk_asal.strip(), "alasan": body.alasan.strip()}
    doc = {"id": uid(), "nama": body.nama.strip(), "nisn": body.nisn, "nism": body.nism, "nis": body.nis, "jk": body.jk,
           "kelas_id": body.kelas_id, "status": "aktif", "tahun_lulus": None,
           "sekolah_asal": mm["sekolah_asal"], "diterima_kelas": kelas["nama"], "diterima_tanggal": body.tanggal,
           "mutasi_masuk": mm}
    await db.siswa.insert_one(doc)
    return SiswaOut(**{**doc, "kelas_nama": kelas["nama"]})
