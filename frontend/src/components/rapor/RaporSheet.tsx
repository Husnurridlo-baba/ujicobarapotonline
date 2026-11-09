import type { CetakRapot } from "@/types";
import { Paper } from "@/components/rapor/PrintShell";
import { fmtNilai, fmtTanggal, SEMESTER_LABEL } from "@/lib/format";

export { fmtNilai };

const NEXT: Record<string, string> = { X: "XI", XI: "XII" };
const tingkatOf = (kelas: string) => kelas.split(/[-\s]/)[0].toUpperCase();

/** Kotak keputusan kenaikan — hanya rapor akhir semester genap. */
function Keputusan({ data }: { data: CetakRapot }) {
  const t = tingkatOf(data.kelas_nama || "");
  const next = NEXT[t];
  const k = data.keputusan;
  const opt = (aktif: boolean, text: string) => (
    <span className={aktif ? "font-bold" : "text-slate-400 line-through"}>{text}</span>
  );
  return (
    <div className="mt-4 border border-slate-500 px-3 py-2 text-[12px]" data-testid="rapor-keputusan">
      <p>Berdasarkan hasil yang dicapai pada semester ganjil dan genap, peserta didik ditetapkan:</p>
      {!k ? (
        <p className="mt-1 font-semibold">{next ? `Naik ke kelas ${next} / Tinggal di kelas ${t}` : "Lulus / Tidak Lulus"} <span className="font-normal">*)</span></p>
      ) : k === "lulus" ? (
        <p className="mt-1 font-bold">LULUS dari {data.nama_sekolah}</p>
      ) : (
        <p className="mt-1">
          {opt(k === "naik", `NAIK ke kelas ${next ?? "berikutnya"}`)} / {opt(k === "tinggal", `TINGGAL di kelas ${t || data.kelas_nama}`)}
        </p>
      )}
      {!k ? <p className="mt-1 text-[10px] text-slate-500">*) Coret yang tidak perlu</p> : null}
    </div>
  );
}

export function Kop({ data }: { data: Pick<CetakRapot, "kop_image"> }) {
  return data.kop_image ? (
    <img src={data.kop_image} alt="Kop surat" className="mb-3 w-full" />
  ) : (
    <div className="mb-3 text-center">
      <p className="text-sm font-bold uppercase">Yayasan Pondok Pesantren Nurul Qur'an</p>
      <p className="font-heading text-lg font-black uppercase tracking-wide">Madrasah Aliyah Nurul Qur'an Kebonagung</p>
      <p className="text-[11px]">NSM: 131235170021 · NPSN: 69981234 · Akreditasi A</p>
      <p className="text-[11px]">Jl. Pesantren No. 01, Kebonagung, Kabupaten Pacitan, Jawa Timur</p>
      <div className="mt-2 border-b-[3px] border-double border-black" />
    </div>
  );
}

export function TtdTiga({ data }: { data: CetakRapot }) {
  return (
    <div className="mt-10 grid grid-cols-3 gap-4 text-center text-[12px]">
      <div>
        <p>Mengetahui,<br />Orang Tua/Wali Murid</p>
        <div className="h-20" />
        <p className="underline">( ........................................ )</p>
      </div>
      <div>
        <p>Kebonagung, {fmtTanggal(data.tanggal_cetak)}<br />Wali Kelas,</p>
        <div className="h-20" />
        <p className="font-semibold underline">{data.wali_nama || "........................"}</p>
        {data.wali_nip ? <p>NIP. {data.wali_nip}</p> : null}
      </div>
      <div>
        <p>Mengetahui,<br />Kepala Madrasah,</p>
        <div className="h-20" />
        <p className="font-semibold underline">{data.kepala_nama || "........................"}</p>
        {data.kepala_nip ? <p>NIP. {data.kepala_nip}</p> : null}
      </div>
    </div>
  );
}

const cell = "border border-slate-500 px-2 py-1";

