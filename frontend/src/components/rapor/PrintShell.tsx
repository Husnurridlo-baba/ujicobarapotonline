import type { ReactNode } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Toolbar + kertas putih bertanda air. `landscape` untuk leger. */
export function PrintShell({ children, ready, landscape }: { children: ReactNode; ready: boolean; landscape?: boolean }) {
  return (
    <div>
      {landscape ? <style>{"@page { size: A4 landscape; margin: 10mm; }"}</style> : null}
      <div className="no-print mb-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => window.history.back()} data-testid="cetak-back-btn">
          <ArrowLeft className="size-4" /> Kembali
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!ready} data-testid="print-rapor-submit-btn">
          <Printer className="size-4" /> Cetak
        </Button>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Paper({ children, watermark, landscape, className }: { children: ReactNode; watermark: string; landscape?: boolean; className?: string }) {
  return (
    <div
      className={cn(
        "print-sheet relative mx-auto bg-white px-[15mm] py-[15mm] text-[13px] leading-relaxed text-black shadow-2xl",
        landscape ? "min-h-[210mm] w-[297mm]" : "min-h-[297mm] w-[210mm]",
        className
      )}
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 flex select-none items-center justify-center overflow-hidden">
        <span className="whitespace-nowrap rotate-[-25deg] font-serif text-5xl font-black tracking-widest text-emerald-950 opacity-[0.06]">
          {watermark.toUpperCase()}
        </span>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export function StateBox({ loading, error }: { loading: boolean; error: unknown }) {
  return (
    <div className={cn("grid place-items-center rounded-xl border bg-white p-16 text-sm", loading ? "text-muted-foreground" : "text-destructive")} data-testid="cetak-state">
      {loading ? "Memuat dokumen…" : ((error as Error)?.message ?? "Dokumen tidak tersedia")}
    </div>
  );
}
