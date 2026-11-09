import { Outlet, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { useMe } from "@/lib/session";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import AcademicYear from "@/pages/admin/AcademicYear";
import Teachers from "@/pages/admin/Teachers";
import Students from "@/pages/admin/Students";
import Subjects from "@/pages/admin/Subjects";
import Classes from "@/pages/admin/Classes";
import Assignments from "@/pages/admin/Assignments";
import Promotion from "@/pages/admin/Promotion";
import SchoolSettings from "@/pages/admin/SchoolSettings";
import GradeEntry from "@/pages/guru/GradeEntry";
import HomeroomData from "@/pages/wali/HomeroomData";
import Biodata from "@/pages/wali/Biodata";
import CetakRapot from "@/pages/CetakRapot";
import ReviewNilai from "@/pages/admin/ReviewNilai";
import Dokumen from "@/pages/Dokumen";
import DokumenSiswa from "@/pages/cetak/DokumenSiswa";
import Leger from "@/pages/cetak/Leger";

function Splash() {
  return (
    <div className="grid min-h-svh place-items-center bg-background">
      <p className="text-sm text-muted-foreground">Memuat…</p>
    </div>
  );
}

function RequireAuth() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <Splash />;
  if (!me) return <Navigate to="/login" replace />;
  return <AppLayout me={me} />;
}

function RequireAdmin() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <Splash />;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== "admin") return <Navigate to="/" replace />;
  return <Outlet />;
}

// Menu wali kelas hanya untuk guru yang ditetapkan sebagai wali kelas.
function RequireWali() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <Splash />;
  if (!me) return <Navigate to="/login" replace />;
  if (!me.kelas_wali) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RequireWaliOrAdmin() {
  const { data: me, isLoading } = useMe();
  if (isLoading) return <Splash />;
  if (!me) return <Navigate to="/login" replace />;
  if (me.role !== "admin" && !me.kelas_wali) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/guru/grades" element={<GradeEntry />} />
          <Route path="/cetak/:siswaId" element={<CetakRapot />} />
          <Route path="/cetak/:siswaId/:doc" element={<DokumenSiswa />} />
          <Route path="/leger/:kelasId" element={<Leger />} />
          <Route element={<RequireWaliOrAdmin />}>
            <Route path="/dokumen" element={<Dokumen />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/admin/academic-year" element={<AcademicYear />} />
            <Route path="/admin/teachers" element={<Teachers />} />
            <Route path="/admin/students" element={<Students />} />
            <Route path="/admin/subjects" element={<Subjects />} />
            <Route path="/admin/classes" element={<Classes />} />
            <Route path="/admin/assignments" element={<Assignments />} />
            <Route path="/admin/promotion" element={<Promotion />} />
            <Route path="/admin/settings" element={<SchoolSettings />} />
            <Route path="/admin/review" element={<ReviewNilai />} />
          </Route>
          <Route element={<RequireWali />}>
            <Route path="/wali/homeroom" element={<HomeroomData />} />
            <Route path="/wali/biodata" element={<Biodata />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}