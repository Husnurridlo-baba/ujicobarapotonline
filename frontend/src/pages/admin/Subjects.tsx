import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { MapelOut } from "@/types";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface FormState {
  kode: string;
  nama: string;
  kkm: string;
  urutan: string;
}

const EMPTY: FormState = { kode: "", nama: "", kkm: "75", urutan: "0" };

export default function Subjects() {
  const qc = useQueryClient();
  const { data: mapelList, isLoading } = useQuery({ queryKey: ["mapel"], queryFn: () => apiGet<MapelOut[]>("/mapel") });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MapelOut | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hapus, setHapus] = useState<MapelOut | null>(null);

  const saveMut = useMutation({
    mutationFn: (f: FormState & { id: string | null }) => {
      const payload = { kode: f.kode, nama: f.nama, kkm: Number(f.kkm) || 0, urutan: Number(f.urutan) || 0 };
      return f.id ? apiPut<MapelOut>(`/mapel/${f.id}`, payload) : apiPost<MapelOut>("/mapel", payload);
    },
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Mapel diperbarui" : "Mapel ditambahkan");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["mapel"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/mapel/${id}`),
    onSuccess: () => {
      toast.success("Mapel dihapus (beserta penugasan & nilainya)");
      setHapus(null);
      qc.invalidateQueries({ queryKey: ["mapel"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (m: MapelOut) => {
    setEditing(m);
    setForm({ kode: m.kode, nama: m.nama, kkm: String(m.kkm), urutan: String(m.urutan) });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nama.trim()) {
      toast.error("Nama mapel wajib diisi");
      return;
    }
    saveMut.mutate({ ...form, id: editing?.id ?? null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Mata Pelajaran</h1>
          <p className="text-sm text-muted-foreground">Atur daftar mapel beserta KKM-nya setiap ada perubahan.</p>
        </div>
        <Button onClick={openCreate} data-testid="mapel-add-btn">
          <Plus className="size-4" /> Tambah Mapel
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Kode</TableHead>
                <TableHead>Nama Mapel</TableHead>
                <TableHead className="w-24">KKM</TableHead>
                <TableHead className="w-24">Urutan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Memuat…</TableCell>
                </TableRow>
              ) : (mapelList ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.kode || "-"}</TableCell>
                  <TableCell className="font-medium" data-testid={`mapel-nama-${m.id}`}>{m.nama}</TableCell>
                  <TableCell>{m.kkm}</TableCell>
                  <TableCell>{m.urutan}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${m.nama}`} onClick={() => openEdit(m)} data-testid={`mapel-edit-btn-${m.id}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${m.nama}`} onClick={() => setHapus(m)} data-testid={`mapel-delete-btn-${m.id}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (mapelList ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">Belum ada mapel.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Mapel" : "Tambah Mapel"}</DialogTitle>
            <DialogDescription>Urutan menentukan susunan mapel pada rapor.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mapel-kode">Kode</Label>
              <Input id="mapel-kode" value={form.kode} onChange={(e) => setForm({ ...form, kode: e.target.value })} placeholder="MTK" data-testid="mapel-kode-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mapel-urutan">Urutan</Label>
              <Input id="mapel-urutan" type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} data-testid="mapel-urutan-input" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="mapel-nama">Nama mapel</Label>
              <Input id="mapel-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Matematika" data-testid="mapel-nama-input" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mapel-kkm">KKM</Label>
              <Input id="mapel-kkm" type="number" value={form.kkm} onChange={(e) => setForm({ ...form, kkm: e.target.value })} data-testid="mapel-kkm-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={saveMut.isPending} data-testid="mapel-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus mapel?"
        description={`Mapel ${hapus?.nama ?? ""} beserta penugasan mengajar dan nilai yang terkait akan dihapus.`}
        onConfirm={() => hapus && delMut.mutate(hapus.id)}
        busy={delMut.isPending}
      />
    </div>
  );
}