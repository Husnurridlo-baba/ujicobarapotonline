import { Badge } from "@/components/ui/badge";
import type { StatusNilai } from "@/types";

const MAP: Record<StatusNilai, { label: string; cls: string }> = {
  draft: { label: "Draf", cls: "bg-slate-100 text-slate-700" },
  dikirim: { label: "Menunggu Reviu", cls: "bg-sky-100 text-sky-800" },
  revisi: { label: "Perlu Revisi", cls: "bg-amber-100 text-amber-800" },
  terkunci: { label: "Terkunci", cls: "bg-emerald-100 text-emerald-800" },
};

export function StatusBadge({ status, testid }: { status: StatusNilai; testid?: string }) {
  const m = MAP[status] ?? MAP.draft;
  return (
    <Badge className={m.cls} data-testid={testid}>
      {m.label}
    </Badge>
  );
}
