"use client";

import { useMemo, useRef, useState } from "react";
import type { FlashEvent } from "@/lib/types";

const FLAG_WINDOW_SECONDS = 0.18;

export function VideoPreview({
  src,
  events,
  duration,
}: {
  src: string;
  events: FlashEvent[];
  duration: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const safeDuration = Math.max(duration, 0.01);
  const markers = useMemo(
    () => events.map((event, index) => ({ event, index, left: Math.min(event.timestamp_seconds / safeDuration * 100, 100) })),
    [events, safeDuration],
  );

  function seek(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(seconds, video.duration || safeDuration));
    setCurrentTime(video.currentTime);
    void video.play().catch(() => undefined);
  }

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft dark:bg-white/[.05] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Review flagged moments</h3>
          <p className="mt-1 text-sm opacity-55">Click a marker to jump directly to that transition.</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-amber-400" /> Flash</span>
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-red-500" /> Red flash</span>
        </div>
      </div>

      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        className="mt-5 aspect-video w-full rounded-2xl bg-black object-contain"
      >
        Your browser does not support video playback.
      </video>

      <div className="mt-5" aria-label="Video risk timeline">
        <div className="relative h-10">
          <div className="absolute inset-x-0 top-3 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            {markers.map(({ event, index, left }) => {
              const width = Math.max(FLAG_WINDOW_SECONDS / safeDuration * 100, 0.45);
              return <span key={`range-${index}`} className={`absolute inset-y-0 ${event.is_red_flash ? "bg-red-500/70" : "bg-amber-400/80"}`} style={{ left: `${left}%`, width: `${width}%` }} />;
            })}
            <span className="absolute inset-y-0 left-0 bg-signal/30" style={{ width: `${Math.min(currentTime / safeDuration * 100, 100)}%` }} />
          </div>
          {markers.map(({ event, index, left }) => (
            <button
              key={`${event.timestamp_seconds}-${index}`}
              type="button"
              onClick={() => seek(Math.max(0, event.timestamp_seconds - 0.6))}
              title={`${event.is_red_flash ? "Red flash" : "Flash"} at ${event.timestamp}`}
              aria-label={`Jump to ${event.is_red_flash ? "red flash" : "flash"} at ${event.timestamp}`}
              className={`absolute top-1 size-5 -translate-x-1/2 rounded-full border-2 border-white shadow-sm transition hover:scale-125 focus:outline-none focus:ring-2 focus:ring-signal ${event.is_red_flash ? "bg-red-500" : "bg-amber-400"}`}
              style={{ left: `${left}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between font-mono text-[11px] opacity-45"><span>00:00</span><span>{formatTime(safeDuration)}</span></div>
      </div>

      {events.length === 0 && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">No flagged moments were found in this video.</p>}
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
