import numpy as np

from scanner.detectors import is_brightness_flash, is_red_flash, measure_frame
from scanner.models import ScannerConfig, format_timestamp


def frame(b: int, g: int, r: int) -> np.ndarray:
    result = np.zeros((100, 100, 3), dtype=np.uint8)
    result[:] = (b, g, r)
    return result


def test_brightness_delta_flags_large_transition() -> None:
    dark = measure_frame(frame(10, 10, 10))
    light = measure_frame(frame(240, 240, 240))
    flagged, delta = is_brightness_flash(dark, light, ScannerConfig())
    assert flagged
    assert delta > 0.8


def test_red_flash_requires_area_and_dominance() -> None:
    metrics = measure_frame(frame(10, 20, 255))
    assert is_red_flash(metrics, ScannerConfig())
    assert not is_red_flash(measure_frame(frame(240, 240, 255)), ScannerConfig())


def test_timestamp_format_is_stable() -> None:
    assert format_timestamp(83.125) == "00:01:23.125"

