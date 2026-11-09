"""Mata pelajaran (mapel) — admin."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user, require_admin
from lib.db import db
from models.models import MapelCreate, MapelOut, uid

router = APIRouter()


@router.get("/mapel", response_model=list[MapelOut])
async def list_mapel(_: dict = Depends(get_current_user)):
    docs = await db.mapel.find().sort([("urutan", 1), ("nama", 1)]).to_list(500)
    return [MapelOut(**d) for d in docs]


@router.post("/mapel", response_model=MapelOut)
async def create_mapel(body: MapelCreate, _: dict = Depends(require_admin)):
    doc = {"id": uid(), "kode": body.kode, "nama": body.nama, "kkm": body.kkm, "urutan": body.urutan}
    await db.mapel.insert_one(doc)
    return MapelOut(**doc)


@router.put("/mapel/{mapel_id}", response_model=MapelOut)
async def update_mapel(mapel_id: str, body: MapelCreate, _: dict = Depends(require_admin)):
    doc = await db.mapel.find_one({"id": mapel_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Mapel tidak ditemukan")
    set_fields = {"kode": body.kode, "nama": body.nama, "kkm": body.kkm, "urutan": body.urutan}
    await db.mapel.update_one({"id": mapel_id}, {"$set": set_fields})
    return MapelOut(id=mapel_id, **set_fields)


@router.delete("/mapel/{mapel_id}")
async def delete_mapel(mapel_id: str, _: dict = Depends(require_admin)):
    penugasan = await db.penugasan.find({"mapel_id": mapel_id}).to_list(500)
    if penugasan:
        p_ids = [p["id"] for p in penugasan]
        await db.nilai.delete_many({"penugasan_id": {"$in": p_ids}})
        await db.penugasan.delete_many({"id": {"$in": p_ids}})
    await db.mapel.delete_one({"id": mapel_id})
    return {"ok": True}