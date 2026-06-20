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
      className={`upload-zone rounded-[2rem] border-2 border-dashed p-8 text-center transition duration-300 sm:p-12 ${disabled ? "is-scanning" : ""} ${dragging ? "is-dragging scale-[1.01] border-signal bg-signal/10 shadow-soft" : "border-black/15 bg-white/70 hover:border-signal/45 hover:bg-white dark:border-white/15 dark:bg-white/[.04] dark:hover:bg-white/[.07]"}`}
    >
      <div className="upload-icon mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-ink text-2xl text-white dark:bg-white dark:text-ink">↑</div>
      <p className="font-display text-xl font-semibold">Drop your video here</p>
      <p className="mt-2 text-sm text-black/55 dark:text-white/55">MP4, MOV, WebM, MKV or AVI · up to 500 MB</p>
      <p className="mt-2 text-xs font-semibold text-signal">Private by design — the video never leaves your browser</p>
      <button disabled={disabled} onClick={() => input.current?.click()} className="mt-6 rounded-full bg-signal px-6 py-3 text-sm font-bold text-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:bg-[#148b60] hover:shadow-lg active:translate-y-0 disabled:opacity-50">
        Choose a video
      </button>
      <input ref={input} type="file" accept="video/*,.mkv" hidden onChange={(event) => accept(event.target.files?.[0])} />
    </div>
  );
}
