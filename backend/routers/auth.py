"""Auth: login (httpOnly session cookie), me, logout."""

from fastapi import APIRouter, Depends, HTTPException, Request, Response

from lib.auth import COOKIE_NAME, SESSION_DAYS, create_session, delete_session, get_current_user
from lib.db import db
from models.models import KelasWali, LoginRequest, Me

router = APIRouter()


async def _me_for(user: dict) -> Me:
    kw = await db.kelas.find_one({"wali_kelas_id": user["id"]})
    return Me(
        id=user["id"],
        nama=user["nama"],
        username=user["username"],
        role=user.get("role", "guru"),
        kelas_wali=KelasWali(id=kw["id"], nama=kw["nama"]) if kw else None,
        is_super=bool(user.get("is_super")),
    )


@router.post("/auth/login", response_model=Me)
async def login(body: LoginRequest, response: Response):
    user = await db.users.find_one({"username": body.username, "password": body.password})
    if not user:
        raise HTTPException(status_code=401, detail="Username atau password salah")
    token = await create_session(user["id"])
    response.set_cookie(
        COOKIE_NAME,
        token,
        httponly=True,
        samesite="lax",
        max_age=SESSION_DAYS * 86400,
        path="/",
    )
    return await _me_for(user)


@router.get("/auth/me", response_model=Me)
async def me(user: dict = Depends(get_current_user)):
    return await _me_for(user)


@router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        await delete_session(token)
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}