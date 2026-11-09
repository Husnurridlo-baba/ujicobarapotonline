import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crown, KeyRound, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { UserOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ConfirmDialog";

/** Hanya dirender untuk admin utama. */
export function AdminAccounts() {
  const qc = useQueryClient();
  const { data: admins } = useQuery({ queryKey: ["users", "admin"], queryFn: () => apiGet<UserOut[]>("/users?role=admin") });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nama: "", username: "", password: "", nip: "" });
  const [hapus, setHapus] = useState<UserOut | null>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["users", "admin"] });

  const addMut = useMutation({
    mutationFn: () => apiPost<UserOut>("/users", { ...form, role: "admin" }),
    onSuccess: () => { toast.success("Admin baru ditambahkan"); setOpen(false); invalidate(); },
    onError: (e) => toast.error(apiErrMsg(e)),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/users/${id}`),
    onSuccess: () => { toast.success("Akun admin dihapus"); setHapus(null); invalidate(); },
    onError: (e) => toast.error(apiErrMsg(e)),
  });
  const resetMut = useMutation({
    mutationFn: (u: UserOut) => {
      const pass = Math.random().toString(36).slice(2, 10) + "A1";
      return apiPut<UserOut>(`/users/${u.id}`, { nama: u.nama, username: u.username, nip: u.nip, password: pass }).then(() => pass);
    },
    onSuccess: (pass, u) => { toast.success(`Password ${u.nama} direset menjadi: ${pass}`, { duration: 12000 }); invalidate(); },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 font-heading text-base"><Crown className="size-4 text-amber-600" /> Akun Admin (Waka Kurikulum)</CardTitle>
            <CardDescription>Hanya admin utama yang dapat menambah, mengganti, atau menghapus admin.</CardDescription>
          </div>
          <Button size="sm" onClick={() => { setForm({ nama: "", username: "", password: "", nip: "" }); setOpen(true); }} data-testid="admin-add-btn">
            <Plus className="size-4" /> Tambah Admin
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow><TableHead>Nama</TableHead><TableHead>Username</TableHead><TableHead>Password</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {(admins ?? []).map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium" data-testid={`admin-nama-${u.id}`}>{u.nama} {u.is_super ? <Badge className="ml-1 bg-amber-100 text-amber-800">Utama</Badge> : null}</TableCell>
                <TableCell className="font-mono text-xs">@{u.username}</TableCell>
                <TableCell className="font-mono text-xs">{u.password}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Reset password ${u.nama}`} onClick={() => resetMut.mutate(u)} data-testid={`admin-reset-btn-${u.id}`}><KeyRound className="size-4" /></Button>
                    {!u.is_super ? (
                      <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${u.nama}`} onClick={() => setHapus(u)} data-testid={`admin-delete-btn-${u.id}`}><Trash2 className="size-4 text-destructive" /></Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Admin</DialogTitle>
            <DialogDescription>Admin baru dapat mengelola seluruh data, kecuali akun admin.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(["nama", "username", "password", "nip"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={`adm-${k}`} className="capitalize">{k === "nip" ? "NIP (opsional)" : k}</Label>
                <Input id={`adm-${k}`} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} data-testid={`admin-${k}-input`} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => (form.nama && form.username && form.password ? addMut.mutate() : toast.error("Nama, username, dan password wajib diisi"))} disabled={addMut.isPending} data-testid="admin-save-btn">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog open={!!hapus} onOpenChange={(o) => !o && setHapus(null)} title="Hapus admin?" description={`Akun ${hapus?.nama ?? ""} tidak akan bisa login lagi.`} onConfirm={() => hapus && delMut.mutate(hapus.id)} busy={delMut.isPending} />
    </Card>
  );
}
