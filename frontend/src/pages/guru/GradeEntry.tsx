import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, Scale, Send } from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import { fmtNilai } from "@/lib/format";
import { useMe } from "@/lib/session";
import type { BobotOut, NilaiOut, PenugasanOut, SettingsOut, SiswaOut, StatusNilaiOut } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type RowState = { nilai_harian: string; nilai_tengah: string; nilai_akhir: string };
const EMPTY_ROW: RowState = { nilai_harian: "", nilai_tengah: "", nilai_akhir: "" };
type BobotForm = { th: string; tt: string; ah: string; at: string; aa: string };

const validNilai = (s: string): boolean => {
  if (!s.trim()) return true;
  const v = Number(s);
  return Number.isFinite(v) && v >= 0 && v <= 100;
};
const toNum = (s: string): number | null => (s.trim() === "" ? null : Number(s));
const n = (s: string) => Number(s) || 0;

function calc(r: RowState, b: BobotForm): { rt: number | null; ra: number | null } {
  const h = toNum(r.nilai_harian), t = toNum(r.nilai_tengah), a = toNum(r.nilai_akhir);
  const rt = h !== null && t !== null ? (h * n(b.th) + t * n(b.tt)) / 100 : null;
  const ra = h !== null && t !== null && a !== null ? (h * n(b.ah) + t * n(b.at) + a * n(b.aa)) / 100 : null;
  return { rt: rt === null ? null : Math.round(rt * 100) / 100, ra: ra === null ? null : Math.round(ra * 100) / 100 };
}

