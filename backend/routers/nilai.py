"""Nilai harian / NTS / NAS + bobot guru + alur kirim → reviu admin → kunci."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.access import hitung, status_of
from lib.auth import get_current_user, require_admin
from lib.db import db
from models.models import (
    BobotOut,
    BobotSave,
    BobotSetakhir,
    BobotSetengah,
    KirimRequest,
    NilaiOut,
    NilaiSave,
    RekapRow,
    ReviuRequest,
    StatusNilaiOut,
    uid,
)

router = APIRouter()


async def _check_access(penugasan_id: str, user: dict) -> dict:
    p = await db.penugasan.find_one({"id": penugasan_id})
    if not p:
        raise HTTPException(status_code=404, detail="Penugasan tidak ditemukan")
    if user.get("role") != "admin" and p["guru_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Bukan penugasan Anda")
    return p


def _key(penugasan_id: str, tahun: str, semester: str) -> dict:
    return {"penugasan_id": penugasan_id, "tahun": tahun, "semester": semester}


# ---------- Bobot ----------
@router.get("/bobot", response_model=BobotOut)
async def get_bobot(penugasan_id: str, tahun: str, semester: str, user: dict = Depends(get_current_user)):
    await _check_access(penugasan_id, user)
    doc = await db.bobot.find_one(_key(penugasan_id, tahun, semester))
    if not doc:
        return BobotOut(penugasan_id=penugasan_id, tahun=tahun, semester=semester, tersimpan=False)
    return BobotOut(
        penugasan_id=penugasan_id,
        tahun=tahun,
        semester=semester,
        tengah=BobotSetengah(**doc["tengah"]),
        akhir=BobotSetakhir(**doc["akhir"]),
        tersimpan=True,
    )


@router.put("/bobot", response_model=BobotOut)
async def save_bobot(body: BobotSave, user: dict = Depends(get_current_user)):
    await _check_access(body.penugasan_id, user)
    st = await status_of(body.penugasan_id, body.tahun, body.semester)
    if st["status"] in ("dikirim", "terkunci"):
        raise HTTPException(status_code=400, detail="Nilai sudah dikirim/terkunci, bobot tidak bisa diubah")
    t, a = body.tengah, body.akhir
    if min(t.harian, t.tengah, a.harian, a.tengah, a.akhir) < 0:
        raise HTTPException(status_code=400, detail="Bobot tidak boleh negatif")
    if t.harian + t.tengah != 100:
        raise HTTPException(status_code=400, detail="Total bobot rapor tengah semester harus 100%")
    if a.harian + a.tengah + a.akhir != 100:
        raise HTTPException(status_code=400, detail="Total bobot rapor akhir semester harus 100%")
    await db.bobot.update_one(
        _key(body.penugasan_id, body.tahun, body.semester),
        {"$set": {"tengah": t.model_dump(), "akhir": a.model_dump()}, "$setOnInsert": {"id": uid()}},
        upsert=True,
    )
    return BobotOut(**body.model_dump(), tersimpan=True)


# ---------- Nilai ----------
@router.get("/nilai", response_model=list[NilaiOut])
async def list_nilai(penugasan_id: str, tahun: str, semester: str, user: dict = Depends(get_current_user)):
    await _check_access(penugasan_id, user)
    bobot = await db.bobot.find_one(_key(penugasan_id, tahun, semester))
    docs = await db.nilai.find(_key(penugasan_id, tahun, semester)).to_list(1000)
    out = []
    for d in docs:
        rt, ra = hitung(d, bobot)
        out.append(NilaiOut(**{**d, "id": d.get("id") or str(d["_id"]), "rapot_tengah": rt, "rapot_akhir": ra}))
    return out


@router.post("/nilai/save")
async def save_nilai(body: NilaiSave, user: dict = Depends(get_current_user)):
    await _check_access(body.penugasan_id, user)
    if not await db.bobot.find_one(_key(body.penugasan_id, body.tahun, body.semester)):
        raise HTTPException(status_code=400, detail="Atur bobot nilai terlebih dahulu sebelum mengisi nilai")
    st = await status_of(body.penugasan_id, body.tahun, body.semester)
    if st["status"] in ("dikirim", "terkunci"):
        raise HTTPException(status_code=400, detail="Nilai sudah dikirim/terkunci dan tidak bisa diubah")
    now = datetime.now(timezone.utc)
    for e in body.entries:
        await db.nilai.update_one(
            {**_key(body.penugasan_id, body.tahun, body.semester), "siswa_id": e.siswa_id},
            {
                "$set": {
                    "nilai_harian": e.nilai_harian,
                    "nilai_tengah": e.nilai_tengah,
                    "nilai_akhir": e.nilai_akhir,
                    "updated_at": now,
                    "updated_by": user["nama"],
                },
                "$setOnInsert": {"id": uid()},
            },
            upsert=True,
        )
    return {"saved": len(body.entries)}


# ---------- Status kirim / reviu ----------
@router.get("/nilai/status", response_model=StatusNilaiOut)
async def get_status(penugasan_id: str, tahun: str, semester: str, user: dict = Depends(get_current_user)):
    await _check_access(penugasan_id, user)
    st = await status_of(penugasan_id, tahun, semester)
    return StatusNilaiOut(
        penugasan_id=penugasan_id, tahun=tahun, semester=semester,
        status=st["status"], catatan_admin=st.get("catatan_admin", ""),
    )


async def _set_status(k: dict, status: str, catatan: str | None = None) -> None:
    fields: dict = {"status": status, "updated_at": datetime.now(timezone.utc)}
    if catatan is not None:
        fields["catatan_admin"] = catatan
    await db.nilai_status.update_one(k, {"$set": fields, "$setOnInsert": {"id": uid()}}, upsert=True)


@router.post("/nilai/kirim", response_model=StatusNilaiOut)
async def kirim_nilai(body: KirimRequest, user: dict = Depends(get_current_user)):
    await _check_access(body.penugasan_id, user)
    k = _key(body.penugasan_id, body.tahun, body.semester)
    st = await status_of(*k.values())
    if st["status"] in ("dikirim", "terkunci"):
        raise HTTPException(status_code=400, detail="Nilai sudah dikirim atau terkunci")
    if not await db.nilai.count_documents(k):
        raise HTTPException(status_code=400, detail="Belum ada nilai yang disimpan")
    await _set_status(k, "dikirim")
    return StatusNilaiOut(**k, status="dikirim", catatan_admin=st.get("catatan_admin", ""))


@router.post("/nilai/reviu", response_model=StatusNilaiOut)
async def reviu_nilai(body: ReviuRequest, _: dict = Depends(require_admin)):
    k = _key(body.penugasan_id, body.tahun, body.semester)
    if not await db.penugasan.find_one({"id": body.penugasan_id}):
        raise HTTPException(status_code=404, detail="Penugasan tidak ditemukan")
    if body.aksi == "setujui":
        await _set_status(k, "terkunci", "")
        return StatusNilaiOut(**k, status="terkunci")
    if body.aksi == "revisi":
        if not body.catatan.strip():
            raise HTTPException(status_code=400, detail="Tuliskan catatan revisi untuk guru")
        await _set_status(k, "revisi", body.catatan.strip())
        return StatusNilaiOut(**k, status="revisi", catatan_admin=body.catatan.strip())
    if body.aksi == "buka":
        await _set_status(k, "revisi", body.catatan.strip() or "Kunci dibuka admin")
        return StatusNilaiOut(**k, status="revisi", catatan_admin=body.catatan.strip() or "Kunci dibuka admin")
    raise HTTPException(status_code=400, detail="Aksi tidak dikenal")


@router.get("/nilai/rekap", response_model=list[RekapRow])
async def rekap(tahun: str, semester: str, _: dict = Depends(require_admin)):
    penugasan = await db.penugasan.find().to_list(2000)
    users = {u["id"]: u["nama"] for u in await db.users.find().to_list(1000)}
    mapels = {m["id"]: m["nama"] for m in await db.mapel.find().to_list(500)}
    kelass = {k["id"]: k["nama"] for k in await db.kelas.find().to_list(500)}
    statuses = {
        s["penugasan_id"]: s
        for s in await db.nilai_status.find({"tahun": tahun, "semester": semester}).to_list(5000)
    }
    siswa_per_kelas: dict[str, int] = {}
    for s in await db.siswa.find({"status": "aktif"}, {"kelas_id": 1}).to_list(5000):
        siswa_per_kelas[s.get("kelas_id") or ""] = siswa_per_kelas.get(s.get("kelas_id") or "", 0) + 1
    terisi_map: dict[str, int] = {}
    for n in await db.nilai.find(
        {"tahun": tahun, "semester": semester, "nilai_harian": {"$ne": None}, "nilai_tengah": {"$ne": None}, "nilai_akhir": {"$ne": None}},
        {"penugasan_id": 1},
    ).to_list(50000):
        terisi_map[n["penugasan_id"]] = terisi_map.get(n["penugasan_id"], 0) + 1
    rows = [
        RekapRow(
            penugasan_id=p["id"],
            guru_nama=users.get(p["guru_id"]),
            mapel_nama=mapels.get(p["mapel_id"]),
            kelas_nama=kelass.get(p["kelas_id"]),
            status=statuses.get(p["id"], {}).get("status", "draft"),
            catatan_admin=statuses.get(p["id"], {}).get("catatan_admin", ""),
            terisi=terisi_map.get(p["id"], 0),
            total=siswa_per_kelas.get(p["kelas_id"], 0),
        )
        for p in penugasan
    ]
    rows.sort(key=lambda r: (r.kelas_nama or "", r.mapel_nama or ""))
    return rows
