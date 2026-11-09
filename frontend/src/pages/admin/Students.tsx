import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { LogOut, Pencil, Plus, Printer, ScrollText, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { KelasOut, SiswaOut } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { EmisSyncDialog } from "@/components/EmisSyncDialog";
import { MutasiKeluarDialog, MutasiMasukDialog } from "@/components/MutasiDialogs";

interface FormState {
  nama: string;
  nism: string;
  nis: string;
  nisn: string;
  jk: string;
  kelas_id: string;
  status: string;
  tahun_lulus: string;
}

const STATUS_LABEL: Record<string, string> = { aktif: "Aktif", lulus: "Lulus", keluar: "Keluar" };

const statusBadge = (status: string) => {
  if (status === "lulus") return <Badge className="bg-amber-100 text-amber-800">Lulus</Badge>;
  if (status === "keluar") return <Badge variant="secondary">Keluar</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-800">Aktif</Badge>;
};

export default function Students() {
  const qc = useQueryClient();
  const [kelasFilter, setKelasFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("aktif");

  const { data: kelasList } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas") });
  const { data: siswaList, isLoading } = useQuery({
    queryKey: ["siswa", kelasFilter, statusFilter],
    queryFn: () => {
      const q = new URLSearchParams();
      if (kelasFilter !== "all") q.set("kelas_id", kelasFilter);
      if (statusFilter !== "all") q.set("status", statusFilter);
      return apiGet<SiswaOut[]>(`/siswa?${q.toString()}`);
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SiswaOut | null>(null);
  const [form, setForm] = useState<FormState>({ nama: "", nism: "", nis: "", nisn: "", jk: "L", kelas_id: "none", status: "aktif", tahun_lulus: "" });
  const [hapus, setHapus] = useState<SiswaOut | null>(null);
  const [keluar, setKeluar] = useState<SiswaOut | null>(null);

  const saveMut = useMutation({
    mutationFn: (f: FormState & { id: string | null }) => {
      const payload = {
        nama: f.nama,
        nism: f.nism,
        nis: f.nis,
        nisn: f.nisn,
        jk: f.jk,
        kelas_id: f.kelas_id === "none" ? null : f.kelas_id,
        status: f.id ? f.status : "aktif",
        tahun_lulus: f.status === "lulus" && f.tahun_lulus ? f.tahun_lulus : null,
      };
      return f.id
        ? apiPut<SiswaOut>(`/siswa/${f.id}`, payload)
        : apiPost<SiswaOut>("/siswa", payload);
    },
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Data siswa diperbarui" : "Siswa ditambahkan");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["siswa"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/siswa/${id}`),
    onSuccess: () => {
      toast.success("Siswa dihapus");
      setHapus(null);
      qc.invalidateQueries({ queryKey: ["siswa"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ nama: "", nism: "", nis: "", nisn: "", jk: "L", kelas_id: kelasFilter !== "all" ? kelasFilter : "none", status: "aktif", tahun_lulus: "" });
    setOpen(true);
  };

  const openEdit = (s: SiswaOut) => {
    setEditing(s);
    setForm({
      nama: s.nama,
      nism: s.nism,
      nis: s.nis,
      nisn: s.nisn,
      jk: s.jk,
      kelas_id: s.kelas_id ?? "none",
      status: s.status,
      tahun_lulus: s.tahun_lulus ?? "",
    });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nama.trim()) {
      toast.error("Nama siswa wajib diisi");
      return;
    }
    saveMut.mutate({ ...form, id: editing?.id ?? null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Manajemen Siswa</h1>
          <p className="text-sm text-muted-foreground">Input siswa baru, pindah kelas, dan kelola statusnya.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <EmisSyncDialog />
          <MutasiMasukDialog />
          <Button onClick={openCreate} data-testid="siswa-add-btn">
            <Plus className="size-4" /> Tambah Siswa
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={kelasFilter} onValueChange={(v: string) => setKelasFilter(v)}>
          <SelectTrigger className="w-44" data-testid="siswa-filter-kelas">
            <SelectValue>{(v) => (String(v) === "all" ? "Semua Kelas" : (kelasList ?? []).find((k) => k.id === v)?.nama ?? "Pilih kelas")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {(kelasList ?? []).map((k) => (
              <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v: string) => setStatusFilter(v)}>
          <SelectTrigger className="w-40" data-testid="siswa-filter-status">
            <SelectValue>{(v) => STATUS_LABEL[String(v)] ?? "Pilih status"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="lulus">Lulus (Alumni)</SelectItem>
            <SelectItem value="keluar">Keluar</SelectItem>
            <SelectItem value="all">Semua Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIS</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>JK</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">Memuat…</TableCell>
                </TableRow>
              ) : (siswaList ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.nis || "-"}</TableCell>
                  <TableCell className="font-medium" data-testid={`siswa-nama-${s.id}`}>{s.nama}</TableCell>
                  <TableCell>{s.jk}</TableCell>
                  <TableCell>{s.kelas_nama || "-"}</TableCell>
                  <TableCell>
                    {statusBadge(s.status)}
                    {s.mutasi_masuk ? <span className="ml-1 text-[11px] text-sky-700">pindahan</span> : null}
                    {s.mutasi_keluar && s.status === "keluar" ? <p className="mt-0.5 max-w-40 truncate text-[11px] text-muted-foreground" title={s.mutasi_keluar.alasan}>{s.mutasi_keluar.alasan}</p> : null}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {s.status === "aktif" ? (
                        <Link to={`/cetak/${s.id}`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`Cetak rapor ${s.nama}`} data-testid={`siswa-print-btn-${s.id}`}>
                          <Printer className="size-4" />
                        </Link>
                      ) : null}
                      <Link to={`/cetak/${s.id}/mutasi`} className={buttonVariants({ variant: "ghost", size: "icon-sm" })} aria-label={`Lampiran mutasi ${s.nama}`} data-testid={`siswa-mutasi-print-btn-${s.id}`}>
                        <ScrollText className="size-4" />
                      </Link>
                      {s.status === "aktif" ? (
                        <Button variant="ghost" size="icon-sm" aria-label={`Mutasi keluar ${s.nama}`} onClick={() => setKeluar(s)} data-testid={`siswa-mutasi-keluar-btn-${s.id}`}>
                          <LogOut className="size-4 text-amber-700" />
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${s.nama}`} onClick={() => openEdit(s)} data-testid={`siswa-edit-btn-${s.id}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${s.nama}`} onClick={() => setHapus(s)} data-testid={`siswa-delete-btn-${s.id}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (siswaList ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Tidak ada siswa pada filter ini.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Siswa" : "Tambah Siswa Baru"}</DialogTitle>
            <DialogDescription>
              {editing ? "Siswa lama dapat dipindah kelas dari sini." : "Isi data siswa baru dan tetapkan kelasnya."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="siswa-nama">Nama lengkap</Label>
              <Input id="siswa-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} data-testid="siswa-nama-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="siswa-nis">NIS</Label>
                <Input id="siswa-nis" value={form.nis} onChange={(e) => setForm({ ...form, nis: e.target.value })} data-testid="siswa-nis-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="siswa-nisn">NISN</Label>
                <Input id="siswa-nisn" value={form.nisn} onChange={(e) => setForm({ ...form, nisn: e.target.value })} data-testid="siswa-nisn-input" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor="siswa-nism">NISM</Label>
                <Input id="siswa-nism" value={form.nism} onChange={(e) => setForm({ ...form, nism: e.target.value })} data-testid="siswa-nism-input" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Jenis kelamin</Label>
                <Select value={form.jk} onValueChange={(v: string) => setForm({ ...form, jk: v })}>
                  <SelectTrigger data-testid="siswa-jk-select">
                    <SelectValue>{(v) => (String(v) === "P" ? "Perempuan" : "Laki-laki")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Laki-laki</SelectItem>
                    <SelectItem value="P">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Kelas</Label>
                <Select value={form.kelas_id} onValueChange={(v: string) => setForm({ ...form, kelas_id: v })}>
                  <SelectTrigger data-testid="siswa-kelas-select">
                    <SelectValue>{(v) => (String(v) === "none" ? "Tanpa kelas" : (kelasList ?? []).find((k) => k.id === v)?.nama ?? "Pilih kelas")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Tanpa kelas</SelectItem>
                    {(kelasList ?? []).map((k) => (
                      <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {editing ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v: string) => setForm({ ...form, status: v })}>
                    <SelectTrigger data-testid="siswa-status-select">
                      <SelectValue>{(v) => STATUS_LABEL[String(v)] ?? "Pilih status"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="lulus">Lulus (Alumni)</SelectItem>
                      <SelectItem value="keluar">Keluar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.status === "lulus" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="siswa-tahun-lulus">Tahun lulus</Label>
                    <Input id="siswa-tahun-lulus" value={form.tahun_lulus} onChange={(e) => setForm({ ...form, tahun_lulus: e.target.value })} placeholder="2026" data-testid="siswa-tahun-lulus-input" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={saveMut.isPending} data-testid="siswa-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MutasiKeluarDialog siswa={keluar} onClose={() => setKeluar(null)} />

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus siswa?"
        description={`Data ${hapus?.nama ?? ""} beserta nilai dan data wali kelasnya akan dihapus permanen.`}
        onConfirm={() => hapus && delMut.mutate(hapus.id)}
        busy={delMut.isPending}
      />
    </div>
  );
}