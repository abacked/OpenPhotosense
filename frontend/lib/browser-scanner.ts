import type { AnalysisReport, FlashEvent, RiskLevel } from "./types";

const SAMPLE_FPS = 12;
const STARTUP_GUARD_SECONDS = 0.25;
const GENERAL_LUMINANCE_DELTA = 0.1;
const SATURATED_RED_RATIO = 0.8;
const RED_CHROMATICITY_DELTA = 0.2;
const HIGH_CONTRAST_THRESHOLD = 0.24;
const MAX_PAIR_GAP_SECONDS = 1;
const MIN_NOISE_AREA_RATIO = 0.001;
// 25% of the WCAG reference 341×256 ten-degree field, relative to 1024×768.
const FLASH_AREA_THRESHOLD = 21_824 / (1024 * 768);

type Metrics = {
  brightness: number;
  contrast: number;
  luminance: Float32Array;
  redShare: Float32Array;
  chromaU: Float32Array;
  chromaV: Float32Array;
};

type Transition = {
  timestamp: number;
  direction: 1 | -1;
  brightnessDelta: number;
  contrastDelta: number;
  generalMask: Uint8Array;
  redMask: Uint8Array;
};

export async function scanVideoInBrowser(file: File, onProgress: (progress: number) => void): Promise<AnalysisReport> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true; video.preload = "auto"; video.src = url;
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
  let pending: Transition | undefined;

  try {
    for (let index = 0; index < totalSamples; index += 1) {
      const timestamp = Math.min(index / SAMPLE_FPS, Math.max(0, duration - 0.001));
      await seek(video, timestamp);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const metrics = measure(context.getImageData(0, 0, canvas.width, canvas.height).data);
      if (previous && timestamp >= STARTUP_GUARD_SECONDS) {
        const transition = compare(previous, metrics, timestamp);
        if (transition) {
          if (pending && transition.timestamp - pending.timestamp <= MAX_PAIR_GAP_SECONDS && transition.direction !== pending.direction) {
            const generalArea = intersectRatio(pending.generalMask, transition.generalMask);
            const redArea = intersectRatio(pending.redMask, transition.redMask);
            if (Math.max(generalArea, redArea) >= MIN_NOISE_AREA_RATIO) {
              const affectedArea = Math.max(generalArea, redArea);
              events.push({
                timestamp_seconds: round(timestamp, 3), timestamp: formatTimestamp(timestamp),
                brightness_delta: round(Math.max(pending.brightnessDelta, transition.brightnessDelta), 4),
                contrast_delta: round(Math.max(pending.contrastDelta, transition.contrastDelta), 4),
                is_red_flash: redArea >= MIN_NOISE_AREA_RATIO,
                affected_area_ratio: round(affectedArea, 4), red_area_ratio: round(redArea, 4),
                exceeds_area_threshold: affectedArea >= FLASH_AREA_THRESHOLD,
              });
            }
            pending = undefined;
          } else {
            pending = transition;
          }
        }
      }
      previous = metrics;
      if (index % 3 === 0) { onProgress(Math.round((index + 1) / totalSamples * 100)); await breathe(); }
    }
  } finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }

  const rolling = rollingFrequency(events);
  const frequencies: Record<string, number> = {};
  rolling.forEach((count, index) => { frequencies[events[index].timestamp] = count; });
  const peak = Math.max(0, ...rolling);
  const unsafeWindows = rolling.filter((count) => count > 3).length;
  const redCount = events.filter((event) => event.is_red_flash).length;
  const largeAreaCount = events.filter((event) => event.exceeds_area_threshold).length;
  const highContrastEvents = events.filter((event) => event.contrast_delta >= HIGH_CONTRAST_THRESHOLD).length;
  const score = Math.min(100, unsafeWindows * 18 + redCount * 8 + largeAreaCount * 6 + highContrastEvents * 2 + events.length);
  const riskLevel: RiskLevel = peak > 3 || score >= 70 ? "high" : score >= 25 || redCount ? "medium" : "low";
  onProgress(100);
  return {
    risk_level: riskLevel, risk_score: score, total_flash_events: events.length, red_flash_events: redCount,
    high_contrast_events: highContrastEvents, flagged_timestamps: events.map((event) => event.timestamp), events,
    flashes_per_second: frequencies, duration_seconds: round(duration, 3), frames_analyzed: totalSamples,
    recommendation: riskLevel === "low" ? "No major flash risks were detected. Review before publishing." : "Review flagged segments before publishing.",
  };
}

