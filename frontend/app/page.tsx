"use client";

import { Glass } from "glisse";
import { useEffect, useState } from "react";
import { Results } from "@/components/results";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadZone } from "@/components/upload-zone";
import { scanVideoInBrowser } from "@/lib/browser-scanner";
import type { AnalysisReport } from "@/lib/types";

const steps = [
  ["01", "Frame analysis", "Samples luminance and contrast changes across the complete video."],
  ["02", "Frequency windows", "Highlights intervals that exceed three flashes per second."],
  ["03", "Reviewable report", "Lists exact timestamps and red-flash warnings for editorial review."],
];

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
    <main className="min-h-screen">
      <div className="sticky top-3 z-20 px-3 sm:top-5 sm:px-6">
        <Glass className="mx-auto flex max-w-[960px] items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 [--lg-blur:14px] sm:pl-5">
          <a href="#" className="min-w-0 truncate text-[11px] font-[650] uppercase tracking-[.16em] sm:text-sm sm:tracking-[.26em]">OpenPhotosense</a>
          <div className="flex items-center gap-5 text-[13px]">
            <a href="https://github.com/abacked/OpenPhotosense" target="_blank" rel="noreferrer" className="hidden hover:opacity-60 sm:block">Source</a>
            <ThemeToggle />
          </div>
        </Glass>
      </div>

      <div className="mx-auto max-w-[720px] px-5 pb-24 pt-14 sm:px-8 sm:pt-24">
        <header>
          <p className="eyebrow">Flash safety scanner</p>
          <h1 className="mt-4 text-[34px] font-[620] leading-[1.05] tracking-[-.055em] text-balance sm:text-[44px]">Check every flash before they see it.</h1>
          <p className="mt-5 max-w-[30rem] text-[17px] leading-[1.65] text-muted">Scan video for rapid flashes, red-dominant transitions, and high-contrast changes using open, explainable accessibility checks.</p>
        </header>

        <section className="mt-12">
          <UploadZone onFile={upload} disabled={busy} />
          {busy && (
            <Glass className="panel mt-4" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <span className="min-w-0 truncate">Scanning {filename}</span>
                <span className="shrink-0 tabular-nums text-muted">{progress}%</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-line/[.1]"><div className="h-1 rounded-full bg-[var(--lg-fill)] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3 text-[13px] text-muted">Keep this tab open while frames are analyzed.</p>
            </Glass>
          )}
          {error && <p role="alert" className="mt-6 text-sm text-red-700 dark:text-red-400">{error}</p>}
          {report && videoFile && videoUrl && <Results report={report} file={videoFile} videoUrl={videoUrl} />}
        </section>

        <Glass className="panel mt-20">
          <p className="eyebrow">How it works</p>
          <ul className="mt-3">
            {steps.map(([n, title, copy]) => (
              <li key={n} className="rule grid gap-1 border-b py-4 last:border-b-0 text-sm sm:grid-cols-[3rem_11rem_1fr] sm:gap-4">
                <span className="font-medium tabular-nums">{n}</span>
                <span className="font-medium">{title}</span>
                <span className="text-muted">{copy}</span>
              </li>
            ))}
          </ul>
        </Glass>

        <footer className="mt-16 max-w-[34rem] text-[13px] leading-6 text-muted">Processing stays in your browser. OpenPhotosense is an accessibility screening aid, not a medical diagnostic tool or a guarantee of WCAG conformance.</footer>
      </div>
    </main>
  );
}
