import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { KelasOut, UserOut } from "@/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";

interface FormState {
  nama: string;
  tingkat: string;
  wali_kelas_id: string;
}

const TINGKAT_LABEL: Record<string, string> = { "1": "Kelas 10", "2": "Kelas 11", "3": "Kelas 12" };

export default function Classes() {
  const qc = useQueryClient();
  const { data: kelasList, isLoading } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => apiGet<UserOut[]>("/users") });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<KelasOut | null>(null);
  const [form, setForm] = useState<FormState>({ nama: "", tingkat: "1", wali_kelas_id: "none" });
  const [hapus, setHapus] = useState<KelasOut | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["kelas"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const saveMut = useMutation({
    mutationFn: (f: FormState & { id: string | null }) => {
      const payload = {
        nama: f.nama,
        tingkat: Number(f.tingkat),
        wali_kelas_id: f.wali_kelas_id === "none" ? null : f.wali_kelas_id,
      };
      return f.id ? apiPut<KelasOut>(`/kelas/${f.id}`, payload) : apiPost<KelasOut>("/kelas", payload);
    },
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Kelas diperbarui" : "Kelas ditambahkan");
      setOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/kelas/${id}`),
    onSuccess: () => {
      toast.success("Kelas dihapus");
      setHapus(null);
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ nama: "", tingkat: "1", wali_kelas_id: "none" });
    setOpen(true);
  };

  const openEdit = (k: KelasOut) => {
    setEditing(k);
    setForm({ nama: k.nama, tingkat: String(k.tingkat), wali_kelas_id: k.wali_kelas_id ?? "none" });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nama.trim()) {
      toast.error("Nama kelas wajib diisi");
      return;
    }
    saveMut.mutate({ ...form, id: editing?.id ?? null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Kelas &amp; Wali Kelas</h1>
          <p className="text-sm text-muted-foreground">
            Tetapkan wali kelas — menu wali kelas hanya muncul bagi guru yang ditunjuk di sini.
          </p>
        </div>
        <Button onClick={openCreate} data-testid="kelas-add-btn">
          <Plus className="size-4" /> Tambah Kelas
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kelas</TableHead>
                <TableHead>Tingkat</TableHead>
                <TableHead>Wali Kelas</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">Memuat…</TableCell>
                </TableRow>
              ) : (kelasList ?? []).map((k) => (
                <TableRow key={k.id}>
                  <TableCell className="font-medium" data-testid={`kelas-nama-${k.id}`}>{k.nama}</TableCell>
                  <TableCell>{TINGKAT_LABEL[String(k.tingkat)] ?? k.tingkat}</TableCell>
                  <TableCell>
                    {k.wali_nama ? (
                      <span data-testid={`kelas-wali-${k.id}`}>{k.wali_nama}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Belum ada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${k.nama}`} onClick={() => openEdit(k)} data-testid={`kelas-edit-btn-${k.id}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${k.nama}`} onClick={() => setHapus(k)} data-testid={`kelas-delete-btn-${k.id}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (kelasList ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-sm text-muted-foreground">Belum ada kelas.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>Gunakan penamaan konsisten, mis. X-A, XI-A, XII-A.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="kelas-nama">Nama kelas</Label>
                <Input id="kelas-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="X-A" data-testid="kelas-nama-input" />
              </div>
              <div className="space-y-1.5">
                <Label>Tingkat</Label>
                <Select value={form.tingkat} onValueChange={(v: string) => setForm({ ...form, tingkat: v })}>
                  <SelectTrigger data-testid="kelas-tingkat-select">
                    <SelectValue>{(v) => TINGKAT_LABEL[String(v)] ?? "Pilih tingkat"}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Kelas 10</SelectItem>
                    <SelectItem value="2">Kelas 11</SelectItem>
                    <SelectItem value="3">Kelas 12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Wali kelas</Label>
              <Select value={form.wali_kelas_id} onValueChange={(v: string) => setForm({ ...form, wali_kelas_id: v })}>
                <SelectTrigger data-testid="kelas-wali-select">
                  <SelectValue>
                    {(v) =>
                      String(v) === "none"
                        ? "Belum ditunjuk"
                        : (users ?? []).find((u) => u.id === v)?.nama ?? "Pilih guru"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Belum ditunjuk</SelectItem>
                  {(users ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={saveMut.isPending} data-testid="kelas-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus kelas?"
        description={`Kelas ${hapus?.nama ?? ""} beserta penugasan mengajarnya akan dihapus. Kelas dengan siswa aktif tidak bisa dihapus.`}
        onConfirm={() => hapus && delMut.mutate(hapus.id)}
        busy={delMut.isPending}
      />
    </div>
  );
}