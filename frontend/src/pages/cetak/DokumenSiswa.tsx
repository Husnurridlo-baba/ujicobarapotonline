import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { apiGet } from "@/lib/api";
import { fmtNilai, fmtTanggal, SEMESTER_LABEL } from "@/lib/format";
import type { CetakRapot, TranskripOut } from "@/types";
import { Paper, PrintShell, StateBox } from "@/components/rapor/PrintShell";
import { Kop } from "@/components/rapor/RaporSheet";

const cell = "border border-slate-500 px-2 py-1";

function Logo({ src, size = "size-28" }: { src: string | null; size?: string }) {
  return src ? <img src={src} alt="Logo madrasah" className={`${size} mx-auto object-contain`} data-testid="cover-logo" /> : (
    <div className={`${size} mx-auto grid place-items-center rounded-full border-4 border-double border-emerald-900 text-center font-serif text-[10px] font-bold leading-tight text-emerald-900`}>
      MA NURUL<br />QUR'AN
    </div>
  );
}

function Cover({ d }: { d: CetakRapot }) {
  return (
    <Paper watermark={d.nama_sekolah} className="flex flex-col">
      <div className="flex min-h-[260mm] flex-col items-center justify-between py-10 text-center">
        <div className="space-y-2">
          <p className="font-heading text-2xl font-black tracking-wide">RAPOR</p>
          <p className="font-heading text-xl font-bold">PESERTA DIDIK</p>
          <p className="font-heading text-lg font-bold">MADRASAH ALIYAH (MA)</p>
        </div>
        <Logo src={d.logo_image} size="size-40" />
        <div className="w-full max-w-md space-y-5">
          <div>
            <p className="text-sm">Nama Peserta Didik</p>
            <p className="border-2 border-black py-2 font-heading text-lg font-bold uppercase" data-testid="cover-nama">{d.siswa_nama}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-sm">NISN</p><p className="border-2 border-black py-2 font-mono font-bold" data-testid="cover-nisn">{d.siswa_nisn || "-"}</p></div>
            <div><p className="text-sm">NISM</p><p className="border-2 border-black py-2 font-mono font-bold" data-testid="cover-nism">{d.siswa_nism || "-"}</p></div>
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-heading text-lg font-black uppercase">{d.nama_sekolah}</p>
          <p className="text-sm font-semibold">KEMENTERIAN AGAMA REPUBLIK INDONESIA</p>
        </div>
      </div>
    </Paper>
  );
}

type IdRow = { no?: string; label: string; value?: string; sub?: boolean };

