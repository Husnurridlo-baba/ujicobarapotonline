import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { UserOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { AdminAccounts } from "@/components/AdminAccounts";
import { useMe } from "@/lib/session";

interface FormState {
  nama: string;
  username: string;
  nip: string;
  password: string;
}

const EMPTY: FormState = { nama: "", username: "", nip: "", password: "" };

const randomPassword = () => Math.random().toString(36).slice(2, 10) + "A1";

export default function Teachers() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const { data: users, isLoading } = useQuery({ queryKey: ["users"], queryFn: () => apiGet<UserOut[]>("/users") });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserOut | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [hapus, setHapus] = useState<UserOut | null>(null);
  const [resetTarget, setResetTarget] = useState<UserOut | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["users"] });

  const saveMut = useMutation({
    mutationFn: (f: FormState & { id: string | null }) =>
      f.id
        ? apiPut<UserOut>(`/users/${f.id}`, { nama: f.nama, username: f.username, nip: f.nip, password: f.password || null })
        : apiPost<UserOut>("/users", { nama: f.nama, username: f.username, nip: f.nip, password: f.password }),
    onSuccess: (_d, f) => {
      toast.success(f.id ? "Data guru diperbarui" : "Guru ditambahkan");
      setOpen(false);
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/users/${id}`),
    onSuccess: () => {
      toast.success("Guru dihapus");
      setHapus(null);
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const resetMut = useMutation({
    mutationFn: (u: UserOut) => {
      const pass = randomPassword();
      return apiPut<UserOut>(`/users/${u.id}`, { nama: u.nama, username: u.username, nip: u.nip, password: pass }).then(() => pass);
    },
    onSuccess: (pass, u) => {
      toast.success(`Password ${u.nama} direset menjadi: ${pass}`, { duration: 12000 });
      setResetTarget(null);
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  };

  const openEdit = (u: UserOut) => {
    setEditing(u);
    setForm({ nama: u.nama, username: u.username, nip: u.nip, password: "" });
    setOpen(true);
  };

  const submit = () => {
    if (!form.nama.trim() || !form.username.trim() || (!editing && !form.password)) {
      toast.error("Nama, username, dan password wajib diisi");
      return;
    }
    saveMut.mutate({ ...form, id: editing?.id ?? null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Manajemen Guru</h1>
          <p className="text-sm text-muted-foreground">Tambah guru, lihat & reset password. Guru bisa login dengan akunnya.</p>
        </div>
        <Button onClick={openCreate} data-testid="guru-add-btn">
          <Plus className="size-4" /> Tambah Guru
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>NIP</TableHead>
                <TableHead>Password</TableHead>
                <TableHead>Wali Kelas</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Memuat…
                  </TableCell>
                </TableRow>
              ) : (users ?? []).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium" data-testid={`guru-nama-${u.id}`}>{u.nama}</TableCell>
                  <TableCell className="font-mono text-xs">@{u.username}</TableCell>
                  <TableCell className="text-sm">{u.nip || "-"}</TableCell>
                  <TableCell>
                    <span className="font-mono text-xs" data-testid={`guru-password-${u.id}`}>{u.password}</span>
                  </TableCell>
                  <TableCell>
                    {u.is_wali ? (
                      <Badge className="bg-indigo-100 text-indigo-800">Wali Kelas</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" aria-label={`Reset password ${u.nama}`} onClick={() => setResetTarget(u)} data-testid={`reset-teacher-password-btn-${u.id}`}>
                        <KeyRound className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Edit ${u.nama}`} onClick={() => openEdit(u)} data-testid={`guru-edit-btn-${u.id}`}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${u.nama}`} onClick={() => setHapus(u)} data-testid={`guru-delete-btn-${u.id}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (users ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    Belum ada guru. Tambahkan guru pertama Anda.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {me?.is_super ? <AdminAccounts /> : null}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Guru" : "Tambah Guru"}</DialogTitle>
            <DialogDescription>
              {editing ? "Kosongkan password bila tidak ingin mengubahnya." : "Password awal dibuat oleh admin dan dapat direset kapan saja."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="guru-nama">Nama lengkap</Label>
              <Input id="guru-nama" value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="Nama guru, gelar" data-testid="guru-nama-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="guru-username">Username</Label>
                <Input id="guru-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="username" data-testid="guru-username-input" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guru-nip">NIP (opsional)</Label>
                <Input id="guru-nip" value={form.nip} onChange={(e) => setForm({ ...form, nip: e.target.value })} placeholder="NIP" data-testid="guru-nip-input" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="guru-password">{editing ? "Password baru (opsional)" : "Password"}</Label>
              <Input id="guru-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="min. 6 karakter" data-testid="guru-password-input" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={saveMut.isPending} data-testid="guru-save-btn">
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus guru?"
        description={`Akun ${hapus?.nama ?? ""} beserta penugasan mengajarnya akan dihapus.`}
        onConfirm={() => hapus && delMut.mutate(hapus.id)}
        busy={delMut.isPending}
      />

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(o) => !o && setResetTarget(null)}
        title="Reset password?"
        description={`Password ${resetTarget?.nama ?? ""} akan diganti dengan password acak baru yang akan ditampilkan setelah proses.`}
        confirmLabel="Ya, Reset"
        onConfirm={() => resetTarget && resetMut.mutate(resetTarget)}
        busy={resetMut.isPending}
      />
    </div>
  );
}