export default function RaporSheet({ data }: { data: CetakRapot }) {
  const tengah = data.jenis === "tengah";
  const tampilKeputusan = !tengah && data.semester === "genap";
  const adaBelumKunci = data.baris.some((b) => !b.terkunci);
  return (
    <Paper watermark={data.nama_sekolah}>
      <Kop data={data} />
      <h2 className="text-center font-heading text-base font-bold uppercase underline" data-testid="rapor-judul">
        {tengah ? "Laporan Hasil Belajar Tengah Semester" : "Laporan Hasil Belajar Akhir Semester"}
      </h2>
      <p className="text-center text-xs">Semester {SEMESTER_LABEL[data.semester] ?? data.semester} · Tahun Pelajaran {data.tahun}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-8 text-[12px]">
        <p>Nama Peserta Didik: <strong>{data.siswa_nama}</strong></p>
        <p>NISN / NISM: {data.siswa_nisn || "-"} / {data.siswa_nism || "-"}</p>
        <p>Kelas: {data.kelas_nama || "-"}</p>
        <p>Madrasah: {data.nama_sekolah}</p>
      </div>

      <table className="mt-3 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-slate-100">
            <th className={`${cell} w-[5%] text-center`}>No</th>
            <th className={`${cell} text-left`}>Mata Pelajaran</th>
            <th className={`${cell} w-[10%] text-center`}>KKM</th>
            <th className={`${cell} w-[15%] text-center`}>Nilai Rapor</th>
            <th className={`${cell} w-[13%] text-center`}>Predikat</th>
          </tr>
        </thead>
        <tbody>
          {data.baris.map((b, i) => (
            <tr key={i} className="odd:bg-white even:bg-slate-50">
              <td className={`${cell} text-center`}>{i + 1}</td>
              <td className={cell}>{b.mapel_nama}{!b.terkunci ? <span className="no-print ml-1 text-[10px] text-amber-700">(belum dikunci)</span> : null}</td>
              <td className={`${cell} text-center`}>{b.kkm}</td>
              <td className={`${cell} text-center font-semibold`}>{fmtNilai(b.nilai_rapot)}</td>
              <td className={`${cell} text-center font-semibold`}>{b.predikat}</td>
            </tr>
          ))}
          {data.baris.length === 0 ? (
            <tr><td colSpan={5} className={`${cell} py-3 text-center text-slate-500`}>Belum ada mata pelajaran yang ditugaskan untuk kelas ini.</td></tr>
          ) : null}
        </tbody>
      </table>
      {adaBelumKunci ? <p className="no-print mt-1 text-[11px] text-amber-700">Mapel bertanda "belum dikunci" belum disetujui Waka Kurikulum, sehingga nilainya kosong.</p> : null}

      <div className="mt-4 grid grid-cols-2 gap-6 text-[12px]">
        <div>
          <h3 className="font-bold">Kehadiran</h3>
          <table className="mt-1 w-full border-collapse">
            <tbody>
              <tr><td className={cell}>Sakit (S)</td><td className={`${cell} text-center`}>{data.sakit} hari</td></tr>
              <tr><td className={cell}>Izin (I)</td><td className={`${cell} text-center`}>{data.izin} hari</td></tr>
              <tr><td className={cell}>Tanpa Keterangan (A)</td><td className={`${cell} text-center`}>{data.alpa} hari</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3 className="font-bold">Ekstrakurikuler</h3>
          {data.ekskul_nama ? (
            <p className="mt-1">{data.ekskul_nama} — Predikat <strong>{data.ekskul_predikat || "-"}</strong>{data.ekskul_keterangan ? ` (${data.ekskul_keterangan})` : ""}</p>
          ) : <p className="mt-1 text-slate-500">-</p>}
        </div>
      </div>

      {tampilKeputusan ? <Keputusan data={data} /> : null}

      <div className="mt-4 text-[12px]">
        <h3 className="font-bold">Catatan Wali Kelas</h3>
        <p className="min-h-10">{data.catatan || "-"}</p>
      </div>

      <TtdTiga data={data} />
    </Paper>
  );
}
