# SPEC — Rapor Online MA Nurul Qur'an Kebonagung

## Apa ini
Aplikasi rapor (laporan hasil belajar) online untuk Madrasah Aliyah Nurul Qur'an Kebonagung.
UI sepenuhnya Bahasa Indonesia. Semua layar responsif (HP/tablet/laptop).

## Peran & Auth
- **Admin (Waka Kurikulum)**: satu akun `admin`. Mengatur tahun pelajaran & semester aktif,
  CRUD guru (lihat/reset password), CRUD siswa, kelas & wali kelas, mapel, penugasan mengajar,
  proses kenaikan kelas, daftar alumni, upload kop surat + data kepala madrasah, dan dapat mencetak
  rapor siswa mana pun.
- **Guru**: login dengan akun buatan admin. Hanya bisa mengisi nilai (NTS/NAS, ganjil & genap)
  sesuai **penugasan mengajar** (guru + mapel + kelas) yang dibuat admin.
- **Wali Kelas**: BUKAN role terpisah — menu "Wali Kelas" hanya muncul untuk guru yang ditunjuk
  sebagai wali kelas pada tabel kelas (`me.kelas_wali` dari GET /api/auth/me). Menu wali: Data Wali
  Kelas (absensi S/I/A, ekskul + predikat, keputusan naik/tinggal/lulus, catatan) dan Cetak Rapor.

Auth = sesi httpOnly cookie (`rapot_session`), koleksi Mongo `sessions` (TTL 30 hari).
Password disimpan plaintext agar admin selalu bisa melihat & mereset (kebutuhan eksplisit user).
Login: POST /api/auth/login {username, password}. Logout: POST /api/auth/logout.

## Data model (koleksi Mongo)
- `users` — id(uuid str), nama, username(unique), password, nip, role(admin|guru)
- `kelas` — nama(unique), tingkat 1..3 (=kelas 10/11/12), wali_kelas_id
- `siswa` — nis, nisn, nama, jk(L/P), kelas_id, status(aktif|lulus|keluar), tahun_lulus
- `mapel` — kode, nama, kkm, urutan (urutan = urutan cetak di rapor)
- `penugasan` — guru_id, mapel_id, kelas_id (unique per mapel+kelas)
- `nilai` — penugasan_id, siswa_id, tahun, semester(ganjil|genap), nilai_tengah, nilai_akhir
  (unique per penugasan+siswa+tahun+semester)
- `wali_rapot` — siswa_id, tahun, semester, sakit, izin, alpa, ekskul_nama, ekskul_predikat,
  ekskul_keterangan, keputusan(""|naik|tinggal|lulus), catatan
- `tahun_pelajaran` — nama(unique). `settings` — doc tunggal _id="settings": tahun_aktif,
  semester_aktif, nama_sekolah, kepala_nama, kepala_nip, kop_image(data URL, null = kop teks bawaan)

## Alur kunci
1. Admin atur TP aktif (mis. 2025/2026) + semester (ganjil/genap) → pill di header.
2. Admin input guru → kelas + tunjuk wali kelas → mapel → penugasan mengajar → siswa.
3. Guru: /guru/grades — pilih penugasan + semester, isi NTS/NAS per siswa (0–100), Simpan.
4. Wali kelas: /wali/homeroom — isi S/I/A, ekskul, keputusan, catatan per semester.
5. Cetak: /cetak/:siswaId (wali kelas kelasnya sendiri, atau admin) — A4, watermark nama
   sekolah, kop (gambar upload atau teks bawaan), tabel nilai + KKM + predikat (A≥90,B≥80,C≥70,D),
   kehadiran, ekskul, keputusan, catatan, 3 blok ttd (Orang Tua, Wali Kelas, Kepala Madrasah).
   Cetak via window.print(), @media print menyembunyikan chrome app.
6. Kenaikan kelas: /admin/promotion — preview semua siswa aktif; aksi awal dari keputusan wali
   kelas semester genap; naik = pindah kelas (default kelas tingkat+1 dengan suffix sama),
   lulus = status "lulus" + tahun_lulus → masuk tab Daftar Alumni.

## Fitur v2 (bobot, reviu, dokumen, EMIS, admin utama)
- **Bobot nilai** (koleksi `bobot`, per penugasan+tahun+semester): guru WAJIB simpan bobot sebelum
  /nilai/save (400 jika belum). Default isian 40/60 (TS: harian/NTS) dan 30/30/40 (AS: harian/NTS/NAS),
  masing-masing harus total 100. Nilai kini punya `nilai_harian`. Rapor TS = harian*b + NTS*b; AS = h*b+NTS*b+NAS*b.
- **Alur status** (`nilai_status`): draft → (guru POST /nilai/kirim) dikirim → admin POST /nilai/reviu
  aksi=setujui → terkunci | aksi=revisi (catatan wajib) → revisi → guru perbaiki & kirim lagi.
  aksi=buka membuka kunci. Saat dikirim/terkunci guru tidak bisa ubah nilai/bobot.
  GET /nilai/rekap (admin): progres terisi/total per penugasan. Halaman /admin/review.
