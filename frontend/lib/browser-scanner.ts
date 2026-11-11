import { ALL_FORMATS, BlobSource, Input, VideoSampleSink } from "mediabunny";
import { createFlashDetector } from "./flash-detector";
import type { AnalysisReport } from "./types";

// Fallback seek sampling rate: at or above the source frame rate, so per-frame strobes at
// 25–60 fps are not aliased away.
const SAMPLE_FPS = 60;

type Draw = (context: CanvasRenderingContext2D, width: number, height: number) => void;
type Analyze = (timestamp: number, draw: Draw) => void;

export async function scanVideoInBrowser(file: File, onProgress: (progress: number) => void): Promise<AnalysisReport> {
  const canvas = document.createElement("canvas");
  canvas.width = 320; canvas.height = 180;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas video analysis is unavailable in this browser.");

  const detector = createFlashDetector();
  const analyze: Analyze = (timestamp, draw) => {
    draw(context, canvas.width, canvas.height);
    detector.push(timestamp, context.getImageData(0, 0, canvas.width, canvas.height).data);
  };
  const duration = (await decodeEveryFrame(file, analyze, onProgress)) ?? (await seekEveryFrame(file, analyze, onProgress));
  onProgress(100);
  return detector.finish(duration);
}

// Decodes every frame in order with WebCodecs, much faster than real time.
// Returns undefined when this browser can't decode the file that way.
async function decodeEveryFrame(file: File, analyze: Analyze, onProgress: (progress: number) => void): Promise<number | undefined> {
  if (typeof VideoDecoder === "undefined") return undefined;
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const track = await input.getPrimaryVideoTrack().catch(() => null);
    if (!track || !(await track.canDecode())) return undefined;
    const duration = await track.computeDuration();
    if (!Number.isFinite(duration) || duration <= 0) return undefined;
    let lastYield = performance.now();
    for await (const sample of new VideoSampleSink(track).samples()) {
      try { analyze(sample.timestamp, (context, width, height) => sample.draw(context, 0, 0, width, height)); }
      finally { sample.close(); }
      if (performance.now() - lastYield > 50) { onProgress(Math.min(99, Math.round(sample.timestamp / duration * 100))); await breathe(); lastYield = performance.now(); }
    }
    return duration;
  } finally {
    input.dispose();
  }
}

// Fallback: seek a <video> to each sample. Slow, because every seek decodes from the last keyframe.
async function seekEveryFrame(file: File, analyze: Analyze, onProgress: (progress: number) => void): Promise<number> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true; video.preload = "auto"; video.src = url;
  try {
    await once(video, "loadedmetadata");
    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) await once(video, "loadeddata");
    if (!Number.isFinite(video.duration) || video.duration <= 0) throw new Error("This browser could not read the video duration.");
    const duration = video.duration;
    const totalSamples = Math.max(1, Math.ceil(duration * SAMPLE_FPS));
    for (let index = 0; index < totalSamples; index += 1) {
      const timestamp = Math.min(index / SAMPLE_FPS, Math.max(0, duration - 0.001));
      await seek(video, timestamp);
      analyze(timestamp, (context, width, height) => context.drawImage(video, 0, 0, width, height));
      if (index % 3 === 0) { onProgress(Math.round((index + 1) / totalSamples * 100)); await breathe(); }
    }
    return duration;
  } finally {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
  }
}

function seek(video: HTMLVideoElement, time: number) { if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return Promise.resolve(); video.currentTime = time; return once(video, "seeked"); }
function once(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const failed = () => { cleanup(); reject(new Error("The browser could not decode this video.")); }; const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener("error", failed); }; target.addEventListener(event, done, { once: true }); target.addEventListener("error", failed, { once: true }); }); }
function breathe() { return new Promise<void>((resolve) => requestAnimationFrame(() => resolve())); }
