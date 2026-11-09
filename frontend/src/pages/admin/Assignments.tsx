import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { KelasOut, MapelOut, PenugasanOut, UserOut } from "@/types";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface FormState {
  guru_id: string;
  mapel_id: string;
  kelas_id: string;
}

const EMPTY: FormState = { guru_id: "", mapel_id: "", kelas_id: "" };

export default function Assignments() {
  const qc = useQueryClient();
  const { data: penugasanList, isLoading } = useQuery({
    queryKey: ["penugasan"],
    queryFn: () => apiGet<PenugasanOut[]>("/penugasan"),
  });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => apiGet<UserOut[]>("/users") });
  const { data: mapelList } = useQuery({ queryKey: ["mapel"], queryFn: () => apiGet<MapelOut[]>("/mapel") });
  const { data: kelasList } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas") });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PenugasanOut | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hapus, setHapus] = useState<PenugasanOut | null>(null);

  const saveMut = useMutation({
    mutationFn: (f: FormState & { id: string | null }) =>
      f.id
        ? apiPut<PenugasanOut>(`/penugasan/${f.id}`, f)
        : apiPost<PenugasanOut>("/penugasan", f),
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Penugasan diperbarui" : "Penugasan ditambahkan");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["penugasan"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/penugasan/${id}`),
    onSuccess: () => {
      toast.success("Penugasan dihapus");
      setHapus(null);
      qc.invalidateQueries({ queryKey: ["penugasan"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (p: PenugasanOut) => {
    setEditing(p);
    setForm({ guru_id: p.guru_id, mapel_id: p.mapel_id, kelas_id: p.kelas_id });
    setOpen(true);
  };

  const submit = () => {
    if (!form.guru_id || !form.mapel_id || !form.kelas_id) {
      toast.error("Lengkapi guru, mapel, dan kelas");
      return;
    }
    saveMut.mutate({ ...form, id: editing?.id ?? null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Penugasan Mengajar</h1>
          <p className="text-sm text-muted-foreground">
            Tentukan guru yang mengajar mapel tertentu di kelas tertentu — guru hanya bisa mengisi nilai sesuai penugasan ini.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="penugasan-add-btn">
          <Plus className="size-4" /> Tambah Penugasan
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guru</TableHead>
                <TableHead>Mata Pelajaran</TableHead>
                <TableHead>Kelas</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">Memuat…</TableCell>
                </TableRow>
              ) : (penugasanList ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium" data-testid={`penugasan-guru-${p.id}`}>{p.guru_nama ?? "-"}</TableCell>
                  <TableCell>{p.mapel_nama ?? "-"}</TableCell>
                  <TableCell>{p.kelas_nama ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label="Edit penugasan" onClick={() => openEdit(p)} data-testid={`penugasan-edit-btn-${p.id}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label="Hapus penugasan" onClick={() => setHapus(p)} data-testid={`penugasan-delete-btn-${p.id}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (penugasanList ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">Belum ada penugasan mengajar.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Penugasan" : "Tambah Penugasan"}</DialogTitle>
            <DialogDescription>Satu mapel satu guru per kelas.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Guru</Label>
              <Select value={form.guru_id} onValueChange={(v: string) => setForm({ ...form, guru_id: v })}>
                <SelectTrigger data-testid="penugasan-guru-select">
                  <SelectValue>
                    {(v: unknown) => (users ?? []).find((u) => u.id === String(v))?.nama ?? "Pilih guru"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mata pelajaran</Label>
              <Select value={form.mapel_id} onValueChange={(v: string) => setForm({ ...form, mapel_id: v })}>
                <SelectTrigger data-testid="penugasan-mapel-select">
                  <SelectValue>
                    {(v: unknown) => (mapelList ?? []).find((m) => m.id === String(v))?.nama ?? "Pilih mapel"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(mapelList ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Kelas</Label>
              <Select value={form.kelas_id} onValueChange={(v: string) => setForm({ ...form, kelas_id: v })}>
                <SelectTrigger data-testid="penugasan-kelas-select">
                  <SelectValue>
                    {(v: unknown) => (kelasList ?? []).find((k) => k.id === String(v))?.nama ?? "Pilih kelas"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(kelasList ?? []).map((k) => (
                    <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={saveMut.isPending} data-testid="penugasan-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus penugasan?"
        description="Nilai yang sudah diinput pada penugasan ini juga akan terhapus."
        onConfirm={() => hapus && delMut.mutate(hapus.id)}
        busy={delMut.isPending}
      />
    </div>
  );
}