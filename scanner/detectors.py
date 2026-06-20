from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
from numpy.typing import NDArray

from scanner.models import ScannerConfig


@dataclass(frozen=True)
class FrameMetrics:
    brightness: float
    contrast: float
    red_ratio: float
    red_dominance: float


def measure_frame(frame: NDArray[np.uint8]) -> FrameMetrics:
    """Return normalized perceptual metrics for a BGR OpenCV frame."""
    resized = cv2.resize(frame, (320, 180), interpolation=cv2.INTER_AREA)
    luminance = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY).astype(np.float32) / 255.0
    b, g, r = cv2.split(resized.astype(np.float32) / 255.0)
    red_signal = np.maximum(r - np.maximum(g, b), 0.0)
    other_mean = float((g.mean() + b.mean()) / 2.0)
    return FrameMetrics(
        brightness=float(luminance.mean()),
        contrast=float(luminance.std()),
        red_ratio=float((red_signal > 0.2).mean()),
        red_dominance=float(r.mean() / max(other_mean, 0.01)),
    )


def is_brightness_flash(
    previous: FrameMetrics, current: FrameMetrics, config: ScannerConfig
) -> tuple[bool, float]:
    delta = abs(current.brightness - previous.brightness)
    return delta >= config.brightness_delta_threshold, delta


def is_high_contrast_change(
    previous: FrameMetrics, current: FrameMetrics, config: ScannerConfig
) -> tuple[bool, float]:
    # Combine a global luminance change with the change in spatial contrast.
    delta = abs(current.brightness - previous.brightness) + abs(
        current.contrast - previous.contrast
    )
    return delta >= config.high_contrast_threshold, delta


def is_red_flash(current: FrameMetrics, config: ScannerConfig) -> bool:
    return (
        current.red_ratio >= config.red_ratio_threshold
        and current.red_dominance >= config.red_dominance_threshold
    )

