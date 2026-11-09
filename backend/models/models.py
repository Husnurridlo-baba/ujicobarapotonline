"""Pydantic v2 models. Hand-mirror every model in frontend/src/types.ts (same edit)."""
from typing import List, Optional
import uuid

from pydantic import BaseModel, Field


def uid() -> str:
    return str(uuid.uuid4())


# ---------- Auth ----------
class LoginRequest(BaseModel):
    username: str
    password: str


class KelasWali(BaseModel):
    id: str
    nama: str


class Me(BaseModel):
    id: str
    nama: str
    username: str
    role: str  # "admin" (Waka Kurikulum) | "guru"
    kelas_wali: Optional[KelasWali] = None
    is_super: bool = False  # admin utama (akun pertama)


# ---------- Guru / admin (users) ----------
class UserOut(BaseModel):
    id: str
    nama: str
    username: str
    nip: str = ""
    password: str = ""  # admin-only endpoints; admin may view & reset
    role: str = "guru"
    is_wali: bool = False
    is_super: bool = False


class UserCreate(BaseModel):
    nama: str
    username: str
    password: str
    nip: str = ""
    role: str = "guru"  # guru | admin


class UserUpdate(BaseModel):
    nama: str
    username: str
    nip: str = ""
    password: Optional[str] = None  # kosong / None = password tidak diubah
    role: str = "guru"


# ---------- Kelas ----------
class KelasOut(BaseModel):
    id: str
    nama: str
    tingkat: int
    wali_kelas_id: Optional[str] = None
    wali_nama: Optional[str] = None


class KelasCreate(BaseModel):
    nama: str
    tingkat: int
    wali_kelas_id: Optional[str] = None


# ---------- Mutasi ----------
class MutasiKeluar(BaseModel):
    jenis: str = "pindah"  # lulus | pindah
    tanggal: str = ""
    kelas: str = ""
    tahun: str = ""
    alasan: str = ""
    tujuan: str = ""  # madrasah/sekolah tujuan


class MutasiMasuk(BaseModel):
    tanggal: str = ""
    kelas: str = ""
    tahun: str = ""
    semester: str = ""
    sekolah_asal: str = ""
    nomor_induk_asal: str = ""
    alasan: str = ""


class MutasiKeluarIn(BaseModel):
    tanggal: str
    alasan: str
    tujuan: str = ""


class MutasiMasukIn(BaseModel):
    nama: str
    nisn: str = ""
    nism: str = ""
    nis: str = ""
    jk: str = "L"
    kelas_id: str
    tanggal: str
    sekolah_asal: str
    nomor_induk_asal: str = ""
    alasan: str = ""


# ---------- Siswa ----------
class SiswaOut(BaseModel):
    id: str
    nis: str = ""
    nism: str = ""
    nisn: str = ""
    nama: str
    jk: str = "L"  # L | P
    kelas_id: Optional[str] = None
    status: str = "aktif"  # aktif | lulus | keluar
    tahun_lulus: Optional[str] = None
    kelas_nama: Optional[str] = None
    tempat_lahir: str = ""
    tanggal_lahir: str = ""
    alamat: str = ""
    ayah: str = ""
    ibu: str = ""
    telepon: str = ""
    agama: str = ""
    sekolah_asal: str = ""
    diterima_kelas: str = ""
    diterima_tanggal: str = ""
    pekerjaan_ayah: str = ""
    pekerjaan_ibu: str = ""
    alamat_ortu: str = ""
    nama_wali: str = ""
    pekerjaan_wali: str = ""
    alamat_wali: str = ""
    foto: Optional[str] = None
    mutasi_keluar: Optional[MutasiKeluar] = None
    mutasi_masuk: Optional[MutasiMasuk] = None


class SiswaCreate(BaseModel):
    nis: str = ""
    nism: str = ""
    nisn: str = ""
    nama: str
    jk: str = "L"
    kelas_id: Optional[str] = None


class SiswaUpdate(BaseModel):
    """Semua field opsional — hanya yang dikirim yang diupdate."""
    nis: Optional[str] = None
    nism: Optional[str] = None
    nisn: Optional[str] = None
    nama: Optional[str] = None
    jk: Optional[str] = None
    kelas_id: Optional[str] = None
    status: Optional[str] = None
    tahun_lulus: Optional[str] = None
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    alamat: Optional[str] = None
    ayah: Optional[str] = None
    ibu: Optional[str] = None
    telepon: Optional[str] = None
    agama: Optional[str] = None
    sekolah_asal: Optional[str] = None
    diterima_kelas: Optional[str] = None
    diterima_tanggal: Optional[str] = None
    pekerjaan_ayah: Optional[str] = None
    pekerjaan_ibu: Optional[str] = None
    alamat_ortu: Optional[str] = None
    nama_wali: Optional[str] = None
    pekerjaan_wali: Optional[str] = None
    alamat_wali: Optional[str] = None
    foto: Optional[str] = None


