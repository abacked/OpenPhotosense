"use client";

import { Button } from "glisse";
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
      className={`card flex flex-col gap-4 p-5 transition-shadow sm:flex-row sm:items-center sm:justify-between sm:p-6 ${dragging ? "ring-2 ring-accent" : ""}`}
    >
      <div className="min-w-0">
        <p className="text-[17px] font-semibold">{dragging ? "Release to scan" : "Drop a video to scan"}</p>
        <p className="mt-0.5 text-[15px] text-muted">MP4, MOV or WebM up to 500 MB. It never leaves this device.</p>
      </div>
      <Button variant="filled" disabled={disabled} onClick={() => input.current?.click()} className="shrink-0 self-start sm:self-auto">
        Choose Video
      </Button>
      <input ref={input} type="file" accept="video/*,.mkv" hidden onChange={(event) => accept(event.target.files?.[0])} />
    </div>
  );
}
