"""Data cetak: rapor (tengah/akhir), leger kelas, transkrip 6 semester. Hanya nilai TERKUNCI yang dipakai."""

from fastapi import APIRouter, Depends

from lib.access import check_kelas_wali_or_admin, check_siswa_wali_or_admin, hitung, predikat
from lib.auth import get_current_user
from lib.dates import today_iso
from lib.db import db
from models.models import (
    CetakBaris,
    CetakRapot,
    LegerOut,
    LegerRow,
    LegerSel,
    TranskripCell,
    TranskripOut,
    TranskripSemester,
)
from routers.settings import get_settings_doc

router = APIRouter()

BIO_EXTRA = ['agama', 'sekolah_asal', 'diterima_kelas', 'diterima_tanggal', 'pekerjaan_ayah', 'pekerjaan_ibu', 'alamat_ortu', 'nama_wali', 'pekerjaan_wali', 'alamat_wali']


def _mutasi_keluar(siswa: dict) -> dict | None:
    """Alumni lama (sebelum fitur mutasi) tetap tercatat 'lulus' di lampiran mutasi."""
    if siswa.get("mutasi_keluar"):
        return siswa["mutasi_keluar"]
    if siswa.get("status") == "lulus":
        return {"jenis": "lulus", "tanggal": "", "kelas": "", "tahun": siswa.get("tahun_lulus") or "", "alasan": "Lulus", "tujuan": ""}
    return None


def _sort_key(mapel_by_id: dict):
    return lambda p: (
        (mapel_by_id.get(p["mapel_id"]) or {}).get("urutan", 999),
        (mapel_by_id.get(p["mapel_id"]) or {}).get("nama", ""),
    )


async def _locked_ids(p_ids: list[str], tahun: str, semester: str) -> set[str]:
    docs = await db.nilai_status.find(
        {"penugasan_id": {"$in": p_ids}, "tahun": tahun, "semester": semester, "status": "terkunci"}
    ).to_list(1000)
    return {d["penugasan_id"] for d in docs}


async def _bobot_map(p_ids: list[str], tahun: str, semester: str) -> dict:
    docs = await db.bobot.find({"penugasan_id": {"$in": p_ids}, "tahun": tahun, "semester": semester}).to_list(1000)
    return {d["penugasan_id"]: d for d in docs}


