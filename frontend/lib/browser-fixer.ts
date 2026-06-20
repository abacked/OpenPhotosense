import type { AnalysisReport, FixStrategy } from "./types";

type CapturableVideo = HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream };
type FrameCallbackVideo = CapturableVideo & {
  requestVideoFrameCallback?: (callback: () => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

export async function generateSaferVideo(file: File, report: AnalysisReport, strategy: FixStrategy, onProgress: (value: number) => void, signal?: AbortSignal): Promise<Blob> {
  signal?.throwIfAborted();
  if (!window.MediaRecorder) throw new Error("This browser cannot record a safer version. Try Chrome, Edge, or Firefox.");
  const sourceUrl = URL.createObjectURL(file);
  const video = document.createElement("video") as FrameCallbackVideo;
  video.src = sourceUrl; video.preload = "auto"; video.playsInline = true;
  await once(video, "loadedmetadata");
  if (signal?.aborted) {
    video.removeAttribute("src"); video.load(); URL.revokeObjectURL(sourceUrl);
    throw new DOMException("Generation cancelled", "AbortError");
  }
  const AudioContextClass = window.AudioContext;
  const audioContext = new AudioContextClass();
  const audioSource = audioContext.createMediaElementSource(video);
  const silentAudioOutput = audioContext.createMediaStreamDestination();
  // Route source audio into the recording only, never to the computer speakers.
  audioSource.connect(silentAudioOutput);
  const scale = Math.min(1, 1280 / Math.max(video.videoWidth, 1));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale)); canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
  const context = canvas.getContext("2d");
  if (!context || !canvas.captureStream) throw new Error("Canvas recording is unavailable in this browser.");
  const output = canvas.captureStream(Math.min(30, 30));
  silentAudioOutput.stream.getAudioTracks().forEach((track) => output.addTrack(track));
  const mimeType = selectMimeType();
  const recorder = new MediaRecorder(output, { mimeType, videoBitsPerSecond: 5_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve, reject) => { recorder.onstop = () => resolve(); recorder.onerror = () => reject(new Error("Browser video recording failed.")); });
  const risky = report.events.map((event) => ({ start: Math.max(0, event.timestamp_seconds - 0.18), end: Math.min(report.duration_seconds, event.timestamp_seconds + 0.22), red: event.is_red_flash }));
  let animation = 0;
  let videoFrameCallback = 0;
  let hasRenderedFrame = false;
  const scheduleDraw = () => {
    if (video.requestVideoFrameCallback) videoFrameCallback = video.requestVideoFrameCallback(draw);
    else animation = requestAnimationFrame(draw);
  };
  const draw = () => {
    if (signal?.aborted) return;
    const active = risky.find((range) => video.currentTime >= range.start && video.currentTime <= range.end);
    if (strategy === "remove" && active) { video.currentTime = Math.min(active.end + 0.01, video.duration); scheduleDraw(); return; }
    context.save();
    if (strategy === "dim" && active) context.filter = active.red ? "brightness(55%) saturate(35%)" : "brightness(62%)";
    if (strategy === "smooth" && hasRenderedFrame) context.globalAlpha = smoothingAlpha(video.currentTime, report);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    hasRenderedFrame = true;
    onProgress(Math.min(99, Math.round(video.currentTime / Math.max(video.duration, 0.01) * 100)));
    if (!video.ended) scheduleDraw();
  };
  try {
    await audioContext.resume(); recorder.start(1000); scheduleDraw(); await video.play(); await onceOrAbort(video, "ended", signal);
    cancelDraw(video, animation, videoFrameCallback); recorder.stop(); await stopped; onProgress(100);
    return new Blob(chunks, { type: recorder.mimeType || mimeType });
  } finally {
    cancelDraw(video, animation, videoFrameCallback); video.pause(); if (recorder.state !== "inactive") recorder.stop(); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(sourceUrl); output.getTracks().forEach((track) => track.stop()); await audioContext.close();
  }
}

function smoothingAlpha(time: number, report: AnalysisReport) {
  const closest = Math.min(...report.events.map((event) => Math.abs(time - event.timestamp_seconds)), Number.POSITIVE_INFINITY);
  if (closest <= 0.24) return 0.04;
  if (closest >= 0.85) return 1;
  // Ease gradually into and out of the strong hold so the correction cannot create a new hard cut.
  const position = (closest - 0.24) / (0.85 - 0.24);
  return 0.04 + position * position * 0.96;
}

function cancelDraw(video: FrameCallbackVideo, animation: number, videoFrameCallback: number) {
  if (animation) cancelAnimationFrame(animation);
  if (videoFrameCallback && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(videoFrameCallback);
}

function selectMimeType() {
  const mp4 = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1.42E01E", "video/mp4"];
  const supportedMp4 = mp4.find((type) => MediaRecorder.isTypeSupported(type));
  if (supportedMp4) return supportedMp4;
  const webm = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  const supportedWebm = webm.find((type) => MediaRecorder.isTypeSupported(type));
  if (supportedWebm) return supportedWebm;
  throw new Error("This browser cannot encode an MP4 or WebM video.");
}

function once(target: HTMLMediaElement, event: string) { return new Promise<void>((resolve, reject) => { const done = () => { cleanup(); resolve(); }; const failed = () => { cleanup(); reject(new Error("The browser could not process this video.")); }; const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener("error", failed); }; target.addEventListener(event, done, { once: true }); target.addEventListener("error", failed, { once: true }); }); }

function onceOrAbort(target: HTMLMediaElement, event: string, signal?: AbortSignal) {
  if (!signal) return once(target, event);
  if (signal.aborted) return Promise.reject(new DOMException("Generation cancelled", "AbortError"));
  return new Promise<void>((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error("The browser could not process this video.")); };
    const aborted = () => { cleanup(); reject(new DOMException("Generation cancelled", "AbortError")); };
    const cleanup = () => { target.removeEventListener(event, done); target.removeEventListener("error", failed); signal.removeEventListener("abort", aborted); };
    target.addEventListener(event, done, { once: true }); target.addEventListener("error", failed, { once: true }); signal.addEventListener("abort", aborted, { once: true });
  });
}
