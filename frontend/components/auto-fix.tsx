"use client";

import { useEffect, useRef, useState } from "react";
import { generateSaferVideo } from "@/lib/browser-fixer";
import type { AnalysisReport, FixStrategy } from "@/lib/types";
import { VideoPreview } from "@/components/video-preview";

const options: Array<{ id: FixStrategy; title: string; copy: string; note: string }> = [
  { id: "smooth", title: "Smooth rapid changes", copy: "Strongly holds the previous safe frame through flashes, then eases back without creating a hard cut.", note: "Best default" },
  { id: "dim", title: "Dim flagged moments", copy: "Darkens risky windows and reduces saturation around detected red flashes.", note: "Least editing" },
  { id: "remove", title: "Remove risky moments", copy: "Cuts short flagged intervals from the video and audio for the strongest intervention.", note: "Most protective" },
];

export function AutoFix({ file, report }: { file: File; report: AnalysisReport }) {
  const recommendation = recommendStrategy(report);
  const [strategy, setStrategy] = useState<FixStrategy>(() => recommendation.strategy);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [format, setFormat] = useState<"mp4" | "webm">("mp4");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { controller.current?.abort(); if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  async function generate() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setError(""); setDownloadUrl(""); setProgress(1); setGenerating(true);
    controller.current = new AbortController();
    try {
      const result = await generateSaferVideo(file, report, strategy, setProgress, controller.current.signal);
      setFormat(result.type.includes("mp4") ? "mp4" : "webm");
      setDownloadUrl(URL.createObjectURL(result));
    }
    catch (reason) { if (!(reason instanceof DOMException && reason.name === "AbortError")) setError(reason instanceof Error ? reason.message : "Could not start Auto-fix."); setProgress(0); }
    finally { controller.current = null; setGenerating(false); }
  }

  function cancel() { controller.current?.abort(); }

  return (
    <section>
      <p className="eyebrow">Safer version · Experimental</p>
      <h2 className="mt-4 text-[28px] font-[620] leading-[1.1] tracking-[-.045em]">Generate a safer version</h2>
      <p className="mt-3 text-[15px] leading-[1.65] text-muted">Choose how OpenPhotosense should handle detected risks. Your original file is never overwritten.</p>
      <p className="mt-6 text-sm leading-6"><span className="font-medium">Recommended: {recommendation.label}.</span> <span className="text-muted">{recommendation.reason}</span></p>
      <div className="rule mt-6 border-t" role="radiogroup" aria-label="Correction method">
        {options.map((option) => (
          <button key={option.id} type="button" role="radio" aria-checked={strategy === option.id} disabled={generating} onClick={() => { setStrategy(option.id); setDownloadUrl(""); }} className="rule flex w-full items-start gap-4 border-b py-4 text-left transition-opacity hover:opacity-80 disabled:opacity-50">
            <span className={`mt-1 grid size-4 shrink-0 place-items-center rounded-full border ${strategy === option.id ? "border-ink" : "border-line/30"}`}>{strategy === option.id && <span className="size-2 rounded-full bg-ink" />}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3"><strong className="text-sm font-medium">{option.title}</strong><span className="text-[11px] uppercase tracking-[.18em] text-muted">{option.id === recommendation.strategy ? "Recommended" : option.note}</span></span>
              <span className="mt-1 block text-[13px] leading-5 text-muted">{option.copy}</span>
            </span>
          </button>
        ))}
      </div>
      {generating && (
        <div className="mt-6" aria-live="polite">
          <div className="flex items-baseline justify-between gap-4 text-sm"><span>Generating safer video</span><span className="tabular-nums text-muted">{progress}%</span></div>
          <div className="mt-3 h-px bg-line/[.12]"><div className="h-px bg-ink transition-all" style={{ width: `${progress}%` }} /></div>
          <button type="button" onClick={cancel} className="link mt-3 text-[13px] text-muted">Cancel generation</button>
        </div>
      )}
      {error && <p role="alert" className="mt-5 text-sm text-red-700 dark:text-red-400">{error}</p>}
      {downloadUrl && (
        <div className="mt-8"><VideoPreview src={downloadUrl} events={strategy === "remove" ? [] : report.events} duration={report.duration_seconds} title={`Safer video preview · ${format.toUpperCase()}`} description={strategy === "remove" ? "Risky intervals were removed; drag anywhere to review the new timeline." : "Corrected moments remain highlighted. Drag anywhere to review the result."} /></div>
      )}
      <div className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
        {downloadUrl ? <a className="button" href={downloadUrl} download={`${file.name.replace(/\.[^.]+$/, "")}-${strategy}-safer.${format}`}>Download {format.toUpperCase()}</a> : <button type="button" disabled={generating} onClick={generate} className="button">Generate safer version</button>}
        {downloadUrl && format === "webm" && <p className="text-[13px] text-amber-700 dark:text-amber-400">This browser cannot record MP4 directly, so it used WebM as a fallback.</p>}
        <p className="text-[13px] text-muted">Generated locally. Keep this tab open and always review before publishing.</p>
      </div>
    </section>
  );
}

function recommendStrategy(report: AnalysisReport): { strategy: FixStrategy; label: string; reason: string } {
  const frequencies = Object.values(report.flashes_per_second);
  const peakFrequency = Math.max(0, ...frequencies);
  const unsafeSeconds = frequencies.filter((count) => count > 3).length;
  const redShare = report.red_flash_events / Math.max(report.total_flash_events, 1);

  if (report.total_flash_events === 0) {
    return { strategy: "smooth", label: "No automatic correction is necessary", reason: "No risky transitions were detected. Smooth is the least disruptive fallback if you still want to create an edited copy." };
  }
  if (report.risk_score >= 85 || peakFrequency >= 6 || unsafeSeconds >= 3) {
    return { strategy: "remove", label: "Remove risky moments", reason: "This footage has sustained or very dense flashing, so removing the flagged intervals offers the strongest protection." };
  }
  if (report.red_flash_events > 0 && redShare >= 0.3) {
    return { strategy: "dim", label: "Dim flagged moments", reason: "Red-dominant flashes make up a significant share of the warnings; targeted dimming and desaturation directly addresses them while preserving the timeline." };
  }
  return { strategy: "smooth", label: "Smooth rapid changes", reason: "The warnings are brief enough for temporal smoothing to reduce abrupt luminance changes without cutting the footage." };
}