@router.get("/cetak/{siswa_id}", response_model=CetakRapot)
async def cetak_rapot(
    siswa_id: str,
    tahun: str | None = None,
    semester: str | None = None,
    jenis: str = "akhir",
    user: dict = Depends(get_current_user),
):
    siswa, kelas = await check_siswa_wali_or_admin(siswa_id, user)
    settings = await get_settings_doc()
    tahun = tahun or settings["tahun_aktif"]
    semester = semester or settings["semester_aktif"] or "ganjil"
    jenis = "tengah" if jenis == "tengah" else "akhir"

    penugasan_list = await db.penugasan.find({"kelas_id": siswa.get("kelas_id")}).to_list(300) if kelas else []
    mapel_by_id = {m["id"]: m for m in await db.mapel.find().to_list(500)}
    p_ids = [p["id"] for p in penugasan_list]
    locked = await _locked_ids(p_ids, tahun, semester)
    bobot = await _bobot_map(p_ids, tahun, semester)
    nilai_by_p = {
        n["penugasan_id"]: n
        for n in await db.nilai.find(
            {"penugasan_id": {"$in": p_ids}, "siswa_id": siswa_id, "tahun": tahun, "semester": semester}
        ).to_list(300)
    }

    rows: list[CetakBaris] = []
    for p in sorted(penugasan_list, key=_sort_key(mapel_by_id)):
        m = mapel_by_id.get(p["mapel_id"])
        if not m:
            continue
        ok = p["id"] in locked
        nv = nilai_by_p.get(p["id"]) if ok else None
        rt, ra = hitung(nv, bobot.get(p["id"]))
        nr = rt if jenis == "tengah" else ra
        rows.append(
            CetakBaris(
                mapel_nama=m["nama"],
                kkm=m.get("kkm", 75),
                nilai_harian=nv.get("nilai_harian") if nv else None,
                nilai_tengah=nv.get("nilai_tengah") if nv else None,
                nilai_akhir=nv.get("nilai_akhir") if nv else None,
                nilai_rapot=nr,
                predikat=predikat(nr),
                terkunci=ok,
            )
        )

    wali = await db.users.find_one({"id": kelas["wali_kelas_id"]}) if kelas and kelas.get("wali_kelas_id") else None
    w = await db.wali_rapot.find_one({"siswa_id": siswa_id, "tahun": tahun, "semester": semester}) or {}

    return CetakRapot(
        tanggal_cetak=today_iso("Asia/Jakarta"),
        jenis=jenis,
        nama_sekolah=settings.get("nama_sekolah") or "MA Nurul Qur'an Kebonagung",
        kop_image=settings.get("kop_image"),
        logo_image=settings.get("logo_image"),
        kepala_nama=settings.get("kepala_nama", ""),
        kepala_nip=settings.get("kepala_nip", ""),
        wali_nama=wali["nama"] if wali else "",
        wali_nip=(wali.get("nip", "") if wali else "") or "",
        kelas_nama=kelas["nama"] if kelas else ((siswa.get("mutasi_keluar") or {}).get("kelas", "")),
        tahun=tahun or "",
        semester=semester,
        siswa_nama=siswa["nama"],
        siswa_nis=siswa.get("nis", ""),
        siswa_nism=siswa.get("nism", ""),
        siswa_nisn=siswa.get("nisn", ""),
        tempat_lahir=siswa.get("tempat_lahir", ""),
        tanggal_lahir=siswa.get("tanggal_lahir", ""),
        alamat=siswa.get("alamat", ""),
        ayah=siswa.get("ayah", ""),
        ibu=siswa.get("ibu", ""),
        telepon=siswa.get("telepon", ""),
        siswa_jk=siswa.get("jk", "L") or "L",
        mutasi_keluar=_mutasi_keluar(siswa),
        mutasi_masuk=siswa.get("mutasi_masuk"),
        **{f: siswa.get(f, "") or "" for f in BIO_EXTRA},
        foto=siswa.get("foto"),
        baris=rows,
        sakit=w.get("sakit", 0) or 0,
        izin=w.get("izin", 0) or 0,
        alpa=w.get("alpa", 0) or 0,
        ekskul_nama=w.get("ekskul_nama", "") or "",
        ekskul_predikat=w.get("ekskul_predikat", "") or "",
        ekskul_keterangan=w.get("ekskul_keterangan", "") or "",
        keputusan=(w.get("keputusan", "") or "") if jenis == "akhir" else "",
        catatan=w.get("catatan", "") or "",
    )


@router.get("/leger", response_model=LegerOut)
async def leger(kelas_id: str, tahun: str, semester: str, user: dict = Depends(get_current_user)):
    kelas = await check_kelas_wali_or_admin(kelas_id, user)
    settings = await get_settings_doc()
    mapel_by_id = {m["id"]: m for m in await db.mapel.find().to_list(500)}
    penugasan = sorted(await db.penugasan.find({"kelas_id": kelas_id}).to_list(300), key=_sort_key(mapel_by_id))
    penugasan = [p for p in penugasan if p["mapel_id"] in mapel_by_id]
    p_ids = [p["id"] for p in penugasan]
    locked = await _locked_ids(p_ids, tahun, semester)
    bobot = await _bobot_map(p_ids, tahun, semester)
    nilai = await db.nilai.find({"penugasan_id": {"$in": p_ids}, "tahun": tahun, "semester": semester}).to_list(20000)
    by = {(n["penugasan_id"], n["siswa_id"]): n for n in nilai}
    siswa = await db.siswa.find({"kelas_id": kelas_id, "status": "aktif"}).sort("nama", 1).to_list(500)
    rows = []
    for s in siswa:
        sel: list[LegerSel | None] = []
        for p in penugasan:
            n = by.get((p["id"], s["id"]))
            if not n:
                sel.append(None)
                continue
            rt, ra = hitung(n, bobot.get(p["id"]))
            sel.append(
                LegerSel(
                    nilai_harian=n.get("nilai_harian"),
                    nilai_tengah=n.get("nilai_tengah"),
                    nilai_akhir=n.get("nilai_akhir"),
                    rapot_tengah=rt,
                    rapot_akhir=ra,
                    terkunci=p["id"] in locked,
                )
            )
        rows.append(LegerRow(siswa_id=s["id"], siswa_nama=s["nama"], nis=s.get("nis", ""), nisn=s.get("nisn", ""), sel=sel))
    wali = await db.users.find_one({"id": kelas.get("wali_kelas_id")}) if kelas.get("wali_kelas_id") else None
    return LegerOut(
        tanggal_cetak=today_iso("Asia/Jakarta"),
        nama_sekolah=settings["nama_sekolah"],
        kop_image=settings.get("kop_image"),
        kelas_nama=kelas["nama"],
        tahun=tahun,
        semester=semester,
        wali_nama=wali["nama"] if wali else "",
        mapel=[mapel_by_id[p["mapel_id"]]["nama"] for p in penugasan],
        baris=rows,
    )


