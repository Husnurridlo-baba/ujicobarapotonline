import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { SettingsOut, TahunOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function AcademicYear() {
  const qc = useQueryClient();
  const { data: tahunList } = useQuery({ queryKey: ["tahun"], queryFn: () => apiGet<TahunOut[]>("/tahun") });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });

  const [nama, setNama] = useState("");
  const [hapus, setHapus] = useState<TahunOut | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tahun"] });
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  const addMut = useMutation({
    mutationFn: () => apiPost<TahunOut>("/tahun", { nama }),
    onSuccess: () => {
      toast.success("Tahun pelajaran ditambahkan");
      setNama("");
      qc.invalidateQueries({ queryKey: ["tahun"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const aktifkanMut = useMutation({
    mutationFn: (id: string) => apiPost<SettingsOut>(`/tahun/${id}/aktifkan`),
    onSuccess: () => {
      toast.success("Tahun pelajaran aktif diperbarui");
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const semesterMut = useMutation({
    mutationFn: (semester: string) => apiPut<SettingsOut>("/settings", { semester_aktif: semester }),
    onSuccess: () => {
      toast.success("Semester aktif diperbarui");
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiDelete(`/tahun/${id}`),
    onSuccess: () => {
      toast.success("Tahun pelajaran dihapus");
      setHapus(null);
      invalidate();
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Tahun &amp; Semester</h1>
        <p className="text-sm text-muted-foreground">Atur tahun pelajaran dan semester yang sedang aktif.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Semester Aktif</CardTitle>
          <CardDescription>
            Status sekarang: {settings?.tahun_aktif ? `TP ${settings.tahun_aktif}` : "tahun pelajaran belum diatur"} ·{" "}
            {settings?.semester_aktif === "genap" ? "Semester Genap" : "Semester Ganjil"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          {(["ganjil", "genap"] as const).map((s) => (
            <Button
              key={s}
              variant={settings?.semester_aktif === s ? "default" : "outline"}
              size="sm"
              onClick={() => semesterMut.mutate(s)}
              disabled={semesterMut.isPending}
              data-testid={`semester-${s}-btn`}
            >
              {settings?.semester_aktif === s ? <Check className="size-4" /> : null}
              Semester {s === "ganjil" ? "Ganjil" : "Genap"}
            </Button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Daftar Tahun Pelajaran</CardTitle>
          <CardDescription>Tambahkan tahun pelajaran baru, mis. 2026/2027.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder="2026/2027"
              className="max-w-48"
              data-testid="tahun-nama-input"
            />
            <Button
              size="sm"
              onClick={() => (nama.trim() ? addMut.mutate() : toast.error("Isi nama tahun pelajaran"))}
              disabled={addMut.isPending}
              data-testid="tahun-add-btn"
            >
              <Plus className="size-4" /> Tambah
            </Button>
          </div>
          <div className="divide-y rounded-lg border">
            {(tahunList ?? []).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium" data-testid={`tahun-nama-${t.id}`}>
                    {t.nama}
                  </span>
                  {t.aktif ? (
                    <Badge className="bg-emerald-100 text-emerald-800" data-testid={`tahun-aktif-badge-${t.id}`}>
                      Aktif
                    </Badge>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {!t.aktif ? (
                    <Button variant="outline" size="sm" onClick={() => aktifkanMut.mutate(t.id)} disabled={aktifkanMut.isPending} data-testid={`tahun-aktifkan-btn-${t.id}`}>
                      Jadikan Aktif
                    </Button>
                  ) : null}
                  {!t.aktif ? (
                    <Button variant="ghost" size="icon-sm" aria-label={`Hapus ${t.nama}`} onClick={() => setHapus(t)} data-testid={`tahun-delete-btn-${t.id}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
            {(tahunList ?? []).length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">Belum ada tahun pelajaran.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!hapus}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus tahun pelajaran?"
        description={`Tahun pelajaran ${hapus?.nama ?? ""} akan dihapus. Data nilai pada tahun ini tidak ikut terhapus.`}
        onConfirm={() => hapus && delMut.mutate(hapus.id)}
        busy={delMut.isPending}
      />
    </div>
  );
}