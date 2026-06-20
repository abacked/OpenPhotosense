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
    <section className="rounded-[2rem] border border-signal/25 bg-signal/[.07] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-signal">Auto-fix mode</p><h3 className="mt-2 font-display text-2xl font-bold">Generate a safer version</h3><p className="mt-2 max-w-2xl text-sm leading-6 opacity-60">Choose how OpenPhotosense should handle detected risks. Your original file is never overwritten.</p></div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-white/10">Experimental</span>
      </div>
      <div className="mt-6 rounded-2xl border border-signal/25 bg-white/70 p-4 dark:bg-white/[.06]">
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-signal text-sm font-black text-white">✓</span>
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-signal">Recommended for this footage</p><p className="mt-1 text-sm leading-6"><strong>{recommendation.label}.</strong> {recommendation.reason}</p></div>
        </div>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {options.map((option) => <button key={option.id} type="button" disabled={generating} onClick={() => { setStrategy(option.id); setDownloadUrl(""); }} className={`lift-card rounded-2xl border p-4 text-left ${strategy === option.id ? "border-signal bg-white shadow-sm dark:bg-white/10" : "border-black/10 hover:border-signal/50 dark:border-white/10"}`}><span className="text-xs font-bold uppercase tracking-wider text-signal">{option.id === recommendation.strategy ? "Recommended" : option.note}</span><strong className="mt-2 block">{option.title}</strong><span className="mt-2 block text-xs leading-5 opacity-55">{option.copy}</span></button>)}
      </div>
      {generating && <div className="mt-6" aria-live="polite"><div className="mb-2 flex items-center justify-between gap-4 text-sm font-semibold"><span>Generating safer video · {progress}%</span><button type="button" onClick={cancel} className="rounded-full border border-black/15 px-4 py-2 text-xs font-bold hover:border-red-400 hover:text-red-600 dark:border-white/20">Cancel generation</button></div><div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"><div className="h-full rounded-full bg-signal transition-all" style={{ width: `${progress}%` }} /></div></div>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {downloadUrl && (
        <div className="mt-6"><VideoPreview src={downloadUrl} events={strategy === "remove" ? [] : report.events} duration={report.duration_seconds} title={`Safer video preview · ${format.toUpperCase()}`} description={strategy === "remove" ? "Risky intervals were removed; drag anywhere to review the new timeline." : "Corrected moments remain highlighted. Drag anywhere to review the result."} /></div>
      )}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {downloadUrl ? <a className="rounded-full bg-signal px-6 py-3 text-sm font-bold text-white hover:bg-[#148b60]" href={downloadUrl} download={`${file.name.replace(/\.[^.]+$/, "")}-${strategy}-safer.${format}`}>Download {format.toUpperCase()}</a> : <button type="button" disabled={generating} onClick={generate} className="rounded-full bg-signal px-6 py-3 text-sm font-bold text-white hover:bg-[#148b60] disabled:opacity-50">Generate safer version</button>}
        {downloadUrl && format === "webm" && <p className="text-xs text-amber-700 dark:text-amber-300">This browser cannot record MP4 directly, so it used WebM as a fallback.</p>}
        <p className="text-xs opacity-50">Generated locally in your browser. Keep this tab open and always review before publishing.</p>
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
