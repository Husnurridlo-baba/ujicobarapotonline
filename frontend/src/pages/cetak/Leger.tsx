import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { fmtNilai, fmtTanggal, SEMESTER_LABEL } from "@/lib/format";
import type { LegerOut } from "@/types";
import { Paper, PrintShell, StateBox } from "@/components/rapor/PrintShell";
import { Kop } from "@/components/rapor/RaporSheet";

const cell = "border border-slate-500 px-1 py-0.5";

export default function Leger() {
  const { kelasId } = useParams<{ kelasId: string }>();
  const [params] = useSearchParams();
  const tahun = params.get("tahun") ?? "";
  const semester = params.get("semester") ?? "ganjil";
  const { data, isLoading, error } = useQuery({
    queryKey: ["leger", kelasId, tahun, semester],
    queryFn: () => apiGet<LegerOut>(`/leger?kelas_id=${kelasId}&tahun=${encodeURIComponent(tahun)}&semester=${semester}`),
    enabled: !!kelasId,
    retry: false,
  });

  return (
    <PrintShell ready={!!data} landscape>
      {!data ? <StateBox loading={isLoading} error={error} /> : (
        <Paper watermark={data.nama_sekolah} landscape className="px-[10mm] py-[10mm]">
          <Kop data={data} />
          <h2 className="text-center font-heading text-base font-bold uppercase" data-testid="leger-judul">Leger Nilai Rapor Kelas {data.kelas_nama}</h2>
          <p className="mb-3 text-center text-xs">{data.nama_sekolah} · Semester {SEMESTER_LABEL[data.semester]} · TP {data.tahun} · TS = rapor tengah semester, AS = rapor akhir semester</p>
          <table className="w-full border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100">
                <th className={cell} rowSpan={2}>No</th>
                <th className={`${cell} text-left`} rowSpan={2}>Nama Siswa</th>
                {data.mapel.map((m) => <th key={m} className={cell} colSpan={2}>{m}</th>)}
                <th className={cell} rowSpan={2}>Jumlah AS</th>
                <th className={cell} rowSpan={2}>Rata AS</th>
                <th className={cell} rowSpan={2}>Rank</th>
              </tr>
              <tr className="bg-slate-100">
                {data.mapel.map((m) => [<th key={m + "t"} className={cell}>TS</th>, <th key={m + "a"} className={cell}>AS</th>])}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const totals = data.baris.map((b) => b.sel.reduce((a, s) => a + (s?.rapot_akhir ?? 0), 0));
                const sorted = [...totals].sort((a, b) => b - a);
                return data.baris.map((b, i) => {
                  const cnt = b.sel.filter((s) => s?.rapot_akhir != null).length;
                  return (
                    <tr key={b.siswa_id}>
                      <td className={`${cell} text-center`}>{i + 1}</td>
                      <td className={cell}>{b.siswa_nama}</td>
                      {b.sel.map((s, j) => [
                        <td key={j + "t"} className={`${cell} text-center ${s && !s.terkunci ? "text-slate-400" : ""}`}>{fmtNilai(s?.rapot_tengah)}</td>,
                        <td key={j + "a"} className={`${cell} text-center ${s && !s.terkunci ? "text-slate-400" : ""}`}>{fmtNilai(s?.rapot_akhir)}</td>,
                      ])}
                      <td className={`${cell} text-center font-semibold`}>{totals[i] ? totals[i].toFixed(1) : ""}</td>
                      <td className={`${cell} text-center`}>{cnt ? (totals[i] / cnt).toFixed(1) : ""}</td>
                      <td className={`${cell} text-center`}>{totals[i] ? sorted.indexOf(totals[i]) + 1 : ""}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
          <p className="no-print mt-1 text-[10px] text-slate-500">Angka abu-abu = belum dikunci Waka Kurikulum.</p>
          <div className="mt-8 flex justify-end text-center text-[11px]">
            <div><p>Kebonagung, {fmtTanggal(data.tanggal_cetak)}<br />Wali Kelas,</p><div className="h-16" /><p className="font-semibold underline">{data.wali_nama || "........................"}</p></div>
          </div>
        </Paper>
      )}
    </PrintShell>
  );
}
