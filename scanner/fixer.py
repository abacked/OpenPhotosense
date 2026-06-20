from __future__ import annotations

import shutil
import subprocess
from collections.abc import Callable
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any

ProgressCallback = Callable[[float], None]


class FixStrategy(str, Enum):
    SMOOTH = "smooth"
    DIM = "dim"
    REMOVE = "remove"


@dataclass(frozen=True)
class FixResult:
    output_path: Path
    strategy: FixStrategy
    intervals_modified: int


class VideoFixer:
    """Create a safer derivative while leaving the uploaded original unchanged."""

    def __init__(self, ffmpeg_binary: str = "ffmpeg") -> None:
        self.ffmpeg_binary = ffmpeg_binary

    def generate(
        self,
        source: str | Path,
        destination: str | Path,
        report: dict[str, Any],
        strategy: FixStrategy,
        progress: ProgressCallback | None = None,
    ) -> FixResult:
        if shutil.which(self.ffmpeg_binary) is None:
            raise RuntimeError("FFmpeg is required to generate a safer video")
        source_path = Path(source)
        destination_path = Path(destination)
        intervals = self._intervals(report, strategy)
        command = self._command(source_path, destination_path, strategy, intervals)
        duration = max(float(report.get("duration_seconds", 0)), 0.001)
        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
        assert process.stdout is not None
        for line in process.stdout:
            key, _, value = line.strip().partition("=")
            if key == "out_time_ms" and progress:
                progress(min(int(value) / 1_000_000 / duration, 0.99))
        _, stderr = process.communicate()
        if process.returncode:
            destination_path.unlink(missing_ok=True)
            detail = stderr.strip().splitlines()[-1] if stderr.strip() else "unknown FFmpeg error"
            raise RuntimeError(f"Could not generate safer video: {detail}")
        if progress:
            progress(1.0)
        return FixResult(destination_path, strategy, len(intervals))

    @staticmethod
    def _intervals(
        report: dict[str, Any], strategy: FixStrategy
    ) -> list[tuple[float, float, bool]]:
        padding = 0.12 if strategy == FixStrategy.REMOVE else 0.25
        raw = sorted(
            (
                max(0.0, float(event["timestamp_seconds"]) - padding),
                float(event["timestamp_seconds"]) + padding,
                bool(event.get("is_red_flash")),
            )
            for event in report.get("events", [])
        )
        merged: list[tuple[float, float, bool]] = []
        for start, end, red in raw:
            if merged and start <= merged[-1][1]:
                previous = merged[-1]
                merged[-1] = (previous[0], max(previous[1], end), previous[2] or red)
            else:
                merged.append((start, end, red))
        return merged

    def _command(
        self,
        source: Path,
        destination: Path,
        strategy: FixStrategy,
        intervals: list[tuple[float, float, bool]],
    ) -> list[str]:
        common = [
            self.ffmpeg_binary,
            "-y",
            "-loglevel",
            "error",
            "-i",
            str(source),
            "-progress",
            "pipe:1",
            "-nostats",
        ]
        if strategy == FixStrategy.SMOOTH:
            common += ["-vf", "deflicker=s=5:m=am,tmix=frames=3:weights=1 2 1"]
        elif strategy == FixStrategy.DIM:
            all_events = self._enable_expression(intervals)
            red_events = self._enable_expression([item for item in intervals if item[2]])
            filters = []
            if all_events:
                filters.append(f"eq=brightness=-0.22:enable='{all_events}':eval=frame")
            if red_events:
                filters.append(f"hue=s=0.35:enable='{red_events}'")
            if filters:
                common += ["-vf", ",".join(filters)]
        elif intervals:
            excluded = self._enable_expression(intervals)
            common += [
                "-vf",
                f"select='not({excluded})',setpts=N/FRAME_RATE/TB",
                "-af",
                f"aselect='not({excluded})',asetpts=N/SR/TB",
            ]
        common += [
            "-map", "0:v:0", "-map", "0:a?", "-c:v", "libx264", "-preset", "medium",
            "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", str(destination),
        ]
        return common

    @staticmethod
    def _enable_expression(intervals: list[tuple[float, float, bool]]) -> str:
        return "+".join(f"between(t,{start:.3f},{end:.3f})" for start, end, _ in intervals)
