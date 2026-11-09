import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogIn, LogOut } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { KelasOut, MutasiKeluarPayload, MutasiMasukPayload, SiswaOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const EMPTY_MASUK: MutasiMasukPayload = { nama: "", nisn: "", nism: "", nis: "", jk: "L", kelas_id: "", tanggal: "", sekolah_asal: "", nomor_induk_asal: "", alasan: "" };

/** Tombol + dialog pendaftaran siswa pindahan (mutasi masuk). */
export function MutasiMasukDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<MutasiMasukPayload>(EMPTY_MASUK);
  const { data: kelasList } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas"), enabled: open });

  const mut = useMutation({
    mutationFn: () => apiPost<SiswaOut>("/siswa/mutasi-masuk", f),
    onSuccess: (s) => {
      toast.success(`${s.nama} terdaftar di kelas ${s.kelas_nama} sebagai siswa mutasi masuk`);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["siswa"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const submit = () => {
    if (!f.nama.trim() || !f.kelas_id || !f.tanggal || !f.sekolah_asal.trim()) {
      toast.error("Nama, kelas tujuan, tanggal masuk, dan sekolah asal wajib diisi");
      return;
    }
    mut.mutate();
  };

  const text = (k: keyof MutasiMasukPayload, label: string, type = "text", wide = false) => (
    <div className={`space-y-1.5 ${wide ? "col-span-2" : ""}`}>
      <Label htmlFor={`mm-${k}`}>{label}</Label>
      <Input id={`mm-${k}`} type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} data-testid={`mutasi-masuk-${k}-input`} />
    </div>
  );

  return (
    <>
      <Button variant="outline" onClick={() => { setF(EMPTY_MASUK); setOpen(true); }} data-testid="mutasi-masuk-open-btn">
        <LogIn className="size-4" /> Siswa Mutasi Masuk
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Daftarkan Siswa Mutasi Masuk</DialogTitle>
            <DialogDescription>
              Untuk siswa pindahan di tengah semester/tahun ajaran. Siswa langsung aktif di kelas tujuan, muncul di input nilai guru & data wali kelas, dan tercatat di lampiran mutasi masuk.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {text("nama", "Nama peserta didik", "text", true)}
            {text("nisn", "NISN")}
            {text("nism", "NISM")}
            <div className="space-y-1.5">
              <Label>Jenis kelamin</Label>
              <Select value={f.jk} onValueChange={(v: string) => setF({ ...f, jk: v })}>
                <SelectTrigger data-testid="mutasi-masuk-jk-select"><SelectValue>{(v: unknown) => (String(v) === "P" ? "Perempuan" : "Laki-laki")}</SelectValue></SelectTrigger>
                <SelectContent><SelectItem value="L">Laki-laki</SelectItem><SelectItem value="P">Perempuan</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Masuk ke kelas</Label>
              <Select value={f.kelas_id} onValueChange={(v: string) => setF({ ...f, kelas_id: v })}>
                <SelectTrigger data-testid="mutasi-masuk-kelas-select"><SelectValue>{(v: unknown) => kelasList?.find((k) => k.id === String(v))?.nama ?? "Pilih kelas"}</SelectValue></SelectTrigger>
                <SelectContent>{(kelasList ?? []).map((k) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {text("tanggal", "Tanggal masuk", "date")}
            {text("nomor_induk_asal", "Nomor induk di sekolah asal")}
            {text("sekolah_asal", "Nama sekolah/madrasah asal", "text", true)}
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="mm-alasan">Alasan pindah</Label>
              <Textarea id="mm-alasan" value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} placeholder="mis. Mengikuti orang tua pindah domisili" data-testid="mutasi-masuk-alasan-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={mut.isPending} data-testid="mutasi-masuk-save-btn">Daftarkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Dialog mutasi keluar (pindah, bukan lulus) untuk satu siswa aktif. */
export function MutasiKeluarDialog({ siswa, onClose }: { siswa: SiswaOut | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<MutasiKeluarPayload>({ tanggal: "", alasan: "", tujuan: "" });
  const mut = useMutation({
    mutationFn: () => apiPost<SiswaOut>(`/siswa/${siswa!.id}/mutasi-keluar`, f),
    onSuccess: () => {
      toast.success(`${siswa?.nama} dicatat mutasi keluar`);
      setF({ tanggal: "", alasan: "", tujuan: "" });
      onClose();
      qc.invalidateQueries({ queryKey: ["siswa"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });
  return (
    <Dialog open={!!siswa} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mutasi Keluar — {siswa?.nama}</DialogTitle>
          <DialogDescription>Siswa keluar dari kelas {siswa?.kelas_nama ?? "-"}, statusnya menjadi "Keluar", dan alasan tercetak di lampiran mutasi. Data nilai tetap tersimpan.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mk-tanggal">Tanggal keluar</Label>
            <Input id="mk-tanggal" type="date" value={f.tanggal} onChange={(e) => setF({ ...f, tanggal: e.target.value })} data-testid="mutasi-keluar-tanggal-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mk-tujuan">Pindah ke sekolah/madrasah (opsional)</Label>
            <Input id="mk-tujuan" value={f.tujuan} onChange={(e) => setF({ ...f, tujuan: e.target.value })} data-testid="mutasi-keluar-tujuan-input" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mk-alasan">Alasan keluar</Label>
            <Textarea id="mk-alasan" value={f.alasan} onChange={(e) => setF({ ...f, alasan: e.target.value })} placeholder="mis. Pindah domisili mengikuti orang tua" data-testid="mutasi-keluar-alasan-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button variant="destructive" onClick={() => (f.tanggal && f.alasan.trim() ? mut.mutate() : toast.error("Tanggal dan alasan wajib diisi"))} disabled={mut.isPending} data-testid="mutasi-keluar-save-btn">
            <LogOut className="size-4" /> Catat Mutasi Keluar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
