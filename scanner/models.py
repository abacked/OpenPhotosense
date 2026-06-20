from __future__ import annotations

from dataclasses import asdict, dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass(frozen=True)
class ScannerConfig:
    """Detection settings. Thresholds are deliberately configurable for future media types."""

    brightness_delta_threshold: float = 0.20
    high_contrast_threshold: float = 0.35
    red_ratio_threshold: float = 0.55
    red_dominance_threshold: float = 1.35
    flashes_per_second_limit: int = 3
    minimum_event_gap_seconds: float = 0.04
    sample_fps: float | None = None


@dataclass(frozen=True)
class FlashEvent:
    timestamp_seconds: float
    timestamp: str
    brightness_delta: float
    contrast_delta: float
    is_red_flash: bool


@dataclass
class AnalysisReport:
    risk_level: RiskLevel
    risk_score: int
    total_flash_events: int
    red_flash_events: int
    high_contrast_events: int
    flagged_timestamps: list[str]
    events: list[FlashEvent] = field(default_factory=list)
    flashes_per_second: dict[str, int] = field(default_factory=dict)
    duration_seconds: float = 0.0
    frames_analyzed: int = 0
    recommendation: str = "Review flagged segments before publishing."
    methodology_version: str = "0.1.0"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def write_json(self, destination: str | Path) -> None:
        import json

        Path(destination).write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")


def format_timestamp(seconds: float) -> str:
    milliseconds = round((seconds % 1) * 1000)
    total_seconds = int(seconds)
    hours, remainder = divmod(total_seconds, 3600)
    minutes, secs = divmod(remainder, 60)
    if milliseconds == 1000:
        secs += 1
        milliseconds = 0
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"
