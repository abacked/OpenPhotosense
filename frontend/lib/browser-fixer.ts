import type { AnalysisReport, FixStrategy } from "./types";

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };

export async function generateSaferVideo(file: File, report: AnalysisReport, strategy: FixStrategy, onProgress: (value: number) => void): Promise<Blob> {
  if (!window.MediaRecorder) throw new Error("This browser cannot record a safer version. Try Chrome, Edge, or Firefox.");
  const sourceUrl = URL.createObjectURL(file);
  const video = document.createElement("video") as CapturableVideo;
  video.src = sourceUrl; video.preload = "auto"; video.playsInline = true;
  await once(video, "loadedmetadata");
  const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale)); canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context || !canvas.captureStream) throw new Error("Canvas recording is unavailable in this browser.");
  const output = canvas.captureStream(Math.min(30, 30));
  const sourceStream = video.captureStream?.() ?? video.mozCaptureStream?.();
  sourceStream?.getAudioTracks().forEach((track) => output.addTrack(track));
  const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
  const recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error("Browser video recording failed.")); });
  const risky = report.events.map((event) => ({ start: Math.max(0, event.timestamp_seconds - 0.18), end: Math.min(report.duration_seconds, event.timestamp_seconds + 0.22), red: event.is_red_flash }));
  let animation = 0;
  const draw = () => {
    const active = risky.find((range) => video.currentTime >= range.start && video.currentTime <= range.end);
    if (strategy === "remove" && active) { video.currentTime = Math.min(active.end + 0.01, video.duration); animation = requestAnimationFrame(draw); return; }
    context.save();
    if (strategy === "dim" && active) context.filter = active.red ? "brightness(55%) saturate(35%)" : "brightness(62%)";
    if (strategy === "smooth" && active) { context.globalAlpha = 0.42; }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    onProgress(Math.min(99, Math.round(video.currentTime / Math.max(video.duration, 0.01) * 100)));
    if (!video.ended) animation = requestAnimationFrame(draw);
  };
  try {
    recorder.start(1000); animation = requestAnimationFrame(draw); await video.play(); await once(video, "ended");
    cancelAnimationFrame(animation); recorder.stop(); await stopped; onProgress(100);
    return new Blob(chunks, { type: mimeType });
  } finally {
    cancelAnimationFrame(animation); video.pause(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(sourceUrl); output.getTracks().forEach((track) => track.stop());
  }
}

function once(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const failed = () => { cleanup(); reject(new Error("The browser could not process this video.")); }; const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener("error", failed); }; target.addEventListener(event, done, { once: true }); target.addEventListener("error", failed, { once: true }); }); }
