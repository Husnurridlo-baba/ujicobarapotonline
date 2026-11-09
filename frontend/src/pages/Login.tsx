import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { ApiError, apiPost } from "@/lib/api";
import { beginSession, useMe } from "@/lib/session";
import type { Me } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_ACCOUNTS = [
  { testid: "role-preset-admin-btn", label: "Waka Kurikulum", username: "admin", password: "admin123", icon: ShieldCheck },
  { testid: "role-preset-guru-btn", label: "Guru Mapel", username: "ahmad", password: "guru123", icon: UserRound },
  { testid: "role-preset-wali-btn", label: "Wali Kelas", username: "siti", password: "guru123", icon: UserRound },
];

export default function Login() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (me) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await apiPost<Me>("/auth/login", { username, password });
      beginSession(qc, data);
      toast.success(`Selamat datang, ${data.nama}`);
      navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? "Username atau password salah"
          : "Gagal masuk, silakan coba lagi"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-svh bg-[#F8FAFC] lg:grid-cols-2">
      {/* Panel identitas madrasah */}
      <div className="relative hidden overflow-hidden bg-emerald-950 p-10 text-emerald-50 lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: "radial-gradient(circle, #FFFFFF 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-900/60 px-4 py-1.5 text-xs font-semibold tracking-wider uppercase">
            Rapor Online Madrasah
          </span>
          <h1 className="mt-8 font-heading text-4xl font-black leading-tight tracking-tight">
            MA Nurul Qur'an
            <br />
            Kebonagung
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-emerald-100/80">
            Satu aplikasi untuk mengisi nilai tengah dan akhir semester (ganjil &amp; genap), mengelola
            kenaikan kelas, arsip alumni, hingga mencetak rapor lengkap dengan kop dan tanda tangan.
          </p>
        </div>
        <div className="relative space-y-3 text-sm">
          {[
            "Waka Kurikulum — pengaturan tahun pelajaran, guru, siswa, mapel & penugasan",
            "Guru — mengisi nilai sesuai penugasan mengajarnya",
            "Wali Kelas — absensi, ekstrakurikuler, catatan & cetak rapor",
          ].map((t) => (
            <p key={t} className="flex items-start gap-2 text-emerald-100/85">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-300" />
              {t}
            </p>
          ))}
        </div>
      </div>

      {/* Form login */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-800 text-white">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="font-heading text-base font-bold text-emerald-950">MA Nurul Qur'an Kebonagung</p>
              <p className="text-xs text-muted-foreground">Aplikasi Rapor Online</p>
            </div>
          </div>
          <Card className="border-border shadow-md">
            <CardHeader>
              <CardTitle className="font-heading text-xl">Masuk ke Aplikasi</CardTitle>
              <CardDescription>Gunakan akun yang diberikan Waka Kurikulum.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="mis. admin"
                    autoComplete="username"
                    data-testid="login-username-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    data-testid="login-password-input"
                  />
                </div>
                {error ? (
                  <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" data-testid="login-error-text">
                    {error}
                  </p>
                ) : null}
                <Button type="submit" className="w-full" disabled={busy || !username || !password} data-testid="login-submit-button">
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
                  Masuk
                </Button>
              </form>

              <div className="mt-6 rounded-lg border border-dashed border-border p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Akun demo (klik untuk mengisi)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {DEMO_ACCOUNTS.map((d) => (
                    <Button
                      key={d.testid}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-auto flex-col gap-1 px-2 py-2"
                      onClick={() => {
                        setUsername(d.username);
                        setPassword(d.password);
                      }}
                      data-testid={d.testid}
                    >
                      <d.icon className="size-4 text-emerald-700" />
                      <span className="text-[11px] leading-tight">{d.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}