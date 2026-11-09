import type { SiswaOut } from "@/types";

/** Kolom biodata wajib (data wali opsional) + label untuk penanda kekurangan. */
export const BIODATA_WAJIB: { k: keyof SiswaOut; label: string }[] = [
  { k: "nama", label: "Nama" },
  { k: "nism", label: "NISM" },
  { k: "nisn", label: "NISN" },
  { k: "tempat_lahir", label: "Tempat lahir" },
  { k: "tanggal_lahir", label: "Tanggal lahir" },
  { k: "agama", label: "Agama" },
  { k: "telepon", label: "Telepon" },
  { k: "alamat", label: "Alamat" },
  { k: "sekolah_asal", label: "Sekolah asal" },
  { k: "diterima_kelas", label: "Diterima di kelas" },
  { k: "diterima_tanggal", label: "Tanggal diterima" },
  { k: "ayah", label: "Nama ayah" },
  { k: "ibu", label: "Nama ibu" },
  { k: "pekerjaan_ayah", label: "Pekerjaan ayah" },
  { k: "pekerjaan_ibu", label: "Pekerjaan ibu" },
  { k: "alamat_ortu", label: "Alamat orang tua" },
  { k: "foto", label: "Foto" },
];

export function biodataKurang(s: SiswaOut): string[] {
  return BIODATA_WAJIB.filter((f) => !s[f.k]).map((f) => f.label);
}
