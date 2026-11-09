import { toast } from "sonner";

/** Baca file gambar menjadi data URL, dengan validasi ukuran. */
export function readImage(file: File | undefined, maxMb: number): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return resolve(null);
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Ukuran gambar maksimal ${maxMb}MB`);
      return resolve(null);
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export const SEMESTER_LABEL: Record<string, string> = { ganjil: "Ganjil", genap: "Genap" };

export function fmtNilai(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function fmtTanggal(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}
