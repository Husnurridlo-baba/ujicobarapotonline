import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import type { CetakRapot as CetakRapotData } from "@/types";
import RaporSheet from "@/components/rapor/RaporSheet";
import { PrintShell, StateBox } from "@/components/rapor/PrintShell";

export default function CetakRapot() {
  const { siswaId } = useParams<{ siswaId: string }>();
  const [params] = useSearchParams();
  const qs = new URLSearchParams();
  for (const k of ["tahun", "semester", "jenis"]) {
    const v = params.get(k);
    if (v) qs.set(k, v);
  }
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["cetak", siswaId, qs.toString()],
    queryFn: () => apiGet<CetakRapotData>(`/cetak/${siswaId}?${qs.toString()}`),
    enabled: !!siswaId,
    retry: false,
  });
  return (
    <PrintShell ready={!!data}>
      {isLoading || isError || !data ? <StateBox loading={isLoading} error={error} /> : <RaporSheet data={data} />}
    </PrintShell>
  );
}
