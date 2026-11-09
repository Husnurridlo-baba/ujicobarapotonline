"""Kelas + penunjukan wali kelas."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user, require_admin
from lib.db import db
from models.models import KelasCreate, KelasOut, uid

router = APIRouter()


@router.get("/kelas", response_model=list[KelasOut])
async def list_kelas(_: dict = Depends(get_current_user)):
    kelas = await db.kelas.find().sort([("tingkat", 1), ("nama", 1)]).to_list(500)
    users = {u["id"]: u["nama"] for u in await db.users.find().to_list(1000)}
    return [
        KelasOut(
            id=k["id"],
            nama=k["nama"],
            tingkat=k["tingkat"],
            wali_kelas_id=k.get("wali_kelas_id"),
            wali_nama=users.get(k.get("wali_kelas_id") or ""),
        )
        for k in kelas
    ]


@router.post("/kelas", response_model=KelasOut)
async def create_kelas(body: KelasCreate, _: dict = Depends(require_admin)):
    if await db.kelas.find_one({"nama": body.nama}):
        raise HTTPException(status_code=400, detail="Nama kelas sudah dipakai")
    doc = {"id": uid(), "nama": body.nama, "tingkat": body.tingkat, "wali_kelas_id": body.wali_kelas_id}
    await db.kelas.insert_one(doc)
    return KelasOut(**doc)


@router.put("/kelas/{kelas_id}", response_model=KelasOut)
async def update_kelas(kelas_id: str, body: KelasCreate, _: dict = Depends(require_admin)):
    doc = await db.kelas.find_one({"id": kelas_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan")
    if await db.kelas.find_one({"nama": body.nama, "id": {"$ne": kelas_id}}):
        raise HTTPException(status_code=400, detail="Nama kelas sudah dipakai")
    set_fields = {"nama": body.nama, "tingkat": body.tingkat, "wali_kelas_id": body.wali_kelas_id}
    await db.kelas.update_one({"id": kelas_id}, {"$set": set_fields})
    return KelasOut(id=kelas_id, **set_fields)


@router.delete("/kelas/{kelas_id}")
async def delete_kelas(kelas_id: str, _: dict = Depends(require_admin)):
    aktif = await db.siswa.count_documents({"kelas_id": kelas_id, "status": "aktif"})
    if aktif:
        raise HTTPException(status_code=400, detail=f"Masih ada {aktif} siswa aktif di kelas ini")
    penugasan = await db.penugasan.find({"kelas_id": kelas_id}).to_list(500)
    if penugasan:
        p_ids = [p["id"] for p in penugasan]
        await db.nilai.delete_many({"penugasan_id": {"$in": p_ids}})
        await db.penugasan.delete_many({"id": {"$in": p_ids}})
    await db.kelas.delete_one({"id": kelas_id})
    return {"ok": True}