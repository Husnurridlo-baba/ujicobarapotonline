// Mirror hand-written dari backend/models/models.py — wajib disinkronkan di edit yang sama.
export interface KelasWali {
  id: string;
  nama: string;
}

export interface Me {
  id: string;
  nama: string;
  username: string;
  role: "admin" | "guru";
  kelas_wali: KelasWali | null;
  is_super: boolean;
}

export interface UserOut {
  id: string;
  nama: string;
  username: string;
  nip: string;
  password: string;
  role: string;
  is_wali: boolean;
  is_super: boolean;
}

export interface KelasOut {
  id: string;
  nama: string;
  tingkat: number;
  wali_kelas_id: string | null;
  wali_nama: string | null;
}

export interface MutasiKeluar {
  jenis: string; // lulus | pindah
  tanggal: string;
  kelas: string;
  tahun: string;
  alasan: string;
  tujuan: string;
}

export interface MutasiMasuk {
  tanggal: string;
  kelas: string;
  tahun: string;
  semester: string;
  sekolah_asal: string;
  nomor_induk_asal: string;
  alasan: string;
}

export interface MutasiKeluarPayload {
  tanggal: string;
  alasan: string;
  tujuan: string;
}

export interface MutasiMasukPayload {
  nama: string;
  nisn: string;
  nism: string;
  nis: string;
  jk: string;
  kelas_id: string;
  tanggal: string;
  sekolah_asal: string;
  nomor_induk_asal: string;
  alasan: string;
}

export interface SiswaOut {
  id: string;
  nis: string;
  nism: string;
  nisn: string;
  nama: string;
  jk: string; // "L" | "P"
  kelas_id: string | null;
  status: string; // aktif | lulus | keluar
  tahun_lulus: string | null;
  kelas_nama: string | null;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  ayah: string;
  ibu: string;
  telepon: string;
  agama: string;
  sekolah_asal: string;
  diterima_kelas: string;
  diterima_tanggal: string;
  pekerjaan_ayah: string;
  pekerjaan_ibu: string;
  alamat_ortu: string;
  nama_wali: string;
  pekerjaan_wali: string;
  alamat_wali: string;
  foto: string | null;
  mutasi_keluar: MutasiKeluar | null;
  mutasi_masuk: MutasiMasuk | null;
}

export interface BiodataPayload {
  nama?: string;
  nisn?: string;
  jk?: string;
  nism?: string;
  tempat_lahir?: string;
  tanggal_lahir?: string;
  alamat?: string;
  ayah?: string;
  ibu?: string;
  telepon?: string;
  agama?: string;
  sekolah_asal?: string;
  diterima_kelas?: string;
  diterima_tanggal?: string;
  pekerjaan_ayah?: string;
  pekerjaan_ibu?: string;
  alamat_ortu?: string;
  nama_wali?: string;
  pekerjaan_wali?: string;
  alamat_wali?: string;
  foto?: string;
}

export interface MapelOut {
  id: string;
  kode: string;
  nama: string;
  kkm: number;
  urutan: number;
}

export interface PenugasanOut {
  id: string;
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
  guru_nama: string | null;
  mapel_nama: string | null;
  kelas_nama: string | null;
}

export interface NilaiOut {
  id: string;
  penugasan_id: string;
  siswa_id: string;
  tahun: string;
  semester: string; // ganjil | genap
  nilai_harian: number | null;
  nilai_tengah: number | null;
  nilai_akhir: number | null;
  rapot_tengah: number | null;
  rapot_akhir: number | null;
}

export interface NilaiEntryPayload {
  siswa_id: string;
  nilai_harian: number | null;
  nilai_tengah: number | null;
  nilai_akhir: number | null;
}

export interface BobotSetengah {
  harian: number;
  tengah: number;
}

export interface BobotSetakhir {
  harian: number;
  tengah: number;
  akhir: number;
}

export interface BobotOut {
  penugasan_id: string;
  tahun: string;
  semester: string;
  tengah: BobotSetengah;
  akhir: BobotSetakhir;
  tersimpan: boolean;
}

export type StatusNilai = "draft" | "dikirim" | "revisi" | "terkunci";

export interface StatusNilaiOut {
  penugasan_id: string;
  tahun: string;
  semester: string;
  status: StatusNilai;
  catatan_admin: string;
}

export interface RekapRow {
  penugasan_id: string;
  guru_nama: string | null;
  mapel_nama: string | null;
  kelas_nama: string | null;
  status: StatusNilai;
  catatan_admin: string;
  terisi: number;
  total: number;
}

export interface NilaiSavePayload {
  penugasan_id: string;
  tahun: string;
  semester: string;
  entries: NilaiEntryPayload[];
}

