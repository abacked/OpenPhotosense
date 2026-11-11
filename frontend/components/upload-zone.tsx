"use client";

import { DragEvent, useRef, useState } from "react";

const ACCEPTED = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska"];

export function UploadZone({ onFile, disabled }: { onFile: (file: File) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(file?: File) {
    if (disabled) return; // drops bypass the disabled button; a second scan would race the first
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
      className={`rule flex flex-col gap-5 border-y px-1 py-7 transition-colors sm:flex-row sm:items-center sm:justify-between ${dragging ? "bg-line/[.04]" : ""}`}
    >
      <div className="min-w-0">
        <p className="text-lg font-medium tracking-[-.02em]">{dragging ? "Release to scan" : "Drop a video to scan"}</p>
        <p className="mt-1 text-sm text-muted">MP4, MOV or WebM up to 500 MB. It never leaves this device.</p>
      </div>
      <button disabled={disabled} onClick={() => input.current?.click()} className="button shrink-0 self-start sm:self-auto">
        Choose video
      </button>
      <input ref={input} type="file" accept="video/*,.mkv" hidden onChange={(event) => accept(event.target.files?.[0])} />
    </div>
  );
}
