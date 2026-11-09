import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Eye, LockOpen, Undo2 } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import { fmtNilai } from "@/lib/format";
import type { BobotOut, NilaiOut, RekapRow, SettingsOut, SiswaOut, StatusNilaiOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/StatusBadge";

export default function ReviewNilai() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });
  const tahun = settings?.tahun_aktif ?? "";
  const [semester, setSemester] = useState("");
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<RekapRow | null>(null);
  const [catatan, setCatatan] = useState("");

  useEffect(() => {
    if (settings && !semester) setSemester(settings.semester_aktif || "ganjil");
  }, [settings, semester]);

  const { data: rekap, isLoading } = useQuery({
    queryKey: ["rekap", tahun, semester],
    queryFn: () => apiGet<RekapRow[]>(`/nilai/rekap?tahun=${encodeURIComponent(tahun)}&semester=${semester}`),
    enabled: !!tahun && !!semester,
  });

  const qs = open ? `penugasan_id=${open.penugasan_id}&tahun=${encodeURIComponent(tahun)}&semester=${semester}` : "";
  const { data: nilai } = useQuery({ queryKey: ["nilai", open?.penugasan_id, tahun, semester], queryFn: () => apiGet<NilaiOut[]>(`/nilai?${qs}`), enabled: !!open });
  const { data: bobot } = useQuery({ queryKey: ["bobot", open?.penugasan_id, tahun, semester], queryFn: () => apiGet<BobotOut>(`/bobot?${qs}`), enabled: !!open });
  const { data: siswa } = useQuery({ queryKey: ["siswa", "all-active"], queryFn: () => apiGet<SiswaOut[]>("/siswa?status=aktif"), enabled: !!open });
  const namaSiswa = new Map((siswa ?? []).map((s) => [s.id, s.nama]));

  const reviuMut = useMutation({
    mutationFn: (aksi: "setujui" | "revisi" | "buka") =>
      apiPost<StatusNilaiOut>("/nilai/reviu", { penugasan_id: open!.penugasan_id, tahun, semester, aksi, catatan }),
    onSuccess: (r) => {
      toast.success(r.status === "terkunci" ? "Nilai disetujui & dikunci — diteruskan ke wali kelas" : "Nilai dikembalikan ke guru untuk diperbaiki");
      setOpen(null);
      setCatatan("");
      qc.invalidateQueries({ queryKey: ["rekap", tahun, semester] });
      qc.invalidateQueries({ queryKey: ["nilaiStatus"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const rows = (rekap ?? []).filter((r) => filter === "all" || r.status === filter);
  const count = (s: string) => (rekap ?? []).filter((r) => r.status === s).length;
  const total = rekap?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Rekap &amp; Reviu Nilai</h1>
        <p className="text-sm text-muted-foreground">Pantau progres input nilai, reviu kiriman guru, kembalikan bila salah, atau setujui untuk dikunci.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["draft", "Draf / Belum kirim"], ["dikirim", "Menunggu Reviu"], ["revisi", "Perlu Revisi"], ["terkunci", "Terkunci"]].map(([k, l]) => (
          <Card key={k} className="cursor-pointer transition-shadow duration-150 hover:shadow-md" onClick={() => setFilter(filter === k ? "all" : k)} data-testid={`rekap-card-${k}`}>
            <CardContent className="pt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{l}</p>
              <p className="font-heading text-2xl font-bold" data-testid={`rekap-count-${k}`}>{count(k)}<span className="text-sm font-normal text-muted-foreground"> / {total}</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={semester} onValueChange={(v: string) => setSemester(v)}>
          <SelectTrigger className="w-40" data-testid="rekap-semester-select">
            <SelectValue>{(v: unknown) => (String(v) === "genap" ? "Semester Genap" : "Semester Ganjil")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ganjil">Semester Ganjil</SelectItem>
            <SelectItem value="genap">Semester Genap</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">TP {tahun} {filter !== "all" ? "· filter aktif (klik kartu lagi untuk reset)" : ""}</span>
      </div>

      <Card>
        <CardContent className="pt-5">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kelas</TableHead>
                <TableHead>Mapel</TableHead>
                <TableHead>Guru</TableHead>
                <TableHead>Progres</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : rows.map((r) => {
                const pct = r.total ? Math.round((r.terisi / r.total) * 100) : 0;
                return (
                  <TableRow key={r.penugasan_id}>
                    <TableCell>{r.kelas_nama}</TableCell>
                    <TableCell className="font-medium">{r.mapel_nama}</TableCell>
                    <TableCell className="text-sm">{r.guru_nama}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full bg-emerald-600 transition-[width] duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`rekap-progres-${r.penugasan_id}`}>{r.terisi}/{r.total}</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} testid={`rekap-status-${r.penugasan_id}`} /></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => { setOpen(r); setCatatan(""); }} data-testid={`rekap-review-btn-${r.penugasan_id}`}>
                        <Eye className="size-4" /> Reviu
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && rows.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Tidak ada data.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{open?.mapel_nama} — {open?.kelas_nama}</DialogTitle>
            <DialogDescription>
              {open?.guru_nama} · Bobot TS {bobot?.tengah.harian}/{bobot?.tengah.tengah} · AS {bobot?.akhir.harian}/{bobot?.akhir.tengah}/{bobot?.akhir.akhir}
              {bobot && !bobot.tersimpan ? " (belum diatur guru)" : ""}
            </DialogDescription>
          </DialogHeader>
          {open ? <StatusBadge status={open.status} /> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Siswa</TableHead>
                <TableHead>Harian</TableHead>
                <TableHead>NTS</TableHead>
                <TableHead>NAS</TableHead>
                <TableHead>Rapor TS</TableHead>
                <TableHead>Rapor AS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(nilai ?? []).map((x) => (
                <TableRow key={x.id}>
                  <TableCell className="text-sm">{namaSiswa.get(x.siswa_id) ?? "-"}</TableCell>
                  <TableCell>{fmtNilai(x.nilai_harian)}</TableCell>
                  <TableCell>{fmtNilai(x.nilai_tengah)}</TableCell>
                  <TableCell>{fmtNilai(x.nilai_akhir)}</TableCell>
                  <TableCell>{fmtNilai(x.rapot_tengah)}</TableCell>
                  <TableCell className="font-semibold">{fmtNilai(x.rapot_akhir)}</TableCell>
                </TableRow>
              ))}
              {(nilai ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">Belum ada nilai.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan untuk guru (wajib jika dikembalikan), mis. nilai NAS siswa X belum diisi" data-testid="reviu-catatan-input" />
          <DialogFooter className="flex-wrap gap-2">
            {open?.status === "terkunci" ? (
              <Button variant="outline" onClick={() => reviuMut.mutate("buka")} disabled={reviuMut.isPending} data-testid="reviu-buka-btn">
                <LockOpen className="size-4" /> Buka Kunci
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => (catatan.trim() ? reviuMut.mutate("revisi") : toast.error("Tuliskan catatan revisi"))} disabled={reviuMut.isPending} data-testid="reviu-revisi-btn">
                  <Undo2 className="size-4" /> Kembalikan ke Guru
                </Button>
                <Button onClick={() => reviuMut.mutate("setujui")} disabled={reviuMut.isPending || (nilai ?? []).length === 0} data-testid="reviu-setujui-btn">
                  <CheckCircle2 className="size-4" /> Setujui &amp; Kunci
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
