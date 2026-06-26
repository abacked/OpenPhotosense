"use client";

import { useEffect, useState } from "react";
import { Results } from "@/components/results";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadZone } from "@/components/upload-zone";
import { scanVideoInBrowser } from "@/lib/browser-scanner";
import type { AnalysisReport } from "@/lib/types";

export default function Home() {
  const [filename, setFilename] = useState("");
  const [videoFile, setVideoFile] = useState<File>();
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<AnalysisReport>();
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  async function upload(file: File) {
    setError(""); setReport(undefined); setVideoFile(file); setFilename(file.name); setProgress(1); setUploading(true);
    setVideoUrl(URL.createObjectURL(file));
    try { setReport(await scanVideoInBrowser(file, setProgress)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Upload failed."); setProgress(0); }
    finally { setUploading(false); }
  }

  const busy = uploading;
  return (
    <main className="min-h-screen overflow-x-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] overflow-hidden sm:h-[620px]">
        <div className="ambient-orb absolute -right-28 top-16 size-64 rounded-full bg-signal/15 blur-3xl sm:-right-16 sm:top-10 sm:size-80" />
        <div className="ambient-orb-reverse absolute -left-28 top-4 size-60 rounded-full bg-blue-400/10 blur-3xl sm:-left-20 sm:top-0 sm:size-72" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,.7),transparent_38%)] opacity-50 dark:opacity-10" />
      </div>
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
        <a href="#" className="min-w-0 truncate font-display text-base font-extrabold tracking-tight sm:text-lg"><span className="logo-mark mr-2 inline-block size-3 rotate-45 rounded-sm bg-signal" />OpenPhotosense</a>
        <div className="flex shrink-0 items-center gap-3 sm:gap-4"><a href="https://github.com/abacked/OpenPhotosense" target="_blank" rel="noreferrer" className="hidden text-sm font-semibold opacity-60 hover:opacity-100 sm:block">Open source</a><ThemeToggle /></div>
      </nav>
      <div className="mx-auto max-w-4xl px-4 pb-20 pt-10 sm:px-8 sm:pb-24 sm:pt-24">
        <header className="animate-rise text-center">
          <div className="inline-flex rounded-full border border-signal/25 bg-signal/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#08754e] dark:text-[#6be0b4] sm:px-4 sm:text-xs sm:tracking-[.18em]">Built for safer publishing</div>
          <h1 className="mx-auto mt-6 max-w-3xl font-display text-4xl font-bold leading-[1.02] tracking-[-.05em] sm:mt-7 sm:text-7xl sm:leading-[.98] sm:tracking-[-.055em]">Check every flash before they see it.</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-black/60 dark:text-white/60 sm:mt-7 sm:text-lg sm:leading-7">Scan video for rapid flashes, red-dominant transitions, and high-contrast changes using open, explainable accessibility checks.</p>
        </header>
        <section className="mt-9 animate-rise [animation-delay:120ms] sm:mt-12">
          <UploadZone onFile={upload} disabled={busy} />
          {busy && <div className="animate-rise mt-5 rounded-2xl bg-white p-4 shadow-soft dark:bg-white/[.05] sm:p-5" aria-live="polite"><div className="mb-3 flex items-start justify-between gap-3 text-sm"><span className="min-w-0 truncate font-semibold">Scanning {filename}</span><span className="shrink-0 font-mono text-signal">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div className="h-full rounded-full bg-[#19a974] transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs leading-5 opacity-50">Keep this tab open while frames are analyzed.</p></div>}
          {error && <p role="alert" className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {report && videoFile && videoUrl && <Results report={report} file={videoFile} videoUrl={videoUrl} />}
        </section>
        <section className="mt-16 grid gap-5 border-t border-black/10 pt-8 dark:border-white/10 sm:mt-24 sm:grid-cols-3 sm:gap-8 sm:pt-10">
          {[['01', 'Frame analysis', 'Samples luminance and contrast changes across the complete video.'], ['02', 'Frequency windows', 'Highlights intervals that exceed three flashes per second.'], ['03', 'Reviewable report', 'Lists exact timestamps and red-flash warnings for editorial review.']].map(([n, title, copy], index) => <div key={n} className="feature-card animate-rise rounded-2xl p-3" style={{ animationDelay: `${220 + index * 90}ms` }}><span className="font-mono text-xs text-signal">{n}</span><h2 className="mt-3 font-display font-bold">{title}</h2><p className="mt-2 text-sm leading-6 opacity-55">{copy}</p></div>)}
        </section>
        <footer className="mt-20 text-center text-xs leading-5 opacity-45">Processing stays in your browser. OpenPhotosense is an accessibility screening aid, not a medical diagnostic tool or a guarantee of WCAG conformance.</footer>
      </div>
    </main>
  );
}
