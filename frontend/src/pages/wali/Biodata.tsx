import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Pencil, UserRound } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import { readImage } from "@/lib/format";
import { BIODATA_WAJIB, biodataKurang } from "@/lib/biodata";
import { useMe } from "@/lib/session";
import type { BiodataPayload, SiswaOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TextKey = Exclude<keyof BiodataPayload, "foto" | "jk">;
type Form = Record<TextKey, string> & { jk: string; foto: string | null };

interface Field { k: TextKey; label: string; type?: string; wide?: boolean }

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "Data Peserta Didik",
    fields: [
      { k: "nama", label: "Nama peserta didik", wide: true },
      { k: "nism", label: "NISM" },
      { k: "nisn", label: "NISN" },
      { k: "tempat_lahir", label: "Tempat lahir" },
      { k: "tanggal_lahir", label: "Tanggal lahir", type: "date" },
      { k: "agama", label: "Agama" },
      { k: "telepon", label: "No. telepon" },
      { k: "alamat", label: "Alamat lengkap", wide: true },
      { k: "sekolah_asal", label: "Sekolah/madrasah asal", wide: true },
      { k: "diterima_kelas", label: "Diterima di kelas" },
      { k: "diterima_tanggal", label: "Diterima pada tanggal", type: "date" },
    ],
  },
  {
    title: "Orang Tua",
    fields: [
      { k: "ayah", label: "Nama ayah" },
      { k: "ibu", label: "Nama ibu" },
      { k: "pekerjaan_ayah", label: "Pekerjaan ayah" },
      { k: "pekerjaan_ibu", label: "Pekerjaan ibu" },
      { k: "alamat_ortu", label: "Alamat orang tua", wide: true },
    ],
  },
  {
    title: "Wali Peserta Didik (jika ada)",
    fields: [
      { k: "nama_wali", label: "Nama wali" },
      { k: "pekerjaan_wali", label: "Pekerjaan wali" },
      { k: "alamat_wali", label: "Alamat wali", wide: true },
    ],
  },
];

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.k));

export default function Biodata() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const kelasId = me?.kelas_wali?.id ?? "";
  const { data: siswaList, isLoading } = useQuery({
    queryKey: ["siswa", kelasId],
    queryFn: () => apiGet<SiswaOut[]>(`/siswa?kelas_id=${kelasId}&status=aktif`),
    enabled: !!kelasId,
  });
  const [editing, setEditing] = useState<SiswaOut | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [fotoBaru, setFotoBaru] = useState(false);

  const open = (s: SiswaOut) => {
    setEditing(s);
    setFotoBaru(false);
    const f = { jk: s.jk || "L", foto: s.foto } as Form;
    for (const k of ALL_KEYS) f[k] = (s[k as keyof SiswaOut] as string | null) ?? "";
    setForm(f);
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const { foto, ...rest } = form!;
      const payload: BiodataPayload = { ...rest };
      if (fotoBaru && foto) payload.foto = foto;
      return apiPut<SiswaOut>(`/siswa/${editing!.id}/biodata`, payload);
    },
    onSuccess: () => {
      toast.success("Biodata siswa disimpan");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["siswa"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const submit = () => {
    if (!form?.nama.trim()) {
      toast.error("Nama peserta didik wajib diisi");
      return;
    }
    saveMut.mutate();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Biodata Peserta Didik</h1>
        <p className="text-sm text-muted-foreground">
          Lengkapi biodata dan foto siswa kelas {me?.kelas_wali?.nama} — dicetak di halaman identitas buku rapor.
        </p>
      </div>
      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Foto</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>NISN / NISM</TableHead>
                <TableHead>Kelengkapan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : (siswaList ?? []).map((s) => {
                const total = BIODATA_WAJIB.length;
                const terisi = total - biodataKurang(s).length;
                return (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.foto ? <img src={s.foto} alt={s.nama} className="size-10 rounded-md object-cover" /> : <span className="grid size-10 place-items-center rounded-md bg-slate-100"><UserRound className="size-4 text-slate-400" /></span>}
                    </TableCell>
                    <TableCell className="font-medium" data-testid={`biodata-nama-${s.id}`}>{s.nama}</TableCell>
                    <TableCell className="font-mono text-xs">{s.nisn || "-"} / {s.nism || "-"}</TableCell>
                    <TableCell className={`text-xs ${terisi === total ? "text-emerald-700" : "text-amber-700"}`} data-testid={`biodata-lengkap-${s.id}`}>{terisi}/{total} terisi</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => open(s)} data-testid={`biodata-edit-btn-${s.id}`}>
                        <Pencil className="size-4" /> Isi Biodata
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Biodata {editing?.nama}</DialogTitle>
            <DialogDescription>Foto formal 3x4, maks. 2MB. Data wali boleh dikosongkan bila tidak ada.</DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {form.foto ? <img src={form.foto} alt="Foto siswa" className="h-28 w-20 rounded-md border object-cover" data-testid="biodata-foto-preview" /> : <span className="grid h-28 w-20 place-items-center rounded-md border border-dashed text-xs text-muted-foreground">3x4</span>}
                <Label htmlFor="foto-file" className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted" data-testid="biodata-foto-upload-btn">
                  <Camera className="size-4" /> Unggah Foto
                </Label>
                <input id="foto-file" type="file" accept="image/*" className="sr-only" data-testid="biodata-foto-input"
                  onChange={async (e) => { const url = await readImage(e.target.files?.[0], 2); if (url) { setForm({ ...form, foto: url }); setFotoBaru(true); } }} />
              </div>
              {SECTIONS.map((sec, si) => (
                <div key={sec.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-800">{sec.title}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {sec.fields.map((f) => (
                      <div key={f.k} className={`space-y-1.5 ${f.wide ? "sm:col-span-2" : ""}`}>
                        <Label htmlFor={`bio-${f.k}`}>{f.label}</Label>
                        <Input id={`bio-${f.k}`} type={f.type ?? "text"} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} data-testid={`biodata-${f.k}-input`} />
                      </div>
                    ))}
                    {si === 0 ? (
                      <div className="space-y-1.5">
                        <Label>Jenis kelamin</Label>
                        <Select value={form.jk} onValueChange={(v: string) => setForm({ ...form, jk: v })}>
                          <SelectTrigger data-testid="biodata-jk-select">
                            <SelectValue>{(v: unknown) => (String(v) === "P" ? "Perempuan" : "Laki-laki")}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="L">Laki-laki</SelectItem>
                            <SelectItem value="P">Perempuan</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={submit} disabled={saveMut.isPending} data-testid="biodata-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
