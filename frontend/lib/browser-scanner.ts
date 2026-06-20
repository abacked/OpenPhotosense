import type { AnalysisReport, FlashEvent, RiskLevel } from "./types";

const SAMPLE_FPS = 12;
const BRIGHTNESS_THRESHOLD = 0.18;
const CONTRAST_THRESHOLD = 0.24;
const STARTUP_GUARD_SECONDS = 0.25;
const EVENT_MERGE_WINDOW_SECONDS = 0.18;

type Metrics = { brightness: number; contrast: number; redRatio: number; redDominance: number };

export async function scanVideoInBrowser(file: File, onProgress: (progress: number) => void): Promise<AnalysisReport> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.preload = "auto";
  video.src = url;
  await once(video, "loadedmetadata");
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) await once(video, "loadeddata");
  if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("This browser could not read the video duration.");

  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 180;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas video analysis is unavailable in this browser.");

  const duration = video.duration;
  const totalSamples = Math.max(1, Math.ceil(duration * SAMPLE_FPS));
  const events: FlashEvent[] = [];
  let previous: Metrics | undefined;

  try {
    for (let index = 0; index < totalSamples; index += 1) {
      const timestamp = Math.min(index / SAMPLE_FPS, Math.max(0, duration - 0.001));
      await seek(video, timestamp);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const metrics = measure(context.getImageData(0, 0, canvas.width, canvas.height).data);
      if (previous) {
        const brightnessDelta = Math.abs(metrics.brightness - previous.brightness);
        const contrastDelta = brightnessDelta + Math.abs(metrics.contrast - previous.contrast);
        const brightnessFlag = brightnessDelta >= BRIGHTNESS_THRESHOLD;
        const contrastFlag = contrastDelta >= CONTRAST_THRESHOLD;
        const redFlag = brightnessFlag && metrics.redRatio >= 0.1 && metrics.redDominance >= 1.5;
        if ((brightnessFlag || contrastFlag || redFlag) && timestamp >= STARTUP_GUARD_SECONDS) {
          mergeEvent(events, {
            timestamp_seconds: round(timestamp, 3), timestamp: formatTimestamp(timestamp),
            brightness_delta: round(brightnessDelta, 4), contrast_delta: round(contrastDelta, 4), is_red_flash: redFlag,
          });
        }
      }
      previous = metrics;
      if (index % 3 === 0) { onProgress(Math.round((index + 1) / totalSamples * 100)); await breathe(); }
    }
  } finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }

  const perSecond: Record<string, number> = {};
  for (const event of events) perSecond[formatTimestamp(Math.floor(event.timestamp_seconds))] = (perSecond[formatTimestamp(Math.floor(event.timestamp_seconds))] ?? 0) + 1;
  const counts = Object.values(perSecond);
  const highContrastEvents = events.filter((event) => event.contrast_delta >= CONTRAST_THRESHOLD).length;
  const unsafeSeconds = counts.filter((count) => count > 3).length;
  const redCount = events.filter((event) => event.is_red_flash).length;
  const peak = Math.max(0, ...counts);
  const score = Math.min(100, unsafeSeconds * 25 + redCount * 8 + highContrastEvents * 2 + events.length);
  const riskLevel: RiskLevel = peak > 3 || score >= 70 ? "high" : score >= 25 || redCount ? "medium" : "low";
  onProgress(100);
  return {
    risk_level: riskLevel, risk_score: score, total_flash_events: events.length, red_flash_events: redCount,
    high_contrast_events: highContrastEvents, flagged_timestamps: events.map((event) => event.timestamp), events,
    flashes_per_second: perSecond, duration_seconds: round(duration, 3), frames_analyzed: totalSamples,
    recommendation: riskLevel === "low" ? "No major flash risks were detected. Review before publishing." : "Review flagged segments before publishing.",
  };
}

function measure(data: Uint8ClampedArray): Metrics {
  let sum = 0, sumSquares = 0, redPixels = 0, red = 0, other = 0, pixels = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    sum += luminance; sumSquares += luminance * luminance; red += r; other += (g + b) / 2;
    if (r - Math.max(g, b) > 0.2) redPixels += 1;
    pixels += 1;
  }
  const brightness = sum / pixels;
  return { brightness, contrast: Math.sqrt(Math.max(0, sumSquares / pixels - brightness * brightness)), redRatio: redPixels / pixels, redDominance: red / Math.max(other, 0.01) };
}

function mergeEvent(events: FlashEvent[], candidate: FlashEvent) {
  const previous = events.at(-1);
  if (!previous || candidate.timestamp_seconds - previous.timestamp_seconds > EVENT_MERGE_WINDOW_SECONDS) {
    events.push(candidate);
    return;
  }
  const red = previous.is_red_flash || candidate.is_red_flash;
  if (candidate.contrast_delta > previous.contrast_delta) {
    events[events.length - 1] = { ...candidate, is_red_flash: red };
  } else {
    previous.is_red_flash = red;
    previous.brightness_delta = Math.max(previous.brightness_delta, candidate.brightness_delta);
    previous.contrast_delta = Math.max(previous.contrast_delta, candidate.contrast_delta);
  }
}

function seek(video: HTMLVideoElement, time: number) { if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return Promise.resolve(); video.currentTime = time; return once(video, "seeked"); }
function once(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const failed = () => { cleanup(); reject(new Error("The browser could not decode this video.")); }; const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener("error", failed); }; target.addEventListener(event, done, { once: true }); target.addEventListener("error", failed, { once: true }); }); }
function breathe() { return new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); }
function round(value: number, places: number) { const scale = 10 ** places; return Math.round(value * scale) / scale; }
function formatTimestamp(seconds: number) { const safe = Math.max(0, seconds); const whole = Math.floor(safe); const hours = Math.floor(whole / 3600); const minutes = Math.floor((whole % 3600) / 60); const secs = whole % 60; const milliseconds = Math.floor((safe - whole) * 1000); return `${[hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":")}.${String(milliseconds).padStart(3, "0")}`; }
