"""Session helpers — httpOnly cookie sessions stored in Mongo `sessions`."""

import uuid
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException, Request

from lib.db import db

COOKIE_NAME = "rapot_session"
SESSION_DAYS = 30


async def create_session(user_id: str) -> str:
    token = str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
    await db.sessions.insert_one({"token": token, "user_id": user_id, "expires_at": expires})
    return token


async def delete_session(token: str) -> None:
    await db.sessions.delete_one({"token": token})


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Tidak terautentikasi")
    session = await db.sessions.find_one({"token": token})
    if not session:
        raise HTTPException(status_code=401, detail="Sesi berakhir, silakan login kembali")
    user = await db.users.find_one({"id": session["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="Sesi berakhir, silakan login kembali")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Hanya Waka Kurikulum yang dapat mengakses")
    return user