class BiodataUpdate(BaseModel):
    """Diisi wali kelas (atau admin): biodata lengkap + foto untuk halaman identitas rapor."""
    nama: Optional[str] = None
    nisn: Optional[str] = None
    jk: Optional[str] = None
    nism: Optional[str] = None
    tempat_lahir: Optional[str] = None
    tanggal_lahir: Optional[str] = None
    alamat: Optional[str] = None
    ayah: Optional[str] = None
    ibu: Optional[str] = None
    telepon: Optional[str] = None
    agama: Optional[str] = None
    sekolah_asal: Optional[str] = None
    diterima_kelas: Optional[str] = None
    diterima_tanggal: Optional[str] = None
    pekerjaan_ayah: Optional[str] = None
    pekerjaan_ibu: Optional[str] = None
    alamat_ortu: Optional[str] = None
    nama_wali: Optional[str] = None
    pekerjaan_wali: Optional[str] = None
    alamat_wali: Optional[str] = None
    foto: Optional[str] = None  # data URL; None = tidak diubah


# ---------- Mapel ----------
class MapelOut(BaseModel):
    id: str
    kode: str = ""
    nama: str
    kkm: int = 75
    urutan: int = 0


class MapelCreate(BaseModel):
    kode: str = ""
    nama: str
    kkm: int = 75
    urutan: int = 0


# ---------- Penugasan mengajar ----------
class PenugasanOut(BaseModel):
    id: str
    guru_id: str
    mapel_id: str
    kelas_id: str
    guru_nama: Optional[str] = None
    mapel_nama: Optional[str] = None
    kelas_nama: Optional[str] = None


class PenugasanCreate(BaseModel):
    guru_id: str
    mapel_id: str
    kelas_id: str


# ---------- Nilai + bobot ----------
class NilaiOut(BaseModel):
    id: str
    penugasan_id: str
    siswa_id: str
    tahun: str
    semester: str  # ganjil | genap
    nilai_harian: Optional[float] = None
    nilai_tengah: Optional[float] = None
    nilai_akhir: Optional[float] = None
    # dihitung dari bobot (response-only)
    rapot_tengah: Optional[float] = None
    rapot_akhir: Optional[float] = None


class NilaiEntry(BaseModel):
    siswa_id: str
    nilai_harian: Optional[float] = Field(None, ge=0, le=100)
    nilai_tengah: Optional[float] = Field(None, ge=0, le=100)
    nilai_akhir: Optional[float] = Field(None, ge=0, le=100)


class NilaiSave(BaseModel):
    penugasan_id: str
    tahun: str
    semester: str
    entries: List[NilaiEntry]


class BobotSetengah(BaseModel):
    harian: int = 40
    tengah: int = 60


class BobotSetakhir(BaseModel):
    harian: int = 30
    tengah: int = 30
    akhir: int = 40


class BobotOut(BaseModel):
    penugasan_id: str
    tahun: str
    semester: str
    tengah: BobotSetengah = BobotSetengah()
    akhir: BobotSetakhir = BobotSetakhir()
    tersimpan: bool = False


class BobotSave(BaseModel):
    penugasan_id: str
    tahun: str
    semester: str
    tengah: BobotSetengah
    akhir: BobotSetakhir


# ---------- Alur kirim / reviu nilai ----------
class StatusNilaiOut(BaseModel):
    penugasan_id: str
    tahun: str
    semester: str
    status: str = "draft"  # draft | dikirim | revisi | terkunci
    catatan_admin: str = ""


class KirimRequest(BaseModel):
    penugasan_id: str
    tahun: str
    semester: str


class ReviuRequest(BaseModel):
    penugasan_id: str
    tahun: str
    semester: str
    aksi: str  # setujui | revisi
    catatan: str = ""


class RekapRow(BaseModel):
    penugasan_id: str
    guru_nama: Optional[str] = None
    mapel_nama: Optional[str] = None
    kelas_nama: Optional[str] = None
    status: str = "draft"
    catatan_admin: str = ""
    terisi: int = 0
    total: int = 0


# ---------- Data wali kelas (rapor) ----------
class WaliOut(BaseModel):
    id: str
    siswa_id: str
    tahun: str
    semester: str
    sakit: int = 0
    izin: int = 0
    alpa: int = 0
    ekskul_nama: str = ""
    ekskul_predikat: str = ""
    ekskul_keterangan: str = ""
    keputusan: str = ""  # "" | naik | tinggal | lulus
    catatan: str = ""


class WaliEntry(BaseModel):
    siswa_id: str
    sakit: int = Field(0, ge=0, le=999)
    izin: int = Field(0, ge=0, le=999)
    alpa: int = Field(0, ge=0, le=999)
    ekskul_nama: str = ""
    ekskul_predikat: str = ""
    ekskul_keterangan: str = ""
    keputusan: str = ""
    catatan: str = ""


class WaliSave(BaseModel):
    kelas_id: str
    tahun: str
    semester: str
    entries: List[WaliEntry]


# ---------- Settings / tahun pelajaran ----------
class SettingsOut(BaseModel):
    tahun_aktif: str = ""
    semester_aktif: str = ""
    nama_sekolah: str = "MA Nurul Qur'an Kebonagung"
    kepala_nama: str = ""
    kepala_nip: str = ""
    kop_image: Optional[str] = None
    logo_image: Optional[str] = None
    alamat_sekolah: str = ""