export interface WaliOut {
  id: string;
  siswa_id: string;
  tahun: string;
  semester: string;
  sakit: number;
  izin: number;
  alpa: number;
  ekskul_nama: string;
  ekskul_predikat: string;
  ekskul_keterangan: string;
  keputusan: string; // "" | naik | tinggal | lulus
  catatan: string;
}

export interface WaliEntryPayload {
  siswa_id: string;
  sakit: number;
  izin: number;
  alpa: number;
  ekskul_nama: string;
  ekskul_predikat: string;
  ekskul_keterangan: string;
  keputusan: string;
  catatan: string;
}

export interface WaliSavePayload {
  kelas_id: string;
  tahun: string;
  semester: string;
  entries: WaliEntryPayload[];
}

export interface SettingsOut {
  tahun_aktif: string;
  semester_aktif: string;
  nama_sekolah: string;
  kepala_nama: string;
  kepala_nip: string;
  kop_image: string | null;
  logo_image: string | null;
  alamat_sekolah: string;
}

export interface SettingsUpdatePayload {
  tahun_aktif?: string;
  semester_aktif?: string;
  nama_sekolah?: string;
  kepala_nama?: string;
  kepala_nip?: string;
  kop_image?: string;
  logo_image?: string;
  alamat_sekolah?: string;
}

export interface TahunOut {
  id: string;
  nama: string;
  aktif: boolean;
}

export interface KenaikanRow {
  siswa: SiswaOut;
  kelas_nama: string;
  tingkat: number;
  keputusan_wali: string;
  aksi: string; // naik | tinggal | lulus
  kelas_tujuan_id: string | null;
  kelas_tujuan_nama: string;
}

export interface KenaikanItemPayload {
  siswa_id: string;
  aksi: string;
  kelas_tujuan_id: string | null;
}

export interface KenaikanRequestPayload {
  tahun: string;
  keputusan: KenaikanItemPayload[];
}

export interface CetakBaris {
  mapel_nama: string;
  kkm: number;
  nilai_harian: number | null;
  nilai_tengah: number | null;
  nilai_akhir: number | null;
  nilai_rapot: number | null;
  predikat: string;
  terkunci: boolean;
}

export interface CetakRapot {
  tanggal_cetak: string;
  jenis: "tengah" | "akhir";
  nama_sekolah: string;
  kop_image: string | null;
  logo_image: string | null;
  kepala_nama: string;
  kepala_nip: string;
  wali_nama: string;
  wali_nip: string;
  kelas_nama: string;
  tahun: string;
  semester: string;
  siswa_nama: string;
  siswa_nis: string;
  siswa_nism: string;
  siswa_nisn: string;
  tempat_lahir: string;
  tanggal_lahir: string;
  alamat: string;
  ayah: string;
  ibu: string;
  telepon: string;
  siswa_jk: string;
  agama: string;
  sekolah_asal: string;
  diterima_kelas: string;
  diterima_tanggal: string;
  pekerjaan_ayah: string;
  pekerjaan_ibu: string;
  alamat_ortu: string;
  nama_wali: string;
  pekerjaan_wali: string;
  alamat_wali: string;
  foto: string | null;
  mutasi_keluar: MutasiKeluar | null;
  mutasi_masuk: MutasiMasuk | null;
  baris: CetakBaris[];
  sakit: number;
  izin: number;
  alpa: number;
  ekskul_nama: string;
  ekskul_predikat: string;
  ekskul_keterangan: string;
  keputusan: string;
  catatan: string;
}

export interface LegerSel {
  nilai_harian: number | null;
  nilai_tengah: number | null;
  nilai_akhir: number | null;
  rapot_tengah: number | null;
  rapot_akhir: number | null;
  terkunci: boolean;
}

export interface LegerRow {
  siswa_id: string;
  siswa_nama: string;
  nis: string;
  nisn: string;
  sel: (LegerSel | null)[];
}

export interface LegerOut {
  tanggal_cetak: string;
  nama_sekolah: string;
  kop_image: string | null;
  kelas_nama: string;
  tahun: string;
  semester: string;
  wali_nama: string;
  mapel: string[];
  baris: LegerRow[];
}

export interface TranskripCell {
  mapel_nama: string;
  nilai: number | null;
}

export interface TranskripSemester {
  urut: number;
  tahun: string;
  semester: string;
  sel: TranskripCell[];
}

export interface TranskripOut {
  tanggal_cetak: string;
  nama_sekolah: string;
  kop_image: string | null;
  logo_image: string | null;
  kepala_nama: string;
  wali_nama: string;
  siswa_nama: string;
  siswa_nis: string;
  siswa_nism: string;
  siswa_nisn: string;
  kelas_nama: string;
  mapel: string[];
  semester_list: TranskripSemester[];
}

export interface EmisStatus {
  terkonfigurasi: boolean;
  keterangan: string;
}

export interface EmisSyncResult {
  dibuat: number;
  diperbarui: number;
  total: number;
  keterangan: string;
}
