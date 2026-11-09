"""Pengaturan madrasah: tahun pelajaran, semester aktif, kop surat, kepala madrasah."""

from fastapi import APIRouter, Depends, HTTPException

from lib.auth import get_current_user, require_admin
from lib.db import db
from models.models import SettingsOut, SettingsUpdate, TahunCreate, TahunOut, uid

router = APIRouter()

DEFAULT_SETTINGS: dict = {
    "tahun_aktif": "",
    "semester_aktif": "ganjil",
    "nama_sekolah": "MA Nurul Qur'an Kebonagung",
    "kepala_nama": "",
    "kepala_nip": "",
    "kop_image": None,
    "logo_image": None,
    "alamat_sekolah": "Kebonagung",
}


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "settings"})
    if not doc:
        return dict(DEFAULT_SETTINGS)
    return {k: doc.get(k, v) for k, v in DEFAULT_SETTINGS.items()}


@router.get("/settings", response_model=SettingsOut)
async def get_settings(_: dict = Depends(get_current_user)):
    return SettingsOut(**await get_settings_doc())


@router.put("/settings", response_model=SettingsOut)
async def update_settings(body: SettingsUpdate, _: dict = Depends(require_admin)):
    if body.kop_image and len(body.kop_image) > 4_000_000:
        raise HTTPException(status_code=400, detail="File kop terlalu besar (maksimal 3MB)")
    if body.logo_image and len(body.logo_image) > 2_800_000:
        raise HTTPException(status_code=400, detail="File logo terlalu besar (maksimal 2MB)")
    data = body.model_dump(exclude_none=True)
    if data:
        await db.settings.update_one({"_id": "settings"}, {"$set": data}, upsert=True)
    return SettingsOut(**await get_settings_doc())


@router.get("/tahun", response_model=list[TahunOut])
async def list_tahun(_: dict = Depends(get_current_user)):
    docs = await db.tahun_pelajaran.find().sort("nama", -1).to_list(100)
    s = await get_settings_doc()
    return [TahunOut(id=d["id"], nama=d["nama"], aktif=d["nama"] == s["tahun_aktif"]) for d in docs]


@router.post("/tahun", response_model=TahunOut)
async def create_tahun(body: TahunCreate, _: dict = Depends(require_admin)):
    nama = body.nama.strip()
    if not nama:
        raise HTTPException(status_code=400, detail="Nama tahun pelajaran wajib diisi")
    if await db.tahun_pelajaran.find_one({"nama": nama}):
        raise HTTPException(status_code=400, detail="Tahun pelajaran sudah ada")
    doc = {"id": uid(), "nama": nama}
    await db.tahun_pelajaran.insert_one(doc)
    s = await get_settings_doc()
    return TahunOut(id=doc["id"], nama=nama, aktif=nama == s["tahun_aktif"])


@router.delete("/tahun/{tahun_id}")
async def delete_tahun(tahun_id: str, _: dict = Depends(require_admin)):
    doc = await db.tahun_pelajaran.find_one({"id": tahun_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tahun pelajaran tidak ditemukan")
    s = await get_settings_doc()
    if s["tahun_aktif"] == doc["nama"]:
        raise HTTPException(status_code=400, detail="Tahun pelajaran aktif tidak bisa dihapus")
    await db.tahun_pelajaran.delete_one({"id": tahun_id})
    return {"ok": True}


@router.post("/tahun/{tahun_id}/aktifkan", response_model=SettingsOut)
async def aktifkan_tahun(tahun_id: str, _: dict = Depends(require_admin)):
    doc = await db.tahun_pelajaran.find_one({"id": tahun_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Tahun pelajaran tidak ditemukan")
    await db.settings.update_one({"_id": "settings"}, {"$set": {"tahun_aktif": doc["nama"]}}, upsert=True)
    return SettingsOut(**await get_settings_doc())