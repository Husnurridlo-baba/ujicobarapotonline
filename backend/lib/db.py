"""Shared Mongo handle — import `client`/`db` from here (server.py, routers, seed.py)."""

import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel

load_dotenv(Path(__file__).parent.parent / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

logger = logging.getLogger(__name__)

# One entry per collection: every field a route filters, sorts, or dedupes on. Applied by ensure_indexes() at startup.
INDEXES: dict[str, list[IndexModel]] = {
    "status_checks": [IndexModel([("timestamp", DESCENDING)], name="timestamp_desc")],
    "users": [IndexModel([("username", ASCENDING)], name="username", unique=True)],
    "kelas": [
        IndexModel([("nama", ASCENDING)], name="nama", unique=True),
        IndexModel([("wali_kelas_id", ASCENDING)], name="wali_kelas_id"),
    ],
    "siswa": [
        IndexModel([("kelas_id", ASCENDING), ("nama", ASCENDING)], name="kelas_nama"),
        IndexModel([("status", ASCENDING)], name="status"),
    ],
    "mapel": [IndexModel([("urutan", ASCENDING)], name="urutan")],
    "penugasan": [
        IndexModel([("mapel_id", ASCENDING), ("kelas_id", ASCENDING)], name="mapel_kelas", unique=True),
        IndexModel([("guru_id", ASCENDING)], name="guru_id"),
    ],
    "nilai": [
        IndexModel(
            [("penugasan_id", ASCENDING), ("siswa_id", ASCENDING), ("tahun", ASCENDING), ("semester", ASCENDING)],
            name="penugasan_siswa_tp_semester",
            unique=True,
        )
    ],
    "wali_rapot": [
        IndexModel([("siswa_id", ASCENDING), ("tahun", ASCENDING), ("semester", ASCENDING)], name="siswa_tp_semester", unique=True)
    ],
    "bobot": [
        IndexModel([("penugasan_id", ASCENDING), ("tahun", ASCENDING), ("semester", ASCENDING)], name="penugasan_tp_semester", unique=True)
    ],
    "nilai_status": [
        IndexModel([("penugasan_id", ASCENDING), ("tahun", ASCENDING), ("semester", ASCENDING)], name="penugasan_tp_semester", unique=True)
    ],
    "sessions": [
        IndexModel([("token", ASCENDING)], name="token", unique=True),
        IndexModel([("expires_at", ASCENDING)], name="expires_at", expireAfterSeconds=0),
    ],
    "tahun_pelajaran": [IndexModel([("nama", ASCENDING)], name="nama", unique=True)],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:  # one at a time so a bad spec skips only itself
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:  # never block boot on an index; the log line names what to fix
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)
