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

  function scrub(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    const next = Math.max(0, Math.min(seconds, video.duration || safeDuration));
    video.currentTime = next;
    setCurrentTime(next);
  }

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft dark:bg-white/[.05] sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Review flagged moments</h3>
          <p className="mt-1 text-sm opacity-55">Click or drag anywhere on the timeline to scrub through the video.</p>
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
            <span
              key={`${event.timestamp_seconds}-${index}`}
              title={`${event.is_red_flash ? "Red flash" : "Flash"} at ${event.timestamp}`}
              aria-hidden="true"
              className={`pointer-events-none absolute top-1 size-5 -translate-x-1/2 rounded-full border-2 border-white shadow-sm ${event.is_red_flash ? "bg-red-500" : "bg-amber-400"}`}
              style={{ left: `${left}%` }}
            />
          ))}
          <input
            type="range"
            min={0}
            max={safeDuration}
            step={0.01}
            value={Math.min(currentTime, safeDuration)}
            onChange={(event) => scrub(Number(event.currentTarget.value))}
            aria-label="Video position"
            className="absolute inset-0 z-10 h-10 w-full cursor-ew-resize appearance-none bg-transparent [&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-signal [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:h-10 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:mt-2.5 [&::-webkit-slider-thumb]:size-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-signal [&::-webkit-slider-thumb]:shadow-md"
          />
        </div>
        <div className="flex justify-between font-mono text-[11px] opacity-45"><span>{formatTime(currentTime)}</span><span>{formatTime(safeDuration)}</span></div>
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