- **Cetak hanya memakai nilai TERKUNCI**. Dokumen (/dokumen untuk admin & wali): leger kelas
  (/leger/:kelasId, landscape), per siswa: rapor TS & AS (/cetak/:id?jenis=tengah|akhir), nilai 6 semester
  (/cetak/:id/transkrip), cover (logo, nama, NISN, NISM), identitas (biodata+foto), petunjuk, mutasi.
- **Biodata** wali kelas: /wali/biodata → PUT /api/siswa/{id}/biodata (wali kelasnya atau admin): nama, NISM, NISN,
  JK, tempat/tgl lahir, agama, alamat, telepon, sekolah_asal, diterima_kelas, diterima_tanggal, ayah, ibu,
  pekerjaan_ayah, pekerjaan_ibu, alamat_ortu, nama_wali, pekerjaan_wali, alamat_wali, foto (data URL ≤2MB).
  Halaman cetak Identitas menampilkan 16 butir ini + foto 3x4 + ttd kepala madrasah.
- Dashboard wali kelas: panel "Biodata Belum Lengkap" (lib/biodata.ts BIODATA_WAJIB, 17 kolom termasuk foto; data wali opsional).
- Rapor TS/AS hanya menampilkan KKM, Nilai Rapor, Predikat (tanpa harian/NTS/NAS). Rapor AS semester GENAP
  menampilkan kotak keputusan: naik → "NAIK ke kelas XI" (opsi lain dicoret), tinggal, lulus (kelas XII), atau
  belum diisi → "Naik ke kelas .. / Tinggal di kelas .. *) coret yang tidak perlu". Rapor ganjil & TS tanpa kotak.
- **Mutasi** (field siswa `mutasi_keluar` {jenis lulus|pindah, tanggal, kelas, tahun, alasan, tujuan} dan
  `mutasi_masuk` {tanggal, kelas, tahun, semester, sekolah_asal, nomor_induk_asal, alasan}):
  - Lulus via POST /kenaikan → mutasi_keluar jenis "lulus" otomatis (alumni lama tanpa data → fallback "Lulus").
  - Admin POST /siswa/{id}/mutasi-keluar {tanggal, alasan, tujuan} → status "keluar", kelas_id null.
  - Admin POST /siswa/mutasi-masuk (siswa pindahan tengah semester/tahun) → langsung aktif di kelas tujuan,
    biodata sekolah_asal/diterima_kelas/diterima_tanggal terisi otomatis.
  - Lampiran Mutasi (/cetak/:id/mutasi) mengisi baris Keluar & Masuk otomatis. Akses: menu Siswa (ikon gulungan,
    semua status), tab Alumni, dan Cetak Dokumen.
- Kop yang diunggah (settings.kop_image) tampil di rapor TS/AS, identitas, petunjuk, mutasi, leger, dan nilai 6 semester (cover memakai logo).
- **Admin utama** = user `is_super` (akun `admin`). Hanya ia yang bisa membuat/hapus/ubah akun role admin
  (POST /users role=admin). Admin utama tak bisa dihapus.
- **EMIS** (admin, menu Siswa → Sinkron EMIS): POST /emis/import (xlsx/csv ekspor EMIS, upsert by NISN/NISM,
  kolom Rombel dipetakan ke nama kelas) — berfungsi. POST /emis/sync tarik langsung via env
  EMIS_API_URL/EMIS_USERNAME/EMIS_PASSWORD; tanpa itu → 503 (EMIS tidak punya API publik resmi).
- Settings tambahan: logo_image, alamat_sekolah.

## Seed (backend/seed.py, idempotent)
TP 2025/2026 ganjil aktif; 4 akun; 6 kelas (X-A s.d. XII-B); 10 mapel; 30 siswa; 9 penugasan;
nilai demo X-A (Fisika & Matematika, ganjil); wali_rapot demo X-A (ganjil) + XI-A/XII-A (genap,
keputusan naik/lulus). v2: bobot + nilai harian untuk FIS & MTK X-A ganjil; FIS = terkunci, MTK = dikirim (menunggu reviu); semua siswa diberi NISM.

## Teknis
- Backend: FastAPI (backend/routers/* di api_router prefix /api), motor, Pydantic v2 di
  backend/models/models.py. Cetak date: today_iso("Asia/Jakarta").
- Frontend: React 19 + TS strict, TanStack Query, relative /api via lib/api.ts; sesi via
  lib/session.ts (useMe/beginSession/endSession); interfaces di src/types.ts mirror models.py.
- Semua endpoint gated: admin-only (users, kenaikan, settings PUT, semua POST/PUT/DELETE),
  guru-scoped (penugasan/nilai milik sendiri), wali-scoped (wali_rapot kelasnya).