function measure(data: Uint8ClampedArray): Metrics {
  const count = Math.ceil(data.length / 16);
  const luminance = new Float32Array(count), redShare = new Float32Array(count), chromaU = new Float32Array(count), chromaV = new Float32Array(count);
  let sum = 0, sumSquares = 0, pixel = 0;
  for (let i = 0; i < data.length; i += 16) {
    const r = linear(data[i] / 255), g = linear(data[i + 1] / 255), b = linear(data[i + 2] / 255);
    const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
    const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
    const denominator = x + 15 * y + 3 * z;
    luminance[pixel] = y; redShare[pixel] = r / Math.max(r + g + b, 0.0001);
    chromaU[pixel] = denominator ? 4 * x / denominator : 0;
    chromaV[pixel] = denominator ? 9 * y / denominator : 0;
    sum += y; sumSquares += y * y; pixel += 1;
  }
  const brightness = sum / pixel;
  return { brightness, contrast: Math.sqrt(Math.max(0, sumSquares / pixel - brightness * brightness)), luminance, redShare, chromaU, chromaV };
}

function compare(previous: Metrics, current: Metrics, timestamp: number): Transition | undefined {
  const generalMask = new Uint8Array(current.luminance.length), redMask = new Uint8Array(current.luminance.length);
  let signedChange = 0, changed = 0;
  for (let i = 0; i < current.luminance.length; i += 1) {
    const delta = current.luminance[i] - previous.luminance[i];
    const general = Math.abs(delta) >= GENERAL_LUMINANCE_DELTA && Math.min(current.luminance[i], previous.luminance[i]) < 0.8;
    if (general) generalMask[i] = 1;
    const chromaDelta = Math.hypot(current.chromaU[i] - previous.chromaU[i], current.chromaV[i] - previous.chromaV[i]);
    const red = (current.redShare[i] >= SATURATED_RED_RATIO || previous.redShare[i] >= SATURATED_RED_RATIO) && chromaDelta > RED_CHROMATICITY_DELTA;
    if (red) redMask[i] = 1;
    if (general || red) { signedChange += delta; changed += 1; }
  }
  if (!changed) return undefined;
  const brightnessDelta = Math.abs(current.brightness - previous.brightness);
  return { timestamp, direction: signedChange >= 0 ? 1 : -1, brightnessDelta, contrastDelta: brightnessDelta + Math.abs(current.contrast - previous.contrast), generalMask, redMask };
}

function rollingFrequency(events: FlashEvent[]) {
  let start = 0;
  return events.map((event, end) => {
    while (event.timestamp_seconds - events[start].timestamp_seconds > 1) start += 1;
    return end - start + 1;
  });
}

function intersectRatio(first: Uint8Array, second: Uint8Array) { let count = 0; for (let i = 0; i < first.length; i += 1) if (first[i] && second[i]) count += 1; return count / first.length; }
function linear(value: number) { return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; }
function seek(video: HTMLVideoElement, time: number) { if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return Promise.resolve(); video.currentTime = time; return once(video, "seeked"); }
function once(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const failed = () => { cleanup(); reject(new Error("The browser could not decode this video.")); }; const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener("error", failed); }; target.addEventListener(event, done, { once: true }); target.addEventListener("error", failed, { once: true }); }); }
function breathe() { return new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); }
function round(value: number, places: number) { const scale = 10 ** places; return Math.round(value * scale) / scale; }
function formatTimestamp(seconds: number) { const safe = Math.max(0, seconds); const whole = Math.floor(safe); const hours = Math.floor(whole / 3600); const minutes = Math.floor((whole % 3600) / 60); const secs = whole % 60; const milliseconds = Math.floor((safe - whole) * 1000); return `${[hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":")}.${String(milliseconds).padStart(3, "0")}`; }
