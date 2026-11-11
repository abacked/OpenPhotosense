"use client";

import { Button, SegmentedControl } from "glisse";
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

  const selected = options.find((option) => option.id === strategy)!;
  return (
    <div>
      <h2 className="section-title">Safer version · Experimental</h2>
      <div className="card p-5 sm:p-6">
        <p className="text-[22px] font-bold tracking-[-.02em]">Generate a safer version</p>
        <p className="mt-1 text-[15px] leading-[1.45] text-muted">Your original file is never overwritten. Recommended: <span className="text-ink">{recommendation.label}.</span> {recommendation.reason}</p>
        <div className={`mt-5 ${generating ? "pointer-events-none opacity-50" : ""}`}>
          <SegmentedControl
            aria-label="Correction method"
            items={options.map((option) => ({ value: option.id, label: option.title.split(" ")[0] }))}
            value={strategy}
            onValueChange={(value) => { setStrategy(value as FixStrategy); setDownloadUrl(""); }}
          />
        </div>
        <div className="mt-4 rounded-2xl bg-fill/[.12] px-4 py-3">
          <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[15px]"><span className="font-semibold">{selected.title}</span><span className="text-[13px] text-muted">{selected.id === recommendation.strategy ? "Recommended" : selected.note}</span></p>
          <p className="mt-0.5 text-[13px] leading-5 text-muted">{selected.copy}</p>
        </div>
        {generating && (
          <div className="mt-5" aria-live="polite">
            <div className="flex items-baseline justify-between gap-4 text-[15px]"><span>Generating safer video</span><span className="tabular-nums text-muted">{progress}%</span></div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-fill/20"><div className="h-1 rounded-full bg-accent transition-all" style={{ width: `${progress}%` }} /></div>
            <Button onClick={cancel} destructive className="mt-4">Cancel</Button>
          </div>
        )}
        {error && <p role="alert" className="mt-4 text-[15px] text-danger">{error}</p>}
        {downloadUrl && (
          <div className="mt-6"><VideoPreview src={downloadUrl} events={strategy === "remove" ? [] : report.events} duration={report.duration_seconds} title={`Preview · ${format.toUpperCase()}`} description={strategy === "remove" ? "Risky intervals were removed; drag anywhere to review the new timeline." : "Corrected moments remain highlighted. Drag anywhere to review the result."} /></div>
        )}
        <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          {downloadUrl
            ? <a className="lg-glass lg-button" data-variant="filled" href={downloadUrl} download={`${file.name.replace(/\.[^.]+$/, "")}-${strategy}-safer.${format}`}>Download {format.toUpperCase()}</a>
            : !generating && <Button variant="filled" onClick={generate}>Generate</Button>}
          {downloadUrl && format === "webm" && <p className="text-[13px] text-warn">This browser cannot record MP4 directly, so it used WebM as a fallback.</p>}
        </div>
      </div>
      <p className="mt-2 px-4 text-[13px] text-muted">Generated on this device. Keep this tab open and always review before publishing.</p>
    </div>
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
