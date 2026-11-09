"""Seed data demo (idempotent). Jalankan: cd /app/backend && python seed.py"""

import asyncio
import uuid

from lib.db import db, ensure_indexes


def uid() -> str:
    return str(uuid.uuid4())


async def upsert_user(username: str, nama: str, password: str, nip: str = "", role: str = "guru") -> dict:
    doc = await db.users.find_one({"username": username})
    if not doc:
        doc = {"id": uid(), "nama": nama, "username": username, "password": password, "nip": nip, "role": role}
        await db.users.insert_one(doc)
    return doc


async def get_or_create(collection: str, query: dict, payload: dict) -> dict:
    doc = await db[collection].find_one(query)
    if not doc:
        doc = {"id": uid(), **payload}
        await db[collection].insert_one(doc)
    return doc


async def main() -> None:
    await ensure_indexes()

    admin = await upsert_user("admin", "H. Muhammad Ridwan, M.Pd.I", "admin123", "196905121994031002", "admin")
    ahmad = await upsert_user("ahmad", "Drs. Ahmad Fauzi", "guru123", "197804122003121001")
    siti = await upsert_user("siti", "Siti Nurhaliza, S.Pd", "guru123", "199005152015012003")
    budi = await upsert_user("budi", "Budi Santoso, S.Pd", "guru123", "198502102009011005")

    kelas_def = [
        ("X-A", 1, siti["id"]),
        ("X-B", 1, None),
        ("XI-A", 2, budi["id"]),
        ("XI-B", 2, None),
        ("XII-A", 3, None),
        ("XII-B", 3, None),
    ]
    kelas_ids: dict[str, str] = {}
    for nama, tingkat, wali in kelas_def:
        k = await get_or_create("kelas", {"nama": nama}, {"nama": nama, "tingkat": tingkat, "wali_kelas_id": wali})
        kelas_ids[nama] = k["id"]

    mapel_def = [
        ("AQH", "Al-Qur'an Hadits", 1),
        ("AAK", "Aqidah Akhlak", 2),
        ("FIQ", "Fiqih", 3),
        ("SKI", "Sejarah Kebudayaan Islam", 4),
        ("BAR", "Bahasa Arab", 5),
        ("MTK", "Matematika", 6),
        ("BIN", "Bahasa Indonesia", 7),
        ("BIG", "Bahasa Inggris", 8),
        ("FIS", "Fisika", 9),
        ("BIO", "Biologi", 10),
    ]
    mapel_ids: dict[str, str] = {}
    for kode, nama, urutan in mapel_def:
        m = await get_or_create("mapel", {"kode": kode}, {"kode": kode, "nama": nama, "kkm": 75, "urutan": urutan})
        mapel_ids[kode] = m["id"]

    nama_siswa: dict[str, list[str]] = {
        "X-A": ["Ahmad Maulana Yusuf", "Aisyah Putri Ramadhani", "Bagus Setiawan", "Fitri Handayani", "Hasan Abdullah"],
        "X-B": ["Ilham Nur Hidayat", "Jihan Alifia", "Khoirul Anwar", "Laila Zahra", "Miftahul Huda"],
        "XI-A": ["Naufal Hakim", "Nur Fadhilah", "Oktaviani Sari", "Putra Wijaya", "Qonita Salsabila"],
        "XI-B": ["Rahmat Hidayat", "Siti Aminah", "Taufiqurrahman", "Umi Kalsum", "Vina Anggraini"],
        "XII-A": ["Wahyu Nugroho", "Xena Maharani", "Yusuf Mansur", "Zahra Aulia", "Zainal Abidin"],
        "XII-B": ["Adinda Cahyani", "Bayu Pratama", "Citra Dewi", "Dzulfiqar Ramadhan", "Elsa Nuraini"],
    }
    nis_counter = 1
    for kelas_nama, names in nama_siswa.items():
        for i, nama in enumerate(names):
            existing = await db.siswa.find_one({"nama": nama, "kelas_id": kelas_ids[kelas_nama]})
            if existing:
                continue
            await db.siswa.insert_one(
                {
                    "id": uid(),
                    "nis": f"24{nis_counter:04d}",
                    "nisn": f"00{nis_counter:07d}",
                    "nama": nama,
                    "jk": "L" if i % 2 == 0 else "P",
                    "kelas_id": kelas_ids[kelas_nama],
                    "status": "aktif",
                    "tahun_lulus": None,
                }
            )
            nis_counter += 1

    penugasan_def = [
        (ahmad["id"], "FIS", "X-A"),
        (ahmad["id"], "FIS", "XI-A"),
        (ahmad["id"], "FIS", "XII-A"),
        (siti["id"], "MTK", "X-A"),
        (siti["id"], "BIN", "XI-A"),
        (siti["id"], "BIG", "XII-A"),
        (budi["id"], "FIQ", "X-A"),
        (budi["id"], "AQH", "XI-A"),
        (budi["id"], "BIN", "XII-A"),
    ]
    for guru_id, mapel_kode, kelas_nama in penugasan_def:
        await get_or_create(
            "penugasan",
            {"mapel_id": mapel_ids[mapel_kode], "kelas_id": kelas_ids[kelas_nama]},
            {"guru_id": guru_id, "mapel_id": mapel_ids[mapel_kode], "kelas_id": kelas_ids[kelas_nama]},
        )

    await db.settings.update_one(
        {"_id": "settings"},
        {
            "$setOnInsert": {
                "tahun_aktif": "2025/2026",
                "semester_aktif": "ganjil",
                "nama_sekolah": "MA Nurul Qur'an Kebonagung",
                "kepala_nama": admin["nama"],
                "kepala_nip": admin.get("nip", ""),
                "kop_image": None,
            }
        },
        upsert=True,
    )
    for nama in ("2024/2025", "2025/2026"):
        await get_or_create("tahun_pelajaran", {"nama": nama}, {"nama": nama})

    # Demo nilai & data wali untuk kelas X-A (semester ganjil) agar cetak rapor langsung bisa dicoba
    tp, sem = "2025/2026", "ganjil"
    siswa_xa = await db.siswa.find({"kelas_id": kelas_ids["X-A"]}).sort("nama", 1).to_list(50)
    fis = await db.penugasan.find_one({"mapel_id": mapel_ids["FIS"], "kelas_id": kelas_ids["X-A"]})
    mtk = await db.penugasan.find_one({"mapel_id": mapel_ids["MTK"], "kelas_id": kelas_ids["X-A"]})
    for idx, s in enumerate(siswa_xa):
        for p in (fis, mtk):
            if not p:
                continue
            await db.nilai.update_one(
                {"penugasan_id": p["id"], "siswa_id": s["id"], "tahun": tp, "semester": sem},
                {"$setOnInsert": {"id": uid(), "nilai_tengah": 78 + idx, "nilai_akhir": 80 + idx}},
                upsert=True,
            )
        await db.wali_rapot.update_one(
            {"siswa_id": s["id"], "tahun": tp, "semester": sem},
            {
                "$setOnInsert": {
                    "id": uid(),
                    "sakit": idx % 2,
                    "izin": 0,
                    "alpa": 0,
                    "ekskul_nama": "Pramuka",
                    "ekskul_predikat": "A",
                    "ekskul_keterangan": "Aktif mengikuti latihan",
                    "keputusan": "",
                    "catatan": "Ananda pertahankan prestasi dan tetap semangat belajar.",
                }
            },
            upsert=True,
        )

    # Keputusan semester genap untuk XI-A (naik) & XII-A (lulus) sebagai contoh alur kenaikan
    for kelas_nama, keputusan in (("XI-A", "naik"), ("XII-A", "lulus")):
        for s in await db.siswa.find({"kelas_id": kelas_ids[kelas_nama]}).to_list(50):
            await db.wali_rapot.update_one(
                {"siswa_id": s["id"], "tahun": tp, "semester": "genap"},
                {
                    "$setOnInsert": {
                        "id": uid(),
                        "sakit": 0,
                        "izin": 1,
                        "alpa": 0,
                        "ekskul_nama": "Pramuka",
                        "ekskul_predikat": "B",
                        "ekskul_keterangan": "Cukup aktif",
                        "keputusan": keputusan,
                        "catatan": "Terus tingkatkan semangat belajar.",
                    }
                },
                upsert=True,
            )

    counts = {name: await db[name].count_documents({}) for name in ("users", "kelas", "mapel", "siswa", "penugasan")}
    await seed_v2(kelas_ids, mapel_ids)
    print("Seed selesai:", counts)


