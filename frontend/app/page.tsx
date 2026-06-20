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
    <main className="min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px] overflow-hidden">
        <div className="ambient-orb absolute -right-16 top-10 size-80 rounded-full bg-signal/15 blur-3xl" />
        <div className="ambient-orb-reverse absolute -left-20 top-0 size-72 rounded-full bg-blue-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(255,255,255,.7),transparent_38%)] opacity-50 dark:opacity-10" />
      </div>
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <a href="#" className="font-display text-lg font-extrabold tracking-tight"><span className="logo-mark mr-2 inline-block size-3 rotate-45 rounded-sm bg-signal" />OpenPhotosense</a>
        <div className="flex items-center gap-4"><a href="https://github.com" className="hidden text-sm font-semibold opacity-60 hover:opacity-100 sm:block">Open source</a><ThemeToggle /></div>
      </nav>
      <div className="mx-auto max-w-4xl px-5 pb-24 pt-14 sm:px-8 sm:pt-24">
        <header className="animate-rise text-center">
          <div className="inline-flex rounded-full border border-signal/25 bg-signal/10 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-[#08754e] dark:text-[#6be0b4]">Built for safer publishing</div>
          <h1 className="mx-auto mt-7 max-w-3xl font-display text-5xl font-bold leading-[.98] tracking-[-.055em] sm:text-7xl">Check every flash before they see it.</h1>
          <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-black/60 dark:text-white/60 sm:text-lg">Scan video for rapid flashes, red-dominant transitions, and high-contrast changes using open, explainable accessibility checks.</p>
        </header>
        <section className="mt-12 animate-rise [animation-delay:120ms]">
          <UploadZone onFile={upload} disabled={busy} />
          {busy && <div className="animate-rise mt-5 rounded-2xl bg-white p-5 shadow-soft dark:bg-white/[.05]" aria-live="polite"><div className="mb-3 flex justify-between gap-3 text-sm"><span className="truncate font-semibold">Scanning {filename}</span><span className="font-mono text-signal">{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/10"><div className="progress-shine h-full rounded-full bg-signal transition-all duration-500" style={{ width: `${progress}%` }} /></div><p className="mt-3 text-xs opacity-50">You can keep this tab open while frames are analyzed.</p></div>}
          {error && <p role="alert" className="mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
          {report && videoFile && videoUrl && <Results report={report} file={videoFile} videoUrl={videoUrl} />}
        </section>
        <section className="mt-24 grid gap-8 border-t border-black/10 pt-10 dark:border-white/10 sm:grid-cols-3">
          {[['01', 'Frame analysis', 'Samples luminance and contrast changes across the complete video.'], ['02', 'Frequency windows', 'Highlights intervals that exceed three flashes per second.'], ['03', 'Reviewable report', 'Lists exact timestamps and red-flash warnings for editorial review.']].map(([n, title, copy], index) => <div key={n} className="feature-card animate-rise rounded-2xl p-3" style={{ animationDelay: `${220 + index * 90}ms` }}><span className="font-mono text-xs text-signal">{n}</span><h2 className="mt-3 font-display font-bold">{title}</h2><p className="mt-2 text-sm leading-6 opacity-55">{copy}</p></div>)}
        </section>
        <footer className="mt-20 text-center text-xs leading-5 opacity-45">Processing stays in your browser. OpenPhotosense is an accessibility screening aid, not a medical diagnostic tool or a guarantee of WCAG conformance.</footer>
      </div>
    </main>
  );
}
