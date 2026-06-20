from __future__ import annotations

from collections import Counter
from collections.abc import Callable
from pathlib import Path

import cv2

from scanner.detectors import (
    is_brightness_flash,
    is_high_contrast_change,
    is_red_flash,
    measure_frame,
)
from scanner.models import AnalysisReport, FlashEvent, RiskLevel, ScannerConfig, format_timestamp

ProgressCallback = Callable[[float], None]


class VideoScanner:
    """Analyze a video frame stream and produce a serializable accessibility report."""

    def __init__(self, config: ScannerConfig | None = None) -> None:
        self.config = config or ScannerConfig()

    def scan(
        self, video_path: str | Path, progress: ProgressCallback | None = None
    ) -> AnalysisReport:
        path = Path(video_path)
        capture = cv2.VideoCapture(str(path))
        if not capture.isOpened():
            raise ValueError(f"Unable to open video: {path.name}")

        source_fps = capture.get(cv2.CAP_PROP_FPS) or 30.0
        total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
        sample_every = (
            max(1, round(source_fps / self.config.sample_fps))
            if self.config.sample_fps
            else 1
        )
        previous = None
        events: list[FlashEvent] = []
        high_contrast_events = 0
        frames_analyzed = 0
        frame_index = -1
        last_event_time = -self.config.minimum_event_gap_seconds

        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                frame_index += 1
                if frame_index % sample_every:
                    continue

                timestamp_seconds = frame_index / source_fps
                metrics = measure_frame(frame)
                frames_analyzed += 1
                if previous is not None:
                    brightness_flag, brightness_delta = is_brightness_flash(
                        previous, metrics, self.config
                    )
                    contrast_flag, contrast_delta = is_high_contrast_change(
                        previous, metrics, self.config
                    )
                    red_flag = is_red_flash(metrics, self.config) and brightness_flag
                    if contrast_flag:
                        high_contrast_events += 1
                    if (brightness_flag or contrast_flag or red_flag) and (
                        timestamp_seconds - last_event_time >= self.config.minimum_event_gap_seconds
                    ):
                        events.append(
                            FlashEvent(
                                timestamp_seconds=round(timestamp_seconds, 3),
                                timestamp=format_timestamp(timestamp_seconds),
                                brightness_delta=round(brightness_delta, 4),
                                contrast_delta=round(contrast_delta, 4),
                                is_red_flash=red_flag,
                            )
                        )
                        last_event_time = timestamp_seconds
                previous = metrics
                if progress and frames_analyzed % 10 == 0:
                    progress(min((frame_index + 1) / max(total_frames, 1), 0.99))
        finally:
            capture.release()

        duration = total_frames / source_fps if total_frames else max(frame_index, 0) / source_fps
        if progress:
            progress(1.0)
        return self._build_report(events, high_contrast_events, duration, frames_analyzed)

    def _build_report(
        self,
        events: list[FlashEvent],
        high_contrast_events: int,
        duration: float,
        frames_analyzed: int,
    ) -> AnalysisReport:
        per_second = Counter(int(event.timestamp_seconds) for event in events)
        unsafe_seconds = sum(
            count > self.config.flashes_per_second_limit for count in per_second.values()
        )
        red_count = sum(event.is_red_flash for event in events)
        peak_frequency = max(per_second.values(), default=0)
        score = min(
            100,
            unsafe_seconds * 25 + red_count * 8 + high_contrast_events * 2 + len(events),
        )
        risk = RiskLevel.HIGH if peak_frequency > 3 or score >= 70 else (
            RiskLevel.MEDIUM if score >= 25 or red_count else RiskLevel.LOW
        )
        return AnalysisReport(
            risk_level=risk,
            risk_score=score,
            total_flash_events=len(events),
            red_flash_events=red_count,
            high_contrast_events=high_contrast_events,
            flagged_timestamps=[event.timestamp for event in events],
            events=events,
            flashes_per_second={
                format_timestamp(second): count for second, count in sorted(per_second.items())
            },
            duration_seconds=round(duration, 3),
            frames_analyzed=frames_analyzed,
        )