@router.get("/cetak/{siswa_id}/transkrip", response_model=TranskripOut)
async def transkrip(siswa_id: str, user: dict = Depends(get_current_user)):
    """Nilai rapor akhir semester (terkunci) dari seluruh semester yang pernah ditempuh — maks. 6."""
    siswa, kelas = await check_siswa_wali_or_admin(siswa_id, user)
    settings = await get_settings_doc()
    nilai = await db.nilai.find({"siswa_id": siswa_id}).to_list(2000)
    p_ids = list({n["penugasan_id"] for n in nilai})
    pen = {p["id"]: p for p in await db.penugasan.find({"id": {"$in": p_ids}}).to_list(2000)}
    mapel_by_id = {m["id"]: m for m in await db.mapel.find().to_list(500)}
    locked = {
        (d["penugasan_id"], d["tahun"], d["semester"])
        for d in await db.nilai_status.find({"penugasan_id": {"$in": p_ids}, "status": "terkunci"}).to_list(5000)
    }
    bobot = {
        (d["penugasan_id"], d["tahun"], d["semester"]): d
        for d in await db.bobot.find({"penugasan_id": {"$in": p_ids}}).to_list(5000)
    }

    per_sem: dict[tuple[str, str], dict[str, float | None]] = {}
    mapel_set: dict[str, int] = {}
    for n in nilai:
        k3 = (n["penugasan_id"], n["tahun"], n["semester"])
        p = pen.get(n["penugasan_id"])
        if not p or k3 not in locked:
            continue
        m = mapel_by_id.get(p["mapel_id"])
        if not m:
            continue
        _, ra = hitung(n, bobot.get(k3))
        per_sem.setdefault((n["tahun"], n["semester"]), {})[m["nama"]] = ra
        mapel_set[m["nama"]] = m.get("urutan", 999)

    sem_keys = sorted(per_sem.keys(), key=lambda x: (x[0], 0 if x[1] == "ganjil" else 1))[:6]
    mapel = sorted(mapel_set, key=lambda nm: (mapel_set[nm], nm))
    wali = await db.users.find_one({"id": kelas.get("wali_kelas_id")}) if kelas and kelas.get("wali_kelas_id") else None
    return TranskripOut(
        tanggal_cetak=today_iso("Asia/Jakarta"),
        nama_sekolah=settings["nama_sekolah"],
        kop_image=settings.get("kop_image"),
        logo_image=settings.get("logo_image"),
        kepala_nama=settings.get("kepala_nama", ""),
        wali_nama=wali["nama"] if wali else "",
        siswa_nama=siswa["nama"],
        siswa_nis=siswa.get("nis", ""),
        siswa_nism=siswa.get("nism", ""),
        siswa_nisn=siswa.get("nisn", ""),
        kelas_nama=kelas["nama"] if kelas else "",
        mapel=mapel,
        semester_list=[
            TranskripSemester(
                urut=i + 1, tahun=t, semester=s,
                sel=[TranskripCell(mapel_nama=nm, nilai=per_sem[(t, s)].get(nm)) for nm in mapel],
            )
            for i, (t, s) in enumerate(sem_keys)
        ],
    )
