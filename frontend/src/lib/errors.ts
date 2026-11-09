import { ApiError } from "@/lib/api";

export function apiErrMsg(err: unknown, fallback = "Terjadi kesalahan, coba lagi"): string {
  if (err instanceof ApiError) {
    const detail = (err.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}