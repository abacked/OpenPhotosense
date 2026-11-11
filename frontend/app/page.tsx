"use client";

import { Glass } from "glisse";
import { useEffect, useState } from "react";
import { Results } from "@/components/results";
import { ThemeToggle } from "@/components/theme-toggle";
import { UploadZone } from "@/components/upload-zone";
import { scanVideoInBrowser } from "@/lib/browser-scanner";
import type { AnalysisReport } from "@/lib/types";

const steps = [
  ["Frame analysis", "Samples luminance and contrast changes across the complete video."],
  ["Frequency windows", "Highlights intervals that exceed three flashes per second."],
  ["Reviewable report", "Lists exact timestamps and red-flash warnings for editorial review."],
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
    <main className="min-h-screen bg-paper">
      <div className="sticky top-3 z-20 px-3 sm:top-5 sm:px-6">
        <Glass className="mx-auto flex max-w-[760px] items-center justify-between gap-3 rounded-full py-2 pl-5 pr-2 [--lg-blur:14px]">
          <a href="#" className="min-w-0 truncate text-[17px] font-semibold tracking-[-.02em]">OpenPhotosense</a>
          <div className="flex items-center gap-4 text-[15px]">
            <a href="https://github.com/abacked/OpenPhotosense" target="_blank" rel="noreferrer" className="hidden text-accent hover:opacity-70 sm:block">GitHub</a>
            <ThemeToggle />
          </div>
        </Glass>
      </div>

      <div className="mx-auto max-w-[720px] px-4 pb-24 pt-12 sm:px-6 sm:pt-20">
        <header className="px-1 sm:px-4">
          <h1 className="text-balance text-[34px] font-bold leading-[1.1] tracking-[-.025em] sm:text-[48px]">Check every flash before they see it.</h1>
          <p className="mt-4 max-w-[34rem] text-[17px] leading-[1.5] text-muted sm:text-[19px]">Scan video for rapid flashes, red-dominant transitions, and high-contrast changes using open, explainable accessibility checks.</p>
        </header>

        <section className="mt-10">
          <UploadZone onFile={upload} disabled={busy} />
          {busy && (
            <div className="card mt-4 p-5" aria-live="polite">
              <div className="flex items-baseline justify-between gap-4 text-[15px]">
                <span className="min-w-0 truncate">Scanning {filename}</span>
                <span className="shrink-0 tabular-nums text-muted">{progress}%</span>
              </div>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-fill/20"><div className="h-1 rounded-full bg-accent transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              <p className="mt-3 text-[13px] text-muted">Keep this tab open while frames are analyzed.</p>
            </div>
          )}
          {error && <p role="alert" className="card mt-4 p-5 text-[15px] text-danger">{error}</p>}
          {report && videoFile && videoUrl && <Results report={report} file={videoFile} videoUrl={videoUrl} />}
        </section>

        <section className="mt-12">
          <h2 className="section-title">How it works</h2>
          <ul className="card">
            {steps.map(([title, copy]) => (
              <li key={title} className="row">
                <p className="text-[17px]">{title}</p>
                <p className="mt-0.5 text-[15px] text-muted">{copy}</p>
              </li>
            ))}
          </ul>
        </section>

        <footer className="mt-10 px-4 text-[13px] leading-5 text-muted">Processing stays in your browser. OpenPhotosense is an accessibility screening aid, not a medical diagnostic tool or a guarantee of WCAG conformance.</footer>
      </div>
    </main>
  );
}
