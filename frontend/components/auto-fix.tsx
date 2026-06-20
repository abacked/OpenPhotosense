"use client";

import { useEffect, useState } from "react";
import { generateSaferVideo } from "@/lib/browser-fixer";
import type { AnalysisReport, FixStrategy } from "@/lib/types";

const options: Array<{ id: FixStrategy; title: string; copy: string; note: string }> = [
  { id: "smooth", title: "Smooth rapid changes", copy: "Blends neighboring frames and reduces flicker while preserving the complete timeline.", note: "Best default" },
  { id: "dim", title: "Dim flagged moments", copy: "Darkens risky windows and reduces saturation around detected red flashes.", note: "Least editing" },
  { id: "remove", title: "Remove risky moments", copy: "Cuts short flagged intervals from the video and audio for the strongest intervention.", note: "Most protective" },
];

export function AutoFix({ file, report }: { file: File; report: AnalysisReport }) {
  const [strategy, setStrategy] = useState<FixStrategy>("smooth");
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  useEffect(() => () => { if (downloadUrl) URL.revokeObjectURL(downloadUrl); }, [downloadUrl]);

  async function generate() {
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setError(""); setDownloadUrl(""); setProgress(1); setGenerating(true);
    try { setDownloadUrl(URL.createObjectURL(await generateSaferVideo(file, report, strategy, setProgress))); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Could not start Auto-fix."); setProgress(0); }
    finally { setGenerating(false); }
  }

  return (
    <section className="rounded-[2rem] border border-signal/25 bg-signal/[.07] p-6 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-signal">Auto-fix mode</p><h3 className="mt-2 font-display text-2xl font-bold">Generate a safer version</h3><p className="mt-2 max-w-2xl text-sm leading-6 opacity-60">Choose how OpenPhotosense should handle detected risks. Your original file is never overwritten.</p></div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-white/10">Experimental</span>
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-3">
        {options.map((option) => <button key={option.id} type="button" disabled={generating} onClick={() => { setStrategy(option.id); setDownloadUrl(""); }} className={`rounded-2xl border p-4 text-left transition ${strategy === option.id ? "border-signal bg-white shadow-sm dark:bg-white/10" : "border-black/10 hover:border-signal/50 dark:border-white/10"}`}><span className="text-xs font-bold uppercase tracking-wider text-signal">{option.note}</span><strong className="mt-2 block">{option.title}</strong><span className="mt-2 block text-xs leading-5 opacity-55">{option.copy}</span></button>)}
      </div>
      {generating && <div className="mt-6" aria-live="polite"><div className="mb-2 flex justify-between text-sm font-semibold"><span>Generating safer video</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"><div className="h-full rounded-full bg-signal transition-all" style={{ width: `${progress}%` }} /></div></div>}
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        {downloadUrl ? <a className="rounded-full bg-signal px-6 py-3 text-sm font-bold text-white hover:bg-[#148b60]" href={downloadUrl} download={`${file.name.replace(/\.[^.]+$/, "")}-${strategy}-safer.webm`}>Download safer version</a> : <button type="button" disabled={generating} onClick={generate} className="rounded-full bg-signal px-6 py-3 text-sm font-bold text-white hover:bg-[#148b60] disabled:opacity-50">Generate safer version</button>}
        <p className="text-xs opacity-50">Generated locally in your browser. Keep this tab open and always review before publishing.</p>
      </div>
    </section>
  );
}
