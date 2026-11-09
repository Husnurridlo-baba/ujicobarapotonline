import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ArrowUpCircle, RefreshCw, ScrollText } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { apiErrMsg } from "@/lib/errors";
import type { KenaikanItemPayload, KenaikanRow, KelasOut, SettingsOut, SiswaOut } from "@/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ConfirmDialog";

const AKSI_LABEL: Record<string, string> = { naik: "Naik", tinggal: "Tinggal", lulus: "Lulus" };
const KEPUTUSAN_WALI_LABEL: Record<string, string> = { naik: "Naik", tinggal: "Tinggal", lulus: "Lulus" };

export default function Promotion() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });
  const tahun = settings?.tahun_aktif ?? "";

  const { data: rows, isLoading } = useQuery({
    queryKey: ["kenaikan", tahun],
    queryFn: () => apiGet<KenaikanRow[]>(`/kenaikan/preview?tahun=${encodeURIComponent(tahun)}`),
    enabled: !!tahun,
  });
  const { data: kelasList } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas") });
  const { data: alumni, isLoading: alumniLoading } = useQuery({
    queryKey: ["siswa", "alumni"],
    queryFn: () => apiGet<SiswaOut[]>("/siswa?status=lulus"),
  });

  const [items, setItems] = useState<KenaikanItemPayload[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (rows) setItems(rows.map((r) => ({ siswa_id: r.siswa.id, aksi: r.aksi, kelas_tujuan_id: r.kelas_tujuan_id })));
  }, [rows]);

  const applyMut = useMutation({
    mutationFn: () =>
      apiPost<{ naik: number; lulus: number; tinggal: number }>("/kenaikan", {
        tahun,
        keputusan: items.filter((i) => i.aksi !== "naik" || i.kelas_tujuan_id),
      }),
    onSuccess: (res) => {
      toast.success(`Kenaikan diproses: ${res.naik} naik, ${res.tinggal} tinggal, ${res.lulus} lulus (alumni)`);
      setConfirmOpen(false);
      qc.invalidateQueries({ queryKey: ["kenaikan", tahun] });
      qc.invalidateQueries({ queryKey: ["siswa"] });
    },
    onError: (e) => toast.error(apiErrMsg(e)),
  });

  const updateItem = (siswaId: string, patch: Partial<KenaikanItemPayload>) =>
    setItems((prev) => prev.map((i) => (i.siswa_id === siswaId ? { ...i, ...patch } : i)));

  const naikCount = items.filter((i) => i.aksi === "naik").length;
  const lulusCount = items.filter((i) => i.aksi === "lulus").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Kenaikan Kelas &amp; Alumni</h1>
        <p className="text-sm text-muted-foreground">
          Sambung siswa lama dengan menaikkan kelasnya; siswa kelas 12 yang lulus masuk daftar alumni.
        </p>
      </div>

      <Tabs defaultValue="kenaikan">
        <TabsList>
          <TabsTrigger value="kenaikan" data-testid="tab-kenaikan">Kenaikan Kelas</TabsTrigger>
          <TabsTrigger value="alumni" data-testid="tab-alumni">Daftar Alumni</TabsTrigger>
        </TabsList>

        <TabsContent value="kenaikan" className="space-y-4">
          {!tahun ? (
            <Card>
              <CardContent className="pt-5 text-sm text-muted-foreground">
                Waka kurikulum belum mengatur tahun pelajaran aktif — atur dulu di menu Tahun &amp; Semester.
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="font-heading text-base">Tahun Pelajaran {tahun}</CardTitle>
                      <CardDescription>
                        {naikCount} naik kelas · {lulusCount} lulus (masuk alumni). Keputusan wali kelas semester genap
                        menjadi nilai awal.
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => rows && setItems(rows.map((r) => ({ siswa_id: r.siswa.id, aksi: r.aksi, kelas_tujuan_id: r.kelas_tujuan_id })))}
                        data-testid="kenaikan-reset-btn"
                      >
                        <RefreshCw className="size-4" /> Atur Ulang
                      </Button>
                      <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={items.length === 0} data-testid="promote-students-btn">
                        <ArrowUpCircle className="size-4" /> Proses Kenaikan
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Kelas Sekarang</TableHead>
                        <TableHead>Keputusan Wali</TableHead>
                        <TableHead>Aksi</TableHead>
                        <TableHead>Kelas Tujuan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-sm text-muted-foreground">Memuat…</TableCell>
                        </TableRow>
                      ) : (rows ?? []).map((r) => {
                        const item = items.find((i) => i.siswa_id === r.siswa.id);
                        const aksi = item?.aksi ?? r.aksi;
                        return (
                          <TableRow key={r.siswa.id}>
                            <TableCell className="font-medium">{r.siswa.nama}</TableCell>
                            <TableCell>{r.kelas_nama || "-"}</TableCell>
                            <TableCell>
                              {r.keputusan_wali ? (
                                <span className="text-xs">{KEPUTUSAN_WALI_LABEL[r.keputusan_wali] ?? r.keputusan_wali}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={aksi}
                                onValueChange={(v: string) => updateItem(r.siswa.id, { aksi: v })}
                              >
                                <SelectTrigger size="sm" className="w-32" data-testid={`kenaikan-aksi-select-${r.siswa.id}`}>
                                  <SelectValue>{(v: unknown) => AKSI_LABEL[String(v)] ?? "Pilih"}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="naik">Naik</SelectItem>
                                  <SelectItem value="tinggal">Tinggal</SelectItem>
                                  <SelectItem value="lulus">Lulus</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              {aksi === "naik" ? (
                                <Select
                                  value={item?.kelas_tujuan_id ?? ""}
                                  onValueChange={(v: string) => updateItem(r.siswa.id, { kelas_tujuan_id: v })}
                                >
                                  <SelectTrigger size="sm" className="w-36" data-testid={`kenaikan-tujuan-select-${r.siswa.id}`}>
                                    <SelectValue>
                                      {(v: unknown) =>
                                        (kelasList ?? []).find((k) => k.id === String(v))?.nama ?? "Pilih kelas"
                                      }
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(kelasList ?? []).map((k) => (
                                      <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {!isLoading && (rows ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-sm text-muted-foreground">
                            Tidak ada siswa aktif.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="alumni">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading text-base">Daftar Alumni</CardTitle>
              <CardDescription>Siswa kelas 12 yang telah lulus.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Tahun Lulus</TableHead>
                    <TableHead className="text-right">Lampiran</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alumniLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">Memuat…</TableCell>
                    </TableRow>
                  ) : (alumni ?? []).map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.nis || "-"}</TableCell>
                      <TableCell className="font-medium" data-testid={`alumni-nama-${a.id}`}>{a.nama}</TableCell>
                      <TableCell>{a.tahun_lulus ?? "-"}</TableCell>
                      <TableCell className="text-right">
                        <Link to={`/cetak/${a.id}/mutasi`} className={buttonVariants({ variant: "outline", size: "xs" })} data-testid={`alumni-mutasi-btn-${a.id}`}>
                          <ScrollText className="size-3" /> Mutasi
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!alumniLoading && (alumni ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        Belum ada alumni.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Proses kenaikan kelas?"
        description={`${naikCount} siswa akan naik kelas, ${lulusCount} siswa kelas 12/alumni akan menjadi lulus. Proses ini memindahkan kelas siswa secara permanen.`}
        confirmLabel="Ya, Proses"
        onConfirm={() => applyMut.mutate()}
        busy={applyMut.isPending}
      />
    </div>
  );
}