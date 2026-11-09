"""Penugasan mengajar (guru + mapel + kelas). Guru hanya melihat penugasannya sendiri."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user, require_admin
from lib.db import db
from models.models import PenugasanCreate, PenugasanOut, uid

router = APIRouter()


@router.get("/penugasan", response_model=list[PenugasanOut])
async def list_penugasan(user: dict = Depends(get_current_user)):
    q: dict = {} if user.get("role") == "admin" else {"guru_id": user["id"]}
    docs = await db.penugasan.find(q).to_list(2000)
    users = {u["id"]: u["nama"] for u in await db.users.find().to_list(1000)}
    mapels = {m["id"]: m for m in await db.mapel.find().to_list(500)}
    kelass = {k["id"]: k for k in await db.kelas.find().to_list(500)}
    out = [
        PenugasanOut(
            id=d["id"],
            guru_id=d["guru_id"],
            mapel_id=d["mapel_id"],
            kelas_id=d["kelas_id"],
            guru_nama=users.get(d["guru_id"]),
            mapel_nama=(mapels.get(d["mapel_id"]) or {}).get("nama"),
            kelas_nama=(kelass.get(d["kelas_id"]) or {}).get("nama"),
        )
        for d in docs
    ]
    out.sort(key=lambda x: ((x.kelas_nama or ""), (x.mapel_nama or "")))
    return out


@router.post("/penugasan", response_model=PenugasanOut)
async def create_penugasan(body: PenugasanCreate, _: dict = Depends(require_admin)):
    if await db.penugasan.find_one({"mapel_id": body.mapel_id, "kelas_id": body.kelas_id}):
        raise HTTPException(status_code=400, detail="Penugasan untuk mapel & kelas ini sudah ada")
    doc = {"id": uid(), "guru_id": body.guru_id, "mapel_id": body.mapel_id, "kelas_id": body.kelas_id}
    await db.penugasan.insert_one(doc)
    return PenugasanOut(**doc)


@router.put("/penugasan/{penugasan_id}", response_model=PenugasanOut)
async def update_penugasan(penugasan_id: str, body: PenugasanCreate, _: dict = Depends(require_admin)):
    doc = await db.penugasan.find_one({"id": penugasan_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Penugasan tidak ditemukan")
    if await db.penugasan.find_one(
        {"mapel_id": body.mapel_id, "kelas_id": body.kelas_id, "id": {"$ne": penugasan_id}}
    ):
        raise HTTPException(status_code=400, detail="Penugasan untuk mapel & kelas ini sudah ada")
    set_fields = {"guru_id": body.guru_id, "mapel_id": body.mapel_id, "kelas_id": body.kelas_id}
    await db.penugasan.update_one({"id": penugasan_id}, {"$set": set_fields})
    return PenugasanOut(id=penugasan_id, **set_fields)


@router.delete("/penugasan/{penugasan_id}")
async def delete_penugasan(penugasan_id: str, _: dict = Depends(require_admin)):
    await db.nilai.delete_many({"penugasan_id": penugasan_id})
    await db.penugasan.delete_one({"id": penugasan_id})
    return {"ok": True}