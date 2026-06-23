"use client";

import { DragEvent, useRef, useState } from "react";

const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

export function UploadZone({ onFile, disabled }: { onFile: (file: File) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(file?: File) {
    if (file && (ACCEPTED.includes(file.type) || file.name.match(/\.(avi|m4v|mkv|mov)$/i))) onFile(file);
  }

  function drop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    accept(event.dataTransfer.files[0]);
  }

  return (
    <div
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={`upload-zone rounded-[2rem] border p-3 shadow-soft transition duration-300 sm:p-4 ${dragging ? "is-dragging scale-[1.01] border-signal bg-signal/10 ring-4 ring-signal/10" : "border-black/[.08] bg-white/80 hover:border-signal/30 dark:border-white/10 dark:bg-white/[.05]"}`}
    >
      <div className="rounded-[1.45rem] bg-[linear-gradient(135deg,rgba(25,169,116,.08),transparent_55%)] px-5 py-7 dark:bg-[linear-gradient(135deg,rgba(25,169,116,.13),rgba(255,255,255,.015)_55%)] sm:px-7 sm:py-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:text-left">
          <div className="upload-icon grid size-16 shrink-0 place-items-center rounded-2xl bg-ink text-white shadow-lg dark:bg-white dark:text-ink">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5"/><path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-xl font-bold">{dragging ? "Release to scan" : "Drop a video to begin"}</p>
            <p className="mt-1.5 text-sm leading-6 text-black/50 dark:text-white/50">We’ll analyze flashes, red transitions, and contrast changes directly on this device.</p>
          </div>
          <button disabled={disabled} onClick={() => input.current?.click()} className="shrink-0 rounded-full bg-signal px-6 py-3 text-sm font-bold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#148b60] hover:shadow-lg active:translate-y-0 disabled:opacity-50">
            Choose video
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:justify-start sm:pl-[5.5rem]">
          <span className="rounded-full bg-black/[.045] px-3 py-1.5 text-[11px] font-semibold dark:bg-white/[.07]">MP4 · MOV · WebM</span>
          <span className="rounded-full bg-black/[.045] px-3 py-1.5 text-[11px] font-semibold dark:bg-white/[.07]">Up to 500 MB</span>
          <span className="rounded-full bg-signal/10 px-3 py-1.5 text-[11px] font-bold text-[#08754e] dark:text-[#6be0b4]">Stays in your browser</span>
        </div>
      </div>
      <input ref={input} type="file" accept="video/*,.mkv" hidden onChange={(event) => accept(event.target.files?.[0])} />
    </div>
  );
}