async def seed_v2(kelas_ids: dict, mapel_ids: dict) -> None:
    """Fitur v2: admin utama, bobot, nilai harian, status kirim/kunci, NISM & biodata."""
    await db.users.update_one({"username": "admin"}, {"$set": {"is_super": True}})
    await db.users.update_many({"username": {"$ne": "admin"}, "is_super": {"$exists": False}}, {"$set": {"is_super": False}})
    tp, sem = "2025/2026", "ganjil"
    siswa_xa = await db.siswa.find({"kelas_id": kelas_ids["X-A"]}).sort("nama", 1).to_list(50)
    for kode, status in (("FIS", "terkunci"), ("MTK", "dikirim")):
        p = await db.penugasan.find_one({"mapel_id": mapel_ids[kode], "kelas_id": kelas_ids["X-A"]})
        if not p:
            continue
        k = {"penugasan_id": p["id"], "tahun": tp, "semester": sem}
        await db.bobot.update_one(
            k,
            {"$setOnInsert": {"id": uid(), "tengah": {"harian": 40, "tengah": 60}, "akhir": {"harian": 30, "tengah": 30, "akhir": 40}}},
            upsert=True,
        )
        for idx, s in enumerate(siswa_xa):
            await db.nilai.update_one(
                {**k, "siswa_id": s["id"], "nilai_harian": {"$in": [None]}},
                {"$set": {"nilai_harian": 82 + idx}},
            )
            await db.nilai.update_one(
                {**k, "siswa_id": s["id"]},
                {"$setOnInsert": {"id": uid(), "nilai_harian": 82 + idx, "nilai_tengah": 78 + idx, "nilai_akhir": 80 + idx}},
                upsert=True,
            )
        await db.nilai_status.update_one(k, {"$setOnInsert": {"id": uid(), "status": status, "catatan_admin": ""}}, upsert=True)
    for i, s in enumerate(await db.siswa.find({"nism": {"$exists": False}}).to_list(5000)):
        await db.siswa.update_one(
            {"id": s["id"]},
            {"$set": {"nism": f"1312351700{i + 1:04d}", "tempat_lahir": "Pacitan", "tanggal_lahir": "2009-05-12",
                      "alamat": "Kebonagung, Pacitan", "ayah": "", "ibu": "", "telepon": "", "foto": None}},
        )


if __name__ == "__main__":
    asyncio.run(main())