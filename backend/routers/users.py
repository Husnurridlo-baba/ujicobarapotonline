"""Manajemen guru & admin. Password terlihat & bisa direset admin.
Akun admin hanya boleh dibuat/diubah/dihapus oleh admin utama (is_super, akun pertama)."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import require_admin
from lib.db import db
from models.models import UserCreate, UserOut, UserUpdate, uid

router = APIRouter()


async def _to_out(u: dict) -> UserOut:
    is_wali = await db.kelas.find_one({"wali_kelas_id": u["id"]}) is not None
    return UserOut(
        id=u["id"],
        nama=u["nama"],
        username=u["username"],
        nip=u.get("nip", ""),
        password=u.get("password", ""),
        role=u.get("role", "guru"),
        is_wali=is_wali,
        is_super=bool(u.get("is_super")),
    )


def _need_super(actor: dict) -> None:
    if not actor.get("is_super"):
        raise HTTPException(status_code=403, detail="Hanya admin utama yang dapat mengelola akun admin")


@router.get("/users", response_model=list[UserOut])
async def list_users(role: str = "guru", _: dict = Depends(require_admin)):
    users = await db.users.find({"role": role}).sort("nama", 1).to_list(1000)
    return [await _to_out(u) for u in users]


@router.post("/users", response_model=UserOut)
async def create_user(body: UserCreate, actor: dict = Depends(require_admin)):
    role = "admin" if body.role == "admin" else "guru"
    if role == "admin":
        _need_super(actor)
    if await db.users.find_one({"username": body.username}):
        raise HTTPException(status_code=400, detail="Username sudah dipakai")
    doc = {
        "id": uid(),
        "nama": body.nama,
        "username": body.username,
        "password": body.password,
        "nip": body.nip,
        "role": role,
        "is_super": False,
    }
    await db.users.insert_one(doc)
    return await _to_out(doc)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_user(user_id: str, body: UserUpdate, actor: dict = Depends(require_admin)):
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    if doc.get("role") == "admin" and doc["id"] != actor["id"]:
        _need_super(actor)
    if await db.users.find_one({"username": body.username, "id": {"$ne": user_id}}):
        raise HTTPException(status_code=400, detail="Username sudah dipakai")
    set_fields: dict = {"nama": body.nama, "username": body.username, "nip": body.nip}
    if body.password:
        set_fields["password"] = body.password
        set_fields["password_updated_at"] = datetime.now(timezone.utc)
    await db.users.update_one({"id": user_id}, {"$set": set_fields})
    return await _to_out({**doc, **set_fields})


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, actor: dict = Depends(require_admin)):
    doc = await db.users.find_one({"id": user_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Akun tidak ditemukan")
    if doc.get("is_super"):
        raise HTTPException(status_code=400, detail="Admin utama tidak dapat dihapus")
    if doc.get("role") == "admin":
        _need_super(actor)
    penugasan = await db.penugasan.find({"guru_id": user_id}).to_list(1000)
    p_ids = [p["id"] for p in penugasan]
    if p_ids:
        await db.nilai.delete_many({"penugasan_id": {"$in": p_ids}})
        await db.penugasan.delete_many({"id": {"$in": p_ids}})
    await db.kelas.update_many({"wali_kelas_id": user_id}, {"$set": {"wali_kelas_id": None}})
    await db.sessions.delete_many({"user_id": user_id})
    await db.users.delete_one({"id": user_id})
    return {"ok": True}
