import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Loader2, RefreshCw } from "lucide-react";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { EmisStatus, EmisSyncResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// Upload multipart lewat path relatif /api (apiPost hanya JSON). Cookie sesi ikut otomatis.
async function uploadEmis(file: File): Promise<EmisSyncResult> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/emis/import", { method: "POST", body: fd });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body as EmisSyncResult;
}

export function EmisSyncDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [hasil, setHasil] = useState<string>("");
  const { data: status } = useQuery({ queryKey: ["emisStatus"], queryFn: () => apiGet<EmisStatus>("/emis/status"), enabled: open });

  const done = (r: EmisSyncResult) => {
    setHasil(r.keterangan);
    toast.success(`Sinkron EMIS selesai: ${r.keterangan}`);
    qc.invalidateQueries({ queryKey: ["siswa"] });
  };
  const importMut = useMutation({ mutationFn: uploadEmis, onSuccess: done, onError: (e) => toast.error(apiErrMsg(e)) });
  const syncMut = useMutation({ mutationFn: () => apiPost<EmisSyncResult>("/emis/sync"), onSuccess: done, onError: (e) => toast.error(apiErrMsg(e)) });
  const busy = importMut.isPending || syncMut.isPending;

  return (
    <>
      <Button variant="outline" onClick={() => { setHasil(""); setOpen(true); }} data-testid="emis-sync-open-btn">
        <RefreshCw className="size-4" /> Sinkron EMIS
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sinkron Data Siswa EMIS</DialogTitle>
            <DialogDescription>Siswa dicocokkan berdasarkan NISN/NISM: yang sudah ada diperbarui, yang baru ditambahkan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">1. Impor file ekspor EMIS</p>
              <p className="mb-2 text-xs text-muted-foreground">Unduh data peserta didik dari EMIS (Excel/CSV), lalu unggah di sini. Kolom: Nama, NISN, NISM, JK, Tempat/Tanggal Lahir, Alamat, Rombel.</p>
              <Label htmlFor="emis-file" className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90" data-testid="emis-import-btn">
                {importMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />} Pilih File
              </Label>
              <input id="emis-file" type="file" accept=".xlsx,.xls,.csv" className="sr-only" disabled={busy} data-testid="emis-file-input"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importMut.mutate(f); e.target.value = ""; }} />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-sm font-semibold">2. Tarik langsung dari akun EMIS</p>
              <p className="mb-2 text-xs text-muted-foreground" data-testid="emis-status-text">{status?.keterangan ?? "Memeriksa…"}</p>
              <Button size="sm" variant="outline" onClick={() => syncMut.mutate()} disabled={busy || !status?.terkonfigurasi} data-testid="emis-sync-direct-btn">
                {syncMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sinkron Sekarang
              </Button>
            </div>
            {hasil ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="emis-hasil-text">{hasil}</p> : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