class SettingsUpdate(BaseModel):
    tahun_aktif: Optional[str] = None
    semester_aktif: Optional[str] = None
    nama_sekolah: Optional[str] = None
    kepala_nama: Optional[str] = None
    kepala_nip: Optional[str] = None
    kop_image: Optional[str] = None
    logo_image: Optional[str] = None
    alamat_sekolah: Optional[str] = None


class TahunOut(BaseModel):
    id: str
    nama: str
    aktif: bool = False


class TahunCreate(BaseModel):
    nama: str


# ---------- Kenaikan kelas ----------
class KenaikanRow(BaseModel):
    siswa: SiswaOut
    kelas_nama: str = ""
    tingkat: int = 0
    keputusan_wali: str = ""
    aksi: str = "naik"  # naik | tinggal | lulus
    kelas_tujuan_id: Optional[str] = None
    kelas_tujuan_nama: str = ""


class KenaikanItem(BaseModel):
    siswa_id: str
    aksi: str  # naik | tinggal | lulus
    kelas_tujuan_id: Optional[str] = None


class KenaikanRequest(BaseModel):
    tahun: str
    keputusan: List[KenaikanItem]


# ---------- Cetak rapor & dokumen ----------
class CetakBaris(BaseModel):
    mapel_nama: str
    kkm: int = 75
    nilai_harian: Optional[float] = None
    nilai_tengah: Optional[float] = None
    nilai_akhir: Optional[float] = None
    nilai_rapot: Optional[float] = None  # hasil bobot (tengah/akhir sesuai jenis)
    predikat: str = ""
    terkunci: bool = False


class CetakRapot(BaseModel):
    tanggal_cetak: str
    jenis: str = "akhir"  # tengah | akhir
    nama_sekolah: str = "MA Nurul Qur'an Kebonagung"
    kop_image: Optional[str] = None
    logo_image: Optional[str] = None
    kepala_nama: str = ""
    kepala_nip: str = ""
    wali_nama: str = ""
    wali_nip: str = ""
    kelas_nama: str = ""
    tahun: str
    semester: str
    siswa_nama: str
    siswa_nis: str = ""
    siswa_nism: str = ""
    siswa_nisn: str = ""
    tempat_lahir: str = ""
    tanggal_lahir: str = ""
    alamat: str = ""
    ayah: str = ""
    ibu: str = ""
    telepon: str = ""
    siswa_jk: str = "L"
    agama: str = ""
    sekolah_asal: str = ""
    diterima_kelas: str = ""
    diterima_tanggal: str = ""
    pekerjaan_ayah: str = ""
    pekerjaan_ibu: str = ""
    alamat_ortu: str = ""
    nama_wali: str = ""
    pekerjaan_wali: str = ""
    alamat_wali: str = ""
    foto: Optional[str] = None
    mutasi_keluar: Optional[MutasiKeluar] = None
    mutasi_masuk: Optional[MutasiMasuk] = None
    baris: List[CetakBaris] = []
    sakit: int = 0
    izin: int = 0
    alpa: int = 0
    ekskul_nama: str = ""
    ekskul_predikat: str = ""
    ekskul_keterangan: str = ""
    keputusan: str = ""
    catatan: str = ""


class LegerSel(BaseModel):
    nilai_harian: Optional[float] = None
    nilai_tengah: Optional[float] = None
    nilai_akhir: Optional[float] = None
    rapot_tengah: Optional[float] = None
    rapot_akhir: Optional[float] = None
    terkunci: bool = False


class LegerRow(BaseModel):
    siswa_id: str
    siswa_nama: str
    nis: str = ""
    nisn: str = ""
    sel: List[Optional[LegerSel]] = []  # sejajar dengan daftar mapel


class LegerOut(BaseModel):
    tanggal_cetak: str
    nama_sekolah: str
    kop_image: Optional[str] = None
    kelas_nama: str
    tahun: str
    semester: str
    wali_nama: str = ""
    mapel: List[str] = []
    baris: List[LegerRow] = []


class TranskripCell(BaseModel):
    mapel_nama: str
    nilai: Optional[float] = None  # nilai rapot akhir semester tsb


class TranskripSemester(BaseModel):
    urut: int
    tahun: str
    semester: str
    sel: List[TranskripCell] = []


class TranskripOut(BaseModel):
    tanggal_cetak: str
    nama_sekolah: str
    kop_image: Optional[str] = None
    logo_image: Optional[str] = None
    kepala_nama: str = ""
    wali_nama: str = ""
    siswa_nama: str
    siswa_nis: str = ""
    siswa_nism: str = ""
    siswa_nisn: str = ""
    kelas_nama: str = ""
    mapel: List[str] = []
    semester_list: List[TranskripSemester] = []


# ---------- EMIS Kemenag ----------
class EmisStatus(BaseModel):
    terkonfigurasi: bool = False
    keterangan: str = ""


class EmisSyncResult(BaseModel):
    dibuat: int = 0
    diperbarui: int = 0
    total: int = 0
    keterangan: str = ""