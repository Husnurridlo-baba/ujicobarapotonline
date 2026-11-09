import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageUp, Trash2 } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import { readImage } from "@/lib/format";
import type { SettingsOut, SettingsUpdatePayload } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_KOP_BYTES = 3 * 1024 * 1024;

export default function SchoolSettings() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });

  const [namaSekolah, setNamaSekolah] = useState("");
  const [kepalaNama, setKepalaNama] = useState("");
  const [kepalaNip, setKepalaNip] = useState("");
  const [kopBaru, setKopBaru] = useState<string | null>(null);
  const [kopPreview, setKopPreview] = useState<string | null>(null);
  const [logoBaru, setLogoBaru] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [alamat, setAlamat] = useState("");

  useEffect(() => {
    if (settings) {
      setNamaSekolah(settings.nama_sekolah);
      setKepalaNama(settings.kepala_nama);
      setKepalaNip(settings.kepala_nip);
      setKopPreview(settings.kop_image);
      setLogoPreview(settings.logo_image);
      setAlamat(settings.alamat_sekolah);
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (payload: SettingsUpdatePayload) => apiPut<SettingsOut>("/settings", payload),
    onSuccess: () => {
      toast.success("Pengaturan disimpan");
      setKopBaru(null);
      setLogoBaru(null);
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > MAX_KOP_BYTES) {
      toast.error("Ukuran gambar maksimal 3MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setKopBaru(dataUrl);
      setKopPreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    const payload: SettingsUpdatePayload = {
      nama_sekolah: namaSekolah,
      kepala_nama: kepalaNama,
      kepala_nip: kepalaNip,
      alamat_sekolah: alamat,
    };
    if (kopBaru) payload.kop_image = kopBaru;
    if (logoBaru) payload.logo_image = logoBaru;
    saveMut.mutate(payload);
  };

  const hapusKop = () => {
    setKopBaru(null);
    setKopPreview(null);
    saveMut.mutate({ kop_image: "" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Kop &amp; Tanda Tangan</h1>
        <p className="text-sm text-muted-foreground">
          Unggah kop surat madrasah (akan tampil di atas rapor) dan isi data kepala madrasah.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Kop Surat</CardTitle>
          <CardDescription>Gambar lebar (rasio panjang), format PNG/JPG, maksimal 3MB. Kosong = kop teks bawaan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {kopPreview ? (
            <div className="rounded-lg border bg-white p-2">
              <img src={kopPreview} alt="Kop surat" className="max-h-40 w-full object-contain" data-testid="kop-preview-img" />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada kop — rapor memakai kop teks bawaan.
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Label
              htmlFor="kop-file"
              className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              data-testid="kop-upload-btn"
            >
              <ImageUp className="size-4" /> Pilih File Kop
            </Label>
            <input
              id="kop-file"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => onFile(e.target.files?.[0])}
              data-testid="kop-file-input"
            />
            {kopPreview ? (
              <Button variant="outline" size="sm" onClick={hapusKop} disabled={saveMut.isPending} data-testid="kop-delete-btn">
                <Trash2 className="size-4" /> Hapus Kop
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Logo Madrasah</CardTitle>
          <CardDescription>Dipakai di cover rapor dan daftar nilai 6 semester. PNG transparan disarankan, maks. 2MB. Klik Simpan Pengaturan setelah memilih.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          {logoPreview ? <img src={logoPreview} alt="Logo" className="size-20 object-contain" data-testid="logo-preview-img" /> : <span className="grid size-20 place-items-center rounded-full border border-dashed text-xs text-muted-foreground">Logo</span>}
          <Label htmlFor="logo-file" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted" data-testid="logo-upload-btn">
            <ImageUp className="size-4" /> Pilih Logo
          </Label>
          <input id="logo-file" type="file" accept="image/*" className="sr-only" data-testid="logo-file-input"
            onChange={async (e) => { const url = await readImage(e.target.files?.[0], 2); if (url) { setLogoBaru(url); setLogoPreview(url); } }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Identitas Madrasah</CardTitle>
          <CardDescription>Nama madrasah dan kepala madrasah (blok tanda tangan rapor).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="nama-sekolah">Nama madrasah</Label>
            <Input id="nama-sekolah" value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)} data-testid="settings-nama-sekolah-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="alamat-sekolah">Alamat madrasah</Label>
            <Input id="alamat-sekolah" value={alamat} onChange={(e) => setAlamat(e.target.value)} data-testid="settings-alamat-input" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="kepala-nama">Nama kepala madrasah</Label>
              <Input id="kepala-nama" value={kepalaNama} onChange={(e) => setKepalaNama(e.target.value)} placeholder="Nama lengkap, gelar" data-testid="settings-kepala-nama-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kepala-nip">NIP kepala madrasah</Label>
              <Input id="kepala-nip" value={kepalaNip} onChange={(e) => setKepalaNip(e.target.value)} placeholder="NIP" data-testid="settings-kepala-nip-input" />
            </div>
          </div>
          <Button onClick={submit} disabled={saveMut.isPending} data-testid="settings-save-btn">
            Simpan Pengaturan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}