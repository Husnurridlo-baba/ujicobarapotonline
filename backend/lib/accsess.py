"""Shared access checks + nilai calculations."""

from fastapi import HTTPException

from lib.db import db

DEFAULT_BOBOT = {"tengah": {"harian": 40, "tengah": 60}, "akhir": {"harian": 30, "tengah": 30, "akhir": 40}}


async def check_kelas_wali_or_admin(kelas_id: str | None, user: dict) -> dict:
    kelas = await db.kelas.find_one({"id": kelas_id}) if kelas_id else None
    if not kelas:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan")
    if user.get("role") != "admin" and kelas.get("wali_kelas_id") != user["id"]:
        raise HTTPException(status_code=403, detail="Hanya wali kelas ini atau admin yang dapat mengakses")
    return kelas


async def check_siswa_wali_or_admin(siswa_id: str, user: dict) -> tuple[dict, dict | None]:
    siswa = await db.siswa.find_one({"id": siswa_id})
    if not siswa:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    kelas = await db.kelas.find_one({"id": siswa.get("kelas_id")}) if siswa.get("kelas_id") else None
    if user.get("role") != "admin" and (not kelas or kelas.get("wali_kelas_id") != user["id"]):
        raise HTTPException(status_code=403, detail="Hanya wali kelas atau admin yang dapat mengakses")
    return siswa, kelas


def _r(x: float | None) -> float | None:
    return None if x is None else round(x, 2)


def hitung(nilai: dict | None, bobot: dict | None) -> tuple[float | None, float | None]:
    """(rapot_tengah, rapot_akhir) dari nilai harian/NTS/NAS dan bobot persen."""
    if not nilai:
        return None, None
    b = bobot or DEFAULT_BOBOT
    h, t, a = nilai.get("nilai_harian"), nilai.get("nilai_tengah"), nilai.get("nilai_akhir")
    bt, ba = b.get("tengah", DEFAULT_BOBOT["tengah"]), b.get("akhir", DEFAULT_BOBOT["akhir"])
    rt = (h * bt["harian"] + t * bt["tengah"]) / 100 if h is not None and t is not None else None
    ra = (
        (h * ba["harian"] + t * ba["tengah"] + a * ba["akhir"]) / 100
        if h is not None and t is not None and a is not None
        else None
    )
    return _r(rt), _r(ra)


def predikat(n: float | None) -> str:
    if n is None:
        return ""
    if n >= 90:
        return "A"
    if n >= 80:
        return "B"
    if n >= 70:
        return "C"
    return "D"


async def status_of(penugasan_id: str, tahun: str, semester: str) -> dict:
    doc = await db.nilai_status.find_one({"penugasan_id": penugasan_id, "tahun": tahun, "semester": semester})
    return doc or {"status": "draft", "catatan_admin": ""}
