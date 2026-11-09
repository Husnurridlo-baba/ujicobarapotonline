import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowUpCircle,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  Contact,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  School,
  Settings2,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { endSession } from "@/lib/session";
import type { Me, SettingsOut } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  testid: string;
}

interface NavGroup {
  title: string;
  visible: boolean;
  items: NavItem[];
}

function buildGroups(me: Me): NavGroup[] {
  return [
    {
      title: "Utama",
      visible: true,
      items: [{ label: "Dashboard", to: "/", icon: LayoutDashboard, testid: "nav-dashboard" }],
    },
    {
      title: "Waka Kurikulum",
      visible: me.role === "admin",
      items: [
        { label: "Tahun & Semester", to: "/admin/academic-year", icon: CalendarDays, testid: "nav-academic-year" },
        { label: "Manajemen Guru", to: "/admin/teachers", icon: UserCheck, testid: "nav-teachers" },
        { label: "Manajemen Siswa", to: "/admin/students", icon: GraduationCap, testid: "nav-students" },
        { label: "Mata Pelajaran", to: "/admin/subjects", icon: BookOpen, testid: "nav-subjects" },
        { label: "Kelas & Wali Kelas", to: "/admin/classes", icon: Building2, testid: "nav-classes" },
        { label: "Penugasan Mengajar", to: "/admin/assignments", icon: Briefcase, testid: "nav-assignments" },
        { label: "Rekap & Reviu Nilai", to: "/admin/review", icon: ClipboardCheck, testid: "nav-review" },
        { label: "Cetak Dokumen", to: "/dokumen", icon: Printer, testid: "nav-dokumen-admin" },
        { label: "Kenaikan & Alumni", to: "/admin/promotion", icon: ArrowUpCircle, testid: "nav-promotion" },
        { label: "Kop & Tanda Tangan", to: "/admin/settings", icon: Settings2, testid: "nav-settings" },
      ],
    },
    {
      title: "Guru",
      visible: true,
      items: [{ label: "Input Nilai", to: "/guru/grades", icon: FileSpreadsheet, testid: "nav-grades" }],
    },
    {
      // Hanya muncul bila guru ditetapkan sebagai wali kelas.
      title: "Wali Kelas",
      visible: !!me.kelas_wali,
      items: [
        { label: "Data Wali Kelas", to: "/wali/homeroom", icon: ClipboardList, testid: "nav-homeroom" },
        { label: "Biodata Siswa", to: "/wali/biodata", icon: Contact, testid: "nav-biodata" },
        { label: "Cetak Dokumen", to: "/dokumen", icon: Printer, testid: "nav-print-rapor" },
      ],
    },
  ];
}

function SidebarNav({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  return (
    <nav className="space-y-5 p-3">
      {buildGroups(me)
        .filter((g) => g.visible && g.items.length > 0)
        .map((g) => (
          <div key={g.title}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/60">
              {g.title}
            </p>
            <div className="space-y-0.5">
              {g.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  data-testid={item.testid}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                      isActive
                        ? "bg-white/15 text-white"
                        : "text-emerald-50/75 hover:bg-white/10 hover:text-white"
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
    </nav>
  );
}

export function AppLayout({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const location = useLocation();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<SettingsOut>("/settings"),
    retry: false,
    staleTime: 60_000,
  });

  const handleLogout = async () => {
    await endSession(qc);
    navigate("/login", { replace: true });
  };

  const pill = settings?.tahun_aktif
    ? `TP ${settings.tahun_aktif} · Semester ${settings.semester_aktif === "genap" ? "Genap" : "Ganjil"}`
    : "Tahun pelajaran belum diatur";
  const roleLabel =
    me.role === "admin" ? (me.is_super ? "Admin Utama" : "Waka Kurikulum") : me.kelas_wali ? `Wali Kelas ${me.kelas_wali.nama}` : "Guru";

  return (
    <div className="min-h-svh bg-background">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
            <School className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight">MA Nurul Qur'an</p>
            <p className="text-[11px] text-emerald-100/60">Rapor Online Kebonagung</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav me={me} />
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="no-print sticky top-0 z-40 border-b border-border bg-white/80 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              data-testid="menu-toggle-btn"
            >
              <Menu className="size-5" />
            </Button>
            <Link to="/" className="flex min-w-0 items-center gap-2 md:hidden">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-800 text-white">
                <School className="size-4" />
              </span>
              <span className="truncate text-sm font-bold text-emerald-950">MA Nurul Qur'an</span>
            </Link>
            <Badge
              variant="outline"
              className="ml-auto hidden border-emerald-200 bg-emerald-50 text-emerald-800 sm:inline-flex"
              data-testid="active-tp-pill"
            >
              {pill}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="gap-2" data-testid="user-menu-btn">
                    <span className="grid size-6 place-items-center rounded-full bg-emerald-700 text-[11px] font-bold text-white">
                      {me.nama.charAt(0)}
                    </span>
                    <span className="hidden max-w-40 truncate sm:inline">{me.nama}</span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold">{me.nama}</p>
                  <p className="text-xs text-muted-foreground">
                    {roleLabel} · @{me.username}
                  </p>
                </div>
                <DropdownMenuItem variant="destructive" onClick={handleLogout} data-testid="logout-btn">
                  <LogOut className="size-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mx-auto max-w-6xl"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0 text-sidebar-foreground">
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10">
              <School className="size-4" />
            </span>
            <p className="text-sm font-bold">MA Nurul Qur'an</p>
          </div>
          <div className="overflow-y-auto">
            <SidebarNav me={me} onNavigate={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}