function Identitas({ d }: { d: CetakRapot }) {
  const rows: IdRow[] = [
    { no: "1", label: "Nama Peserta Didik", value: d.siswa_nama },
    { no: "2", label: "NISM", value: d.siswa_nism },
    { no: "3", label: "NISN", value: d.siswa_nisn },
    { no: "4", label: "Jenis Kelamin", value: d.siswa_jk === "P" ? "Perempuan" : "Laki-laki" },
    { no: "5", label: "Tempat, Tanggal Lahir", value: [d.tempat_lahir, fmtTanggal(d.tanggal_lahir)].filter(Boolean).join(", ") },
    { no: "6", label: "Agama", value: d.agama },
    { no: "7", label: "Alamat Lengkap", value: d.alamat },
    { no: "8", label: "No. Telepon", value: d.telepon },
    { no: "9", label: "Sekolah/Madrasah Asal", value: d.sekolah_asal },
    { no: "10", label: "Diterima di Madrasah ini" },
    { label: "a. Di kelas", value: d.diterima_kelas, sub: true },
    { label: "b. Pada tanggal", value: fmtTanggal(d.diterima_tanggal), sub: true },
    { no: "11", label: "Nama Orang Tua" },
    { label: "a. Ayah", value: d.ayah, sub: true },
    { label: "b. Ibu", value: d.ibu, sub: true },
    { no: "12", label: "Pekerjaan Orang Tua" },
    { label: "a. Ayah", value: d.pekerjaan_ayah, sub: true },
    { label: "b. Ibu", value: d.pekerjaan_ibu, sub: true },
    { no: "13", label: "Alamat Orang Tua", value: d.alamat_ortu },
    { no: "14", label: "Nama Wali", value: d.nama_wali },
    { no: "15", label: "Pekerjaan Wali", value: d.pekerjaan_wali },
    { no: "16", label: "Alamat Wali", value: d.alamat_wali },
  ];
  return (
    <Paper watermark={d.nama_sekolah}>
      <Kop data={d} />
      <h2 className="mb-4 text-center font-heading text-base font-bold uppercase" data-testid="identitas-judul">Identitas Peserta Didik</h2>
      <table className="w-full text-[12.5px]">
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="w-8 py-1 align-top">{r.no ? `${r.no}.` : ""}</td>
              <td className={`w-60 py-1 align-top ${r.sub ? "pl-4" : ""}`}>{r.label}</td>
              <td className="w-4 py-1 align-top">{r.value !== undefined ? ":" : ""}</td>
              <td className="py-1 font-medium">{r.value !== undefined ? (r.value || "-") : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-8 flex items-end justify-between">
        <div className="grid h-40 w-30 place-items-center border border-black" style={{ width: "30mm", height: "40mm" }}>
          {d.foto ? <img src={d.foto} alt="Foto siswa" className="h-full w-full object-cover" data-testid="identitas-foto" /> : <UserRound className="size-8 text-slate-300" />}
        </div>
        <div className="text-center text-[12px]">
          <p>Kebonagung, {fmtTanggal(d.tanggal_cetak)}<br />Kepala Madrasah,</p>
          <div className="h-20" />
          <p className="font-semibold underline">{d.kepala_nama || "........................"}</p>
          {d.kepala_nip ? <p>NIP. {d.kepala_nip}</p> : null}
        </div>
      </div>
    </Paper>
  );
}

function Petunjuk({ d }: { d: CetakRapot }) {
  const items = [
    "Buku Laporan Hasil Belajar (Rapor) dipergunakan selama peserta didik mengikuti pelajaran di madrasah.",
    "Apabila peserta didik pindah madrasah, buku rapor dibawa oleh peserta didik untuk dipergunakan sebagai bukti pencapaian kompetensi.",
    "Apabila buku rapor hilang, dapat diganti dengan buku rapor pengganti dan diisi dengan nilai-nilai yang dikutip dari buku induk madrasah asal disertai surat keterangan kehilangan.",
    "Buku rapor harus dilengkapi dengan pas foto berwarna ukuran 3 x 4 cm dan pengisiannya dilakukan oleh wali kelas.",
    "Nilai rapor tengah semester diolah dari nilai harian dan nilai tengah semester sesuai bobot yang ditetapkan guru mata pelajaran.",
    "Nilai rapor akhir semester diolah dari nilai harian, nilai tengah semester, dan nilai akhir semester sesuai bobot yang ditetapkan guru mata pelajaran.",
    "Nilai yang tercantum dalam rapor adalah nilai yang telah direviu dan dikunci oleh Waka Kurikulum.",
    "Predikat capaian: A = 90–100 (Sangat Baik), B = 80–89 (Baik), C = 70–79 (Cukup), D = < 70 (Perlu Bimbingan).",
    "Kehadiran diisi dengan jumlah hari peserta didik tidak hadir: Sakit (S), Izin (I), dan Tanpa Keterangan (A).",
    "Catatan wali kelas diisi dengan motivasi dan evaluasi kepribadian peserta didik, serta keputusan kenaikan kelas pada semester genap.",
  ];
  return (
    <Paper watermark={d.nama_sekolah}>
      <Kop data={d} />
      <h2 className="mb-4 text-center font-heading text-base font-bold uppercase">Petunjuk Pengisian Rapor</h2>
      <ol className="list-decimal space-y-2 pl-6 text-justify text-[13px]">
        {items.map((t) => <li key={t}>{t}</li>)}
      </ol>
    </Paper>
  );
}

function Mutasi({ d }: { d: CetakRapot }) {
  const mk = d.mutasi_keluar;
  const mm = d.mutasi_masuk;
  const keluarRows = mk ? 2 : 3;
  const masukRows = mm ? 2 : 3;
  const sebab = mk ? (mk.jenis === "lulus" ? `LULUS${mk.tahun ? ` (TP ${mk.tahun})` : ""}` : [mk.alasan, mk.tujuan ? `Pindah ke: ${mk.tujuan}` : ""].filter(Boolean).join(". ")) : "";
  return (
    <Paper watermark={d.nama_sekolah}>
      <Kop data={d} />
      <h2 className="text-center font-heading text-base font-bold uppercase">Keterangan Pindah Madrasah (Mutasi)</h2>
      <p className="mb-3 text-center text-[12px]">Nama Peserta Didik: <strong>{d.siswa_nama}</strong> · NISN {d.siswa_nisn || "-"} · NISM {d.siswa_nism || "-"}</p>
      <h3 className="mt-4 font-bold">A. Keluar</h3>
      <table className="mt-1 w-full border-collapse text-[12px]">
        <thead><tr className="bg-slate-100"><th className={cell}>Tanggal</th><th className={cell}>Kelas yang Ditinggalkan</th><th className={cell}>Sebab Keluar / Alasan</th><th className={cell}>Tanda Tangan Kepala Madrasah, Stempel, Orang Tua</th></tr></thead>
        <tbody>
          {mk ? (
            <tr data-testid="mutasi-keluar-row">
              <td className={`${cell} h-24 align-top`}>{fmtTanggal(mk.tanggal) || "-"}</td>
              <td className={`${cell} align-top`}>{mk.kelas || d.kelas_nama || "-"}</td>
              <td className={`${cell} align-top font-semibold`}>{sebab}</td>
              <td className={cell} />
            </tr>
          ) : null}
          {Array.from({ length: keluarRows }).map((_, i) => <tr key={i}><td className={`${cell} h-24`} /><td className={cell} /><td className={cell} /><td className={cell} /></tr>)}
        </tbody>
      </table>
      <h3 className="mt-6 font-bold">B. Masuk</h3>
      <table className="mt-1 w-full border-collapse text-[12px]">
        <thead><tr className="bg-slate-100"><th className={cell}>No</th><th className={cell}>Nama Peserta Didik</th><th className={cell}>Nomor Induk</th><th className={cell}>Nama Madrasah Asal</th><th className={cell}>Masuk di Madrasah Ini (Tanggal, Kelas, TP)</th><th className={cell}>Tanda Tangan Kepala Madrasah</th></tr></thead>
        <tbody>
          {mm ? (
            <tr data-testid="mutasi-masuk-row">
              <td className={`${cell} h-24 text-center align-top`}>1</td>
              <td className={`${cell} align-top`}>{d.siswa_nama}</td>
              <td className={`${cell} align-top`}>{mm.nomor_induk_asal || "-"}</td>
              <td className={`${cell} align-top`}>{mm.sekolah_asal}{mm.alasan ? <span className="block text-[11px] italic">Alasan: {mm.alasan}</span> : null}</td>
              <td className={`${cell} align-top`}>{fmtTanggal(mm.tanggal)}<br />Kelas {mm.kelas}<br />TP {mm.tahun}{mm.semester ? ` (${SEMESTER_LABEL[mm.semester] ?? mm.semester})` : ""}</td>
              <td className={cell} />
            </tr>
          ) : null}
          {Array.from({ length: masukRows }).map((_, i) => <tr key={i}><td className={`${cell} h-24 text-center`}>{i + 1 + (mm ? 1 : 0)}</td><td className={cell} /><td className={cell} /><td className={cell} /><td className={cell} /><td className={cell} /></tr>)}
        </tbody>
      </table>
    </Paper>
  );
}

function Transkrip({ t }: { t: TranskripOut }) {
  return (
    <Paper watermark={t.nama_sekolah}>
      {t.kop_image ? <Kop data={t} /> : (
        <div className="mb-3 flex items-center gap-4 border-b-[3px] border-double border-black pb-3">
          <Logo src={t.logo_image} size="size-16" />
          <p className="font-heading text-base font-black uppercase">{t.nama_sekolah}</p>
        </div>
      )}
      <h2 className="mb-3 text-center font-heading text-base font-bold uppercase">Daftar Nilai Rapor Selama 6 Semester</h2>
      <div className="grid grid-cols-2 gap-x-8 text-[12px]">
        <p>Nama: <strong>{t.siswa_nama}</strong></p>
        <p>NISN / NISM: {t.siswa_nisn || "-"} / {t.siswa_nism || "-"}</p>
        <p>Kelas sekarang: {t.kelas_nama || "-"}</p>
      </div>
      <table className="mt-3 w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-100">
            <th className={`${cell} text-left`} rowSpan={2}>Mata Pelajaran</th>
            {Array.from({ length: 6 }).map((_, i) => {
              const s = t.semester_list[i];
              return <th key={i} className={`${cell} text-center`}>Smt {i + 1}{s ? <span className="block text-[9px] font-normal">{s.tahun} {SEMESTER_LABEL[s.semester]}</span> : null}</th>;
            })}
            <th className={`${cell} text-center`} rowSpan={2}>Rata-rata</th>
          </tr>
        </thead>
        <tbody>
          {t.mapel.map((m, mi) => {
            const vals = t.semester_list.map((s) => s.sel[mi]?.nilai ?? null).filter((v): v is number => v !== null);
            const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
            return (
              <tr key={m}>
                <td className={cell}>{m}</td>
                {Array.from({ length: 6 }).map((_, i) => <td key={i} className={`${cell} text-center`}>{fmtNilai(t.semester_list[i]?.sel[mi]?.nilai)}</td>)}
                <td className={`${cell} text-center font-semibold`}>{avg === null ? "" : avg.toFixed(1)}</td>
              </tr>
            );
          })}
          {t.mapel.length === 0 ? <tr><td colSpan={8} className={`${cell} py-3 text-center text-slate-500`}>Belum ada nilai akhir semester yang dikunci.</td></tr> : null}
        </tbody>
      </table>
      <div className="mt-10 grid grid-cols-2 text-center text-[12px]">
        <div><p>Wali Kelas,</p><div className="h-20" /><p className="font-semibold underline">{t.wali_nama || "........................"}</p></div>
        <div><p>Kebonagung, {fmtTanggal(t.tanggal_cetak)}<br />Kepala Madrasah,</p><div className="h-16" /><p className="font-semibold underline">{t.kepala_nama || "........................"}</p></div>
      </div>
    </Paper>
  );
}

export default function DokumenSiswa() {
  const { siswaId, doc } = useParams<{ siswaId: string; doc: string }>();
  const [params] = useSearchParams();
  const isTranskrip = doc === "transkrip";
  const qs = `tahun=${encodeURIComponent(params.get("tahun") ?? "")}&semester=${params.get("semester") ?? ""}`;
  const rapot = useQuery({
    queryKey: ["cetak", siswaId, qs, "akhir"],
    queryFn: () => apiGet<CetakRapot>(`/cetak/${siswaId}?${qs}&jenis=akhir`),
    enabled: !!siswaId && !isTranskrip,
    retry: false,
  });
  const transkrip = useQuery({
    queryKey: ["transkrip", siswaId],
    queryFn: () => apiGet<TranskripOut>(`/cetak/${siswaId}/transkrip`),
    enabled: !!siswaId && isTranskrip,
    retry: false,
  });
  const q = isTranskrip ? transkrip : rapot;
  let body: React.ReactNode = <StateBox loading={q.isLoading} error={q.error} />;
  if (isTranskrip && transkrip.data) body = <Transkrip t={transkrip.data} />;
  if (!isTranskrip && rapot.data) {
    const d = rapot.data;
    body = doc === "cover" ? <Cover d={d} /> : doc === "identitas" ? <Identitas d={d} /> : doc === "petunjuk" ? <Petunjuk d={d} /> : doc === "mutasi" ? <Mutasi d={d} /> : <StateBox loading={false} error={new Error("Dokumen tidak dikenal")} />;
  }
  return <PrintShell ready={!!q.data}>{body}</PrintShell>;
}
