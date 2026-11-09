import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, FileText, Printer, ScrollText, Table2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { KelasOut, SettingsOut, SiswaOut } from "@/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DOCS = [
  { key: "rapor-tengah", label: "Rapor TS", icon: Printer },
  { key: "rapor-akhir", label: "Rapor AS", icon: Printer },
  { key: "transkrip", label: "Nilai 6 Smt", icon: Table2 },
  { key: "cover", label: "Cover", icon: BookOpenCheck },
  { key: "identitas", label: "Identitas", icon: FileText },
  { key: "petunjuk", label: "Petunjuk", icon: ScrollText },
  { key: "mutasi", label: "Mutasi", icon: ScrollText },
];

export default function Dokumen() {
  const { data: me } = useMe();
  const isAdmin = me?.role === "admin";
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });
  const { data: kelasList } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas"), enabled: isAdmin });
  const [kelasId, setKelasId] = useState(me?.kelas_wali?.id ?? "");
  const [semester, setSemester] = useState("");

  useEffect(() => {
    if (!kelasId && isAdmin && kelasList?.length) setKelasId(kelasList[0].id);
  }, [kelasId, isAdmin, kelasList]);
  useEffect(() => {
    if (settings && !semester) setSemester(settings.semester_aktif || "ganjil");
  }, [settings, semester]);

  const tahun = settings?.tahun_aktif ?? "";
  const tq = `tahun=${encodeURIComponent(tahun)}&semester=${semester}`;
  const { data: siswaList, isLoading } = useQuery({
    queryKey: ["siswa", kelasId],
    queryFn: () => apiGet<SiswaOut[]>(`/siswa?kelas_id=${kelasId}&status=aktif`),
    enabled: !!kelasId,
  });
  const kelasNama = isAdmin ? kelasList?.find((k) => k.id === kelasId)?.nama : me?.kelas_wali?.nama;

  const href = (siswaId: string, key: string) => {
    if (key === "rapor-tengah") return `/cetak/${siswaId}?${tq}&jenis=tengah`;
    if (key === "rapor-akhir") return `/cetak/${siswaId}?${tq}&jenis=akhir`;
    return `/cetak/${siswaId}/${key}?${tq}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Cetak Dokumen Rapor</h1>
        <p className="text-sm text-muted-foreground">
          Leger kelas, rapor tengah & akhir semester, nilai 6 semester, cover, identitas, petunjuk pengisian, dan mutasi. Nilai yang tercetak hanya nilai yang sudah dikunci Waka Kurikulum.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {isAdmin ? (
          <Select value={kelasId} onValueChange={(v: string) => setKelasId(v)}>
            <SelectTrigger className="w-44" data-testid="dokumen-kelas-select">
              <SelectValue>{(v: unknown) => kelasList?.find((k) => k.id === String(v))?.nama ?? "Pilih kelas"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(kelasList ?? []).map((k) => <SelectItem key={k.id} value={k.id}>{k.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}
        <Select value={semester} onValueChange={(v: string) => setSemester(v)}>
          <SelectTrigger className="w-44" data-testid="dokumen-semester-select">
            <SelectValue>{(v: unknown) => (String(v) === "genap" ? "Semester Genap" : "Semester Ganjil")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ganjil">Semester Ganjil</SelectItem>
            <SelectItem value="genap">Semester Genap</SelectItem>
          </SelectContent>
        </Select>
        {kelasId ? (
          <Link to={`/leger/${kelasId}?${tq}`} className={buttonVariants({ variant: "default" })} data-testid="cetak-leger-btn">
            <Table2 className="size-4" /> Cetak Leger {kelasNama}
          </Link>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Siswa Kelas {kelasNama ?? "-"}</CardTitle>
          <CardDescription>TP {tahun} · Semester {semester === "genap" ? "Genap" : "Ganjil"}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">No</TableHead>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>Cetak</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">Memuat…</TableCell></TableRow>
              ) : (siswaList ?? []).map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium" data-testid={`dokumen-nama-${s.id}`}>{s.nama}<p className="text-xs font-normal text-muted-foreground">NISN {s.nisn || "-"}</p></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1.5">
                      {DOCS.map((d) => (
                        <Link key={d.key} to={href(s.id, d.key)} className={buttonVariants({ variant: "outline", size: "xs" })} data-testid={`cetak-${d.key}-btn-${s.id}`}>
                          <d.icon className="size-3" /> {d.label}
                        </Link>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && (siswaList ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">Belum ada siswa aktif.</TableCell></TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