export default function GradeEntry() {
  const qc = useQueryClient();
  const { data: me } = useMe();
  const [params] = useSearchParams();
  const { data: penugasanList, isLoading: loadingPenugasan } = useQuery({
    queryKey: ["penugasan"],
    queryFn: () => apiGet<PenugasanOut[]>("/penugasan"),
  });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });

  const [penugasanId, setPenugasanId] = useState(params.get("penugasan") ?? "");
  const [semester, setSemester] = useState("");
  const [kirimOpen, setKirimOpen] = useState(false);

  useEffect(() => {
    if (settings && !semester) setSemester(settings.semester_aktif || "ganjil");
  }, [settings, semester]);
  useEffect(() => {
    if (penugasanList?.length && !penugasanId) setPenugasanId(penugasanList[0].id);
  }, [penugasanList, penugasanId]);

  const penugasan = penugasanList?.find((p) => p.id === penugasanId) ?? null;
  const tahun = settings?.tahun_aktif ?? "";
  const ready = !!penugasanId && !!tahun && !!semester;
  const keyQs = `penugasan_id=${penugasanId}&tahun=${encodeURIComponent(tahun)}&semester=${semester}`;

  const { data: siswaList } = useQuery({
    queryKey: ["siswa", penugasan?.kelas_id ?? null],
    queryFn: () => apiGet<SiswaOut[]>(`/siswa?kelas_id=${penugasan!.kelas_id}&status=aktif`),
    enabled: !!penugasan,
  });
  const { data: nilaiList } = useQuery({
    queryKey: ["nilai", penugasanId, tahun, semester],
    queryFn: () => apiGet<NilaiOut[]>(`/nilai?${keyQs}`),
    enabled: ready,
  });
  const { data: bobot } = useQuery({
    queryKey: ["bobot", penugasanId, tahun, semester],
    queryFn: () => apiGet<BobotOut>(`/bobot?${keyQs}`),
    enabled: ready,
  });
  const { data: status } = useQuery({
    queryKey: ["nilaiStatus", penugasanId, tahun, semester],
    queryFn: () => apiGet<StatusNilaiOut>(`/nilai/status?${keyQs}`),
    enabled: ready,
  });

  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [bf, setBf] = useState<BobotForm>({ th: "40", tt: "60", ah: "30", at: "30", aa: "40" });

  useEffect(() => {
    if (!nilaiList) return;
    const next: Record<string, RowState> = {};
    for (const x of nilaiList) {
      next[x.siswa_id] = {
        nilai_harian: x.nilai_harian === null ? "" : String(x.nilai_harian),
        nilai_tengah: x.nilai_tengah === null ? "" : String(x.nilai_tengah),
        nilai_akhir: x.nilai_akhir === null ? "" : String(x.nilai_akhir),
      };
    }
    setRows(next);
  }, [nilaiList]);

  useEffect(() => {
    if (!bobot) return;
    setBf({
      th: String(bobot.tengah.harian), tt: String(bobot.tengah.tengah),
      ah: String(bobot.akhir.harian), at: String(bobot.akhir.tengah), aa: String(bobot.akhir.akhir),
    });
  }, [bobot]);

  const locked = status?.status === "dikirim" || status?.status === "terkunci";
  const bobotSaved = !!bobot?.tersimpan;
  const sumT = n(bf.th) + n(bf.tt);
  const sumA = n(bf.ah) + n(bf.at) + n(bf.aa);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["nilai", penugasanId, tahun, semester] });
    qc.invalidateQueries({ queryKey: ["bobot", penugasanId, tahun, semester] });
    qc.invalidateQueries({ queryKey: ["nilaiStatus", penugasanId, tahun, semester] });
  };

  const bobotMut = useMutation({
    mutationFn: () =>
      apiPut<BobotOut>("/bobot", {
        penugasan_id: penugasanId, tahun, semester,
        tengah: { harian: n(bf.th), tengah: n(bf.tt) },
        akhir: { harian: n(bf.ah), tengah: n(bf.at), akhir: n(bf.aa) },
      }),
    onSuccess: () => { toast.success("Bobot nilai disimpan"); invalidate(); },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const saveMut = useMutation({
    mutationFn: () =>
      apiPost<{ saved: number }>("/nilai/save", {
        penugasan_id: penugasanId, tahun, semester,
        entries: (siswaList ?? []).map((s) => {
          const r = rows[s.id] ?? EMPTY_ROW;
          return { siswa_id: s.id, nilai_harian: toNum(r.nilai_harian), nilai_tengah: toNum(r.nilai_tengah), nilai_akhir: toNum(r.nilai_akhir) };
        }),
      }),
    onSuccess: (d) => { toast.success(`Nilai tersimpan untuk ${d.saved} siswa`); invalidate(); },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const kirimMut = useMutation({
    mutationFn: () => apiPost<StatusNilaiOut>("/nilai/kirim", { penugasan_id: penugasanId, tahun, semester }),
    onSuccess: () => { toast.success("Nilai dikirim ke Waka Kurikulum untuk direviu"); setKirimOpen(false); invalidate(); },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const handleSave = () => {
    for (const s of siswaList ?? []) {
      const r = rows[s.id];
      if (r && (!validNilai(r.nilai_harian) || !validNilai(r.nilai_tengah) || !validNilai(r.nilai_akhir))) {
        toast.error(`Nilai untuk ${s.nama} harus angka 0–100`);
        return;
      }
    }
    saveMut.mutate();
  };

  const setRow = (id: string, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_ROW), ...patch } }));

  const bobotInput = (k: keyof BobotForm, label: string) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-1">
        <Input type="number" min={0} max={100} value={bf[k]} disabled={locked} onChange={(e) => setBf({ ...bf, [k]: e.target.value })} className="w-20" data-testid={`bobot-${k}-input`} />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Input Nilai Siswa</h1>
        <p className="text-sm text-muted-foreground">
          Atur bobot dulu, isi nilai harian, NTS & NAS, simpan, lalu kirim ke Waka Kurikulum untuk direviu.
        </p>
      </div>

      {!tahun ? (
        <Card><CardContent className="pt-5 text-sm text-muted-foreground">Tahun pelajaran aktif belum diatur oleh Waka Kurikulum.</CardContent></Card>
      ) : loadingPenugasan ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (penugasanList ?? []).length === 0 ? (
        <Card>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            {me?.role === "admin" ? "Belum ada penugasan mengajar." : "Belum ada penugasan mengajar untuk Anda. Hubungi Waka Kurikulum."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Penugasan</p>
              <Select value={penugasanId} onValueChange={(v: string) => setPenugasanId(v)}>
                <SelectTrigger className="w-64" data-testid="nilai-penugasan-select">
                  <SelectValue>
                    {(v: unknown) => {
                      const p = penugasanList?.find((x) => x.id === String(v));
                      return p ? `${p.mapel_nama} — ${p.kelas_nama}${me?.role === "admin" ? ` (${p.guru_nama})` : ""}` : "Pilih penugasan";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(penugasanList ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.mapel_nama} — {p.kelas_nama}{me?.role === "admin" ? ` (${p.guru_nama})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Semester</p>
              <Select value={semester} onValueChange={(v: string) => setSemester(v)}>
                <SelectTrigger className="w-40" data-testid="nilai-semester-select">
                  <SelectValue>{(v: unknown) => (String(v) === "genap" ? "Genap (2)" : "Ganjil (1)")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ganjil">Ganjil (1)</SelectItem>
                  <SelectItem value="genap">Genap (2)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">TP {tahun}</span>
              {status ? <StatusBadge status={status.status} testid="nilai-status-badge" /> : null}
            </div>
          </div>

          {status?.status === "revisi" && status.catatan_admin ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900" data-testid="nilai-catatan-revisi">
              <strong>Catatan revisi dari Waka Kurikulum:</strong> {status.catatan_admin}
            </div>
          ) : null}

          <Card className={bobotSaved ? "" : "border-amber-300"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-heading text-base">
                <Scale className="size-4 text-emerald-700" /> Bobot Nilai {bobotSaved ? "" : "(wajib diatur dulu)"}
              </CardTitle>
              <CardDescription>Total masing-masing rapor harus 100%.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Rapor Tengah Semester <span className={sumT === 100 ? "text-emerald-700" : "text-destructive"}>({sumT}%)</span></p>
                  <div className="flex flex-wrap gap-3">{bobotInput("th", "Nilai Harian")}{bobotInput("tt", "Nilai Tengah Semester")}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="mb-2 text-sm font-semibold">Rapor Akhir Semester <span className={sumA === 100 ? "text-emerald-700" : "text-destructive"}>({sumA}%)</span></p>
                  <div className="flex flex-wrap gap-3">{bobotInput("ah", "Nilai Harian")}{bobotInput("at", "Nilai Tengah Semester")}{bobotInput("aa", "Nilai Akhir Semester")}</div>
                </div>
              </div>
              {!locked ? (
                <Button variant={bobotSaved ? "outline" : "default"} size="sm" onClick={() => bobotMut.mutate()} disabled={bobotMut.isPending || sumT !== 100 || sumA !== 100} data-testid="save-bobot-btn">
                  <Save className="size-4" /> Simpan Bobot
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">{penugasan ? `${penugasan.mapel_nama} — Kelas ${penugasan.kelas_nama}` : "Nilai"}</CardTitle>
              <CardDescription>
                {!bobotSaved ? "Simpan bobot terlebih dahulu untuk membuka isian nilai." : locked ? "Nilai sudah dikirim/terkunci — hanya bisa dilihat." : "Rapor TS & AS dihitung otomatis dari bobot."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead className="w-24">Harian</TableHead>
                    <TableHead className="w-24">NTS</TableHead>
                    <TableHead className="w-24">NAS</TableHead>
                    <TableHead className="w-20 text-center">Rapor TS</TableHead>
                    <TableHead className="w-20 text-center">Rapor AS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(siswaList ?? []).map((s, i) => {
                    const r = rows[s.id] ?? EMPTY_ROW;
                    const c = calc(r, bf);
                    const dis = locked || !bobotSaved;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell className="font-medium" data-testid={`nilai-nama-${s.id}`}>{s.nama}</TableCell>
                        {(["nilai_harian", "nilai_tengah", "nilai_akhir"] as const).map((k) => (
                          <TableCell key={k}>
                            <Input type="number" min={0} max={100} value={r[k]} disabled={dis} onChange={(e) => setRow(s.id, { [k]: e.target.value })} className="w-20" placeholder="-"
                              data-testid={`grade-${k === "nilai_harian" ? "nh" : k === "nilai_tengah" ? "nts" : "nas"}-input-${s.id}`} />
                          </TableCell>
                        ))}
                        <TableCell className="text-center font-mono text-sm" data-testid={`grade-rt-${s.id}`}>{fmtNilai(c.rt)}</TableCell>
                        <TableCell className="text-center font-mono text-sm font-semibold" data-testid={`grade-ra-${s.id}`}>{fmtNilai(c.ra)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(siswaList ?? []).length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">Belum ada siswa aktif di kelas ini.</TableCell></TableRow>
                  ) : null}
                </TableBody>
              </Table>
              {!locked ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={handleSave} disabled={saveMut.isPending || !bobotSaved} data-testid="save-grades-btn">
                    <Save className="size-4" /> Simpan Nilai
                  </Button>
                  <Button variant="outline" onClick={() => setKirimOpen(true)} disabled={!bobotSaved || (nilaiList ?? []).length === 0} data-testid="kirim-nilai-btn">
                    <Send className="size-4" /> Kirim ke Waka Kurikulum
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={kirimOpen}
        onOpenChange={setKirimOpen}
        title="Kirim nilai untuk direviu?"
        description="Pastikan nilai sudah disimpan. Setelah dikirim, nilai tidak bisa diubah kecuali dikembalikan oleh Waka Kurikulum."
        confirmLabel="Ya, Kirim"
        onConfirm={() => kirimMut.mutate()}
        busy={kirimMut.isPending}
      />
    </div>
  );
}
