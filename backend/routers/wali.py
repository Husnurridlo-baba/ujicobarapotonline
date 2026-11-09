"""Data wali kelas per siswa per semester: absensi S/I/A, ekskul, keputusan, catatan."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user
from lib.db import db
from models.models import WaliOut, WaliSave, uid, uid

router = APIRouter()


async def _check_access(kelas_id: str, user: dict) -> dict:
    kelas = await db.kelas.find_one({"id": kelas_id})
    if not kelas:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan")
    if user.get("role") != "admin" and kelas.get("wali_kelas_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Anda bukan wali kelas ini")
    return kelas


@router.get("/wali/rapot", response_model=list[WaliOut])
async def list_wali_rapot(kelas_id: str, tahun: str, semester: str, user: dict = Depends(get_current_user)):
    await _check_access(kelas_id, user)
    siswa = await db.siswa.find({"kelas_id": kelas_id}).to_list(3000)
    ids = [s["id"] for s in siswa]
    if not ids:
        return []
    docs = await db.wali_rapot.find({"siswa_id": {"$in": ids}, "tahun": tahun, "semester": semester}).to_list(3000)
    return [WaliOut(**d) for d in docs]


@router.post("/wali/rapot/save")
async def save_wali_rapot(body: WaliSave, user: dict = Depends(get_current_user)):
    await _check_access(body.kelas_id, user)
    for e in body.entries:
        await db.wali_rapot.update_one(
            {"siswa_id": e.siswa_id, "tahun": body.tahun, "semester": body.semester},
            {
                "$set": {
                    "sakit": e.sakit,
                    "izin": e.izin,
                    "alpa": e.alpa,
                    "ekskul_nama": e.ekskul_nama,
                    "ekskul_predikat": e.ekskul_predikat,
                    "ekskul_keterangan": e.ekskul_keterangan,
                    "keputusan": e.keputusan,
                    "catatan": e.catatan,
                },
                "$setOnInsert": {"id": uid()},
            },
            upsert=True,
        )
    return {"saved": len(body.entries)}