// Sesi = httpOnly cookie dari backend. Cache "who am I" di sini, jangan gandakan di mana pun.
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import type { Me } from "@/types";

export const ME_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => apiGet<Me>("/auth/me"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

// Panggil setelah login berhasil agar cache `me` terisi tanpa refetch.
export function beginSession(qc: QueryClient, me: Me) {
  qc.setQueryData(ME_KEY, me);
}

// Satu-satunya cara logout: bersihkan sesi server + seluruh cache react-query.
export async function endSession(qc: QueryClient) {
  try {
    await apiPost("/auth/logout");
  } catch {
    // backend down pun tetap bersihkan cache lokal
  }
  qc.clear();
}