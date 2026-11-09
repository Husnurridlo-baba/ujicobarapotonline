import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpCircle,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardList,
  Contact,
  FileSpreadsheet,
  GraduationCap,
  Printer,
  Settings2,
  UserCheck,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import { biodataKurang } from "@/lib/biodata";
import type { KelasOut, MapelOut, Me, PenugasanOut, SettingsOut, SiswaOut, UserOut } from "@/types";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function StatCard({ label, value, testid }: { label: string; value: number | string; testid: string }) {
  return (
    <Card className="transition-all duration-150 hover:border-emerald-300 hover:shadow-md">
      <CardContent className="pt-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">{label}</p>
        <p className="mt-1 font-heading text-3xl font-bold" data-testid={testid}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function AdminHome({ me }: { me: Me }) {
  const { data: siswa } = useQuery({ queryKey: ["siswa"], queryFn: () => apiGet<SiswaOut[]>("/siswa") });
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: () => apiGet<UserOut[]>("/users") });
  const { data: kelas } = useQuery({ queryKey: ["kelas"], queryFn: () => apiGet<KelasOut[]>("/kelas") });
  const { data: mapel } = useQuery({ queryKey: ["mapel"], queryFn: () => apiGet<MapelOut[]>("/mapel") });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: () => apiGet<SettingsOut>("/settings"), retry: false });

  const aktif = siswa?.filter((s) => s.status === "aktif").length ?? 0;
  const alumni = siswa?.filter((s) => s.status === "lulus").length ?? 0;

  const shortcuts = [
    { label: "Tahun & Semester", to: "/admin/academic-year", icon: CalendarDays, testid: "shortcut-academic-year" },
    { label: "Manajemen Guru", to: "/admin/teachers", icon: UserCheck, testid: "shortcut-teachers" },
    { label: "Manajemen Siswa", to: "/admin/students", icon: GraduationCap, testid: "shortcut-students" },
    { label: "Mata Pelajaran", to: "/admin/subjects", icon: BookOpen, testid: "shortcut-subjects" },
    { label: "Kelas & Wali Kelas", to: "/admin/classes", icon: Building2, testid: "shortcut-classes" },
    { label: "Penugasan Mengajar", to: "/admin/assignments", icon: Briefcase, testid: "shortcut-assignments" },
    { label: "Kenaikan & Alumni", to: "/admin/promotion", icon: ArrowUpCircle, testid: "shortcut-promotion" },
    { label: "Kop & Tanda Tangan", to: "/admin/settings", icon: Settings2, testid: "shortcut-settings" },
    { label: "Rekap & Reviu Nilai", to: "/admin/review", icon: ClipboardList, testid: "shortcut-review" },
    { label: "Cetak Dokumen", to: "/dokumen", icon: Printer, testid: "shortcut-dokumen" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Assalamu'alaikum, {me.nama}</h1>
        <p className="text-sm text-muted-foreground">
          {settings?.tahun_aktif
            ? `Tahun Pelajaran ${settings.tahun_aktif} — Semester ${settings.semester_aktif === "genap" ? "Genap" : "Ganjil"} aktif.`
            : "Tahun pelajaran aktif belum diatur — buka menu Tahun & Semester."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Siswa Aktif" value={aktif} testid="stat-siswa-aktif" />
        <StatCard label="Guru" value={users?.length ?? 0} testid="stat-guru" />
        <StatCard label="Kelas" value={kelas?.length ?? 0} testid="stat-kelas" />
        <StatCard label="Mata Pelajaran" value={mapel?.length ?? 0} testid="stat-mapel" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {shortcuts.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            data-testid={s.testid}
            className={buttonVariants({ variant: "outline", size: "sm" }) + " h-auto flex-col gap-1.5 py-3"}
          >
            <s.icon className="size-4 text-emerald-700" />
            <span className="text-center text-xs leading-tight">{s.label}</span>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-base">Arsip Alumni</CardTitle>
          <CardDescription>{alumni} siswa telah lulus dan tercatat sebagai alumni.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function BiodataKurangPanel({ kelasId, kelasNama }: { kelasId: string; kelasNama: string }) {
  const { data: siswa, isLoading } = useQuery({
    queryKey: ["siswa", kelasId],
    queryFn: () => apiGet<SiswaOut[]>(`/siswa?kelas_id=${kelasId}&status=aktif`),
  });
  const kurang = (siswa ?? []).map((s) => ({ s, k: biodataKurang(s) })).filter((x) => x.k.length > 0);
  return (
    <Card data-testid="biodata-kurang-panel">
      <CardHeader>
        <CardTitle className="font-heading text-base">Biodata Belum Lengkap — Kelas {kelasNama}</CardTitle>
        <CardDescription data-testid="biodata-kurang-summary">
          {isLoading ? "Memuat…" : kurang.length === 0 ? "Semua biodata & foto siswa sudah lengkap." : `${kurang.length} dari ${siswa?.length ?? 0} siswa belum lengkap.`}
        </CardDescription>
      </CardHeader>
      {kurang.length > 0 ? (
        <CardContent className="space-y-2">
          {kurang.map(({ s, k }) => (
            <div key={s.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg border px-3 py-2" data-testid={`biodata-kurang-row-${s.id}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.nama}</p>
                <p className="text-xs text-amber-700">
                  Kurang: {k.length > 5 ? `${k.slice(0, 5).join(", ")} +${k.length - 5} lainnya` : k.join(", ")}
                </p>
              </div>
              {k.includes("Foto") ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700">Belum ada foto</span> : null}
            </div>
          ))}
          <Link to="/wali/biodata" data-testid="biodata-kurang-link" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Contact className="size-4" /> Lengkapi Biodata
          </Link>
        </CardContent>
      ) : null}
    </Card>
  );
}

function GuruHome({ me }: { me: Me }) {
  const { data: penugasanList, isLoading } = useQuery({
    queryKey: ["penugasan"],
    queryFn: () => apiGet<PenugasanOut[]>("/penugasan"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Assalamu'alaikum, {me.nama}</h1>
        <p className="text-sm text-muted-foreground">Pilih penugasan mengajar untuk mengisi nilai siswa.</p>
      </div>

      {me.kelas_wali ? (
        <Card className="border-emerald-200 bg-emerald-50/60 transition-all duration-150 hover:shadow-md">
          <CardHeader>
            <CardTitle className="font-heading text-base">Anda Wali Kelas {me.kelas_wali.nama}</CardTitle>
            <CardDescription>Kelola absensi, ekstrakurikuler, catatan, dan cetak rapor kelas Anda.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link to="/wali/homeroom" data-testid="wali-quick-homeroom-link" className={buttonVariants({ variant: "default", size: "sm" })}>
              <ClipboardList className="size-4" /> Data Wali Kelas
            </Link>
            <Link to="/dokumen" data-testid="wali-quick-print-link" className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Printer className="size-4" /> Cetak Rapor
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {me.kelas_wali ? <BiodataKurangPanel kelasId={me.kelas_wali.id} kelasNama={me.kelas_wali.nama} /> : null}

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat penugasan…</p>
        ) : (penugasanList ?? []).length === 0 ? (
          <Card>
            <CardContent className="pt-5 text-sm text-muted-foreground">
              Belum ada penugasan mengajar untuk Anda. Hubungi Waka Kurikulum.
            </CardContent>
          </Card>
        ) : (
          penugasanList!.map((p) => (
            <Card key={p.id} className="transition-all duration-150 hover:border-emerald-300 hover:shadow-md">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-5">
                <div>
                  <p className="font-semibold">{p.mapel_nama}</p>
                  <p className="text-sm text-muted-foreground">
                    Kelas {p.kelas_nama}
                  </p>
                </div>
                <Link
                  to={`/guru/grades?penugasan=${p.id}`}
                  data-testid={`grade-open-link-${p.id}`}
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  <FileSpreadsheet className="size-4" /> Isi Nilai
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: me } = useMe();
  if (!me) return null;
  return me.role === "admin" ? <AdminHome me={me} /> : <GuruHome me={me} />;
}