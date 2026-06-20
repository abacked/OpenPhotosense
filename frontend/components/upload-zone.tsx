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
      className={`rounded-[2rem] border-2 border-dashed p-8 text-center transition sm:p-12 ${dragging ? "border-signal bg-signal/10" : "border-black/15 bg-white/70 dark:border-white/15 dark:bg-white/[.04]"}`}
    >
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-ink text-2xl text-white dark:bg-white dark:text-ink">↑</div>
      <p className="font-display text-xl font-semibold">Drop your video here</p>
      <p className="mt-2 text-sm text-black/55 dark:text-white/55">MP4, MOV, WebM, MKV or AVI · up to 500 MB</p>
      <button disabled={disabled} onClick={() => input.current?.click()} className="mt-6 rounded-full bg-signal px-6 py-3 text-sm font-bold text-white transition hover:bg-[#148b60] disabled:opacity-50">
        Choose a video
      </button>
      <input ref={input} type="file" accept="video/*,.mkv" hidden onChange={(event) => accept(event.target.files?.[0])} />
    </div>
  );
}

