import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import { useMe } from "@/lib/session";
import type { SettingsOut, SiswaOut, WaliEntryPayload, WaliOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type RowState = {
  sakit: string;
  izin: string;
  alpa: string;
  ekskul_nama: string;
  ekskul_predikat: string;
  ekskul_keterangan: string;
  keputusan: string;
  catatan: string;
};

const EMPTY_ROW: RowState = { sakit: "", izin: "", alpa: "", ekskul_nama: "", ekskul_predikat: "none", ekskul_keterangan: "", keputusan: "none", catatan: "" };

const toInt = (s: string): number => (s.trim() === "" ? 0 : Math.max(0, Math.floor(Number(s) || 0)));

export default function HomeroomData() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const kelasId = me?.kelas_wali?.id ?? "";
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });
  const tahun = settings?.tahun_aktif ?? "";

  const [semester, setSemester] = useState("");
  useEffect(() => {
    if (settings && !semester) setSemester(settings.semester_aktif || "ganjil");
  }, [settings, semester]);

  const { data: siswaList } = useQuery({
    queryKey: ["siswa", kelasId],
    queryFn: () => apiGet<SiswaOut[]>(`/siswa?kelas_id=${kelasId}&status=aktif`),
    enabled: !!kelasId,
  });

  const { data: waliList } = useQuery({
    queryKey: ["waliRapot", kelasId, tahun, semester],
    queryFn: () =>
      apiGet<WaliOut[]>(`/wali/rapot?kelas_id=${kelasId}&tahun=${encodeURIComponent(tahun)}&semester=${semester}`),
    enabled: !!kelasId && !!tahun && !!semester,
  });

  const [rows, setRows] = useState<Record<string, RowState>>({});

  useEffect(() => {
    if (!waliList || !siswaList) return;
    const existing = new Map(waliList.map((w) => [w.siswa_id, w]));
    const next: Record<string, RowState> = {};
    for (const s of siswaList) {
      const w = existing.get(s.id);
      next[s.id] = w
        ? {
            sakit: String(w.sakit ?? 0),
            izin: String(w.izin ?? 0),
            alpa: String(w.alpa ?? 0),
            ekskul_nama: w.ekskul_nama ?? "",
            ekskul_predikat: w.ekskul_predikat || "none",
            ekskul_keterangan: w.ekskul_keterangan ?? "",
            keputusan: w.keputusan || "none",
            catatan: w.catatan ?? "",
          }
        : { ...EMPTY_ROW };
    }
    setRows(next);
  }, [waliList, siswaList]);

  const saveMut = useMutation({
    mutationFn: () => {
      const entries: WaliEntryPayload[] = (siswaList ?? []).map((s) => {
        const r = rows[s.id] ?? EMPTY_ROW;
        return {
          siswa_id: s.id,
          sakit: toInt(r.sakit),
          izin: toInt(r.izin),
          alpa: toInt(r.alpa),
          ekskul_nama: r.ekskul_nama,
          ekskul_predikat: r.ekskul_predikat === "none" ? "" : r.ekskul_predikat,
          ekskul_keterangan: r.ekskul_keterangan,
          keputusan: r.keputusan === "none" ? "" : r.keputusan,
          catatan: r.catatan,
        };
      });
      return apiPost<{ saved: number }>("/wali/rapot/save", { kelas_id: kelasId, tahun, semester, entries });
    },
    onSuccess: (d) => {
      toast.success(`Data wali kelas tersimpan (${d.saved} siswa)`);
      qc.invalidateQueries({ queryKey: ["waliRapot", kelasId, tahun, semester] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const setRow = (siswaId: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [siswaId]: { ...(prev[siswaId] ?? EMPTY_ROW), ...patch } }));

  if (!kelasId) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Data Wali Kelas {me?.kelas_wali?.nama ?? ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Isi absensi (S/I/A), ekstrakurikuler, keputusan kenaikan, dan catatan wali kelas per semester.
        </p>
      </div>

      {!tahun ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            Tahun pelajaran aktif belum diatur oleh Waka Kurikulum.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Semester</p>
                <Select value={semester} onValueChange={(v: string) => setSemester(v)}>
                  <SelectTrigger className="w-40" data-testid="wali-semester-select">
                    <SelectValue>{(v: unknown) => (String(v) === "genap" ? "Genap (2)" : "Ganjil (1)")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ganjil">Ganjil (1)</SelectItem>
                    <SelectItem value="genap">Genap (2)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="ml-auto text-xs text-muted-foreground">TP {tahun}</p>
            </div>
            <CardDescription>Keputusan diisi saat semester genap (naik kelas / lulus).</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Siswa</TableHead>
                  <TableHead className="w-16">S</TableHead>
                  <TableHead className="w-16">I</TableHead>
                  <TableHead className="w-16">A</TableHead>
                  <TableHead>Ekskul</TableHead>
                  <TableHead className="w-24">Predikat</TableHead>
                  <TableHead>Ket. Ekskul</TableHead>
                  <TableHead className="w-32">Keputusan</TableHead>
                  <TableHead>Catatan Wali Kelas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(siswaList ?? []).map((s) => {
                  const r = rows[s.id] ?? EMPTY_ROW;
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium" data-testid={`wali-nama-${s.id}`}>{s.nama}</TableCell>
                      <TableCell>
                        <Input type="number" min={0} value={r.sakit} onChange={(e) => setRow(s.id, { sakit: e.target.value })} className="w-14" data-testid={`wali-sakit-input-${s.id}`} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} value={r.izin} onChange={(e) => setRow(s.id, { izin: e.target.value })} className="w-14" data-testid={`wali-izin-input-${s.id}`} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} value={r.alpa} onChange={(e) => setRow(s.id, { alpa: e.target.value })} className="w-14" data-testid={`wali-alpa-input-${s.id}`} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.ekskul_nama} onChange={(e) => setRow(s.id, { ekskul_nama: e.target.value })} className="w-32" placeholder="Pramuka" data-testid={`wali-ekskul-input-${s.id}`} />
                      </TableCell>
                      <TableCell>
                        <Select value={r.ekskul_predikat} onValueChange={(v: string) => setRow(s.id, { ekskul_predikat: v })}>
                          <SelectTrigger size="sm" className="w-20" data-testid={`wali-predikat-select-${s.id}`}>
                            <SelectValue>{(v: unknown) => (String(v) === "none" ? "-" : String(v))}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={r.ekskul_keterangan} onChange={(e) => setRow(s.id, { ekskul_keterangan: e.target.value })} className="w-36" placeholder="Keterangan" data-testid={`wali-ekskul-ket-input-${s.id}`} />
                      </TableCell>
                      <TableCell>
                        <Select value={r.keputusan} onValueChange={(v: string) => setRow(s.id, { keputusan: v })}>
                          <SelectTrigger size="sm" className="w-28" data-testid={`wali-keputusan-select-${s.id}`}>
                            <SelectValue>
                              {(v: unknown) =>
                                String(v) === "naik" ? "Naik" : String(v) === "tinggal" ? "Tinggal" : String(v) === "lulus" ? "Lulus" : "-"
                              }
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="naik">Naik</SelectItem>
                            <SelectItem value="tinggal">Tinggal</SelectItem>
                            <SelectItem value="lulus">Lulus</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input value={r.catatan} onChange={(e) => setRow(s.id, { catatan: e.target.value })} className="w-56" placeholder="Catatan untuk ananda…" data-testid={`wali-catatan-input-${s.id}`} />
                      </TableCell>
                    </TableRow>
                  );
                })}
                {(siswaList ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-sm text-muted-foreground">
                      Belum ada siswa aktif di kelas Anda.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
            <div className="mt-4">
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !semester} data-testid="save-wali-btn">
                <Save className="size-4" /> Simpan Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}