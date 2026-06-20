from scanner.engine import VideoScanner
from scanner.models import FlashEvent, RiskLevel


def event(second: float, red: bool = False) -> FlashEvent:
    return FlashEvent(second, f"00:00:{second:06.3f}", 0.5, 0.5, red)


def test_more_than_three_flashes_in_second_is_high_risk() -> None:
    report = VideoScanner()._build_report(
        [event(1.1), event(1.2), event(1.3), event(1.4)], 0, 2.0, 60
    )
    assert report.risk_level == RiskLevel.HIGH
    assert report.flashes_per_second["00:00:01.000"] == 4


def test_red_event_is_reported_separately() -> None:
    report = VideoScanner()._build_report([event(0.5, True)], 0, 1.0, 30)
    assert report.red_flash_events == 1
    assert report.risk_level == RiskLevel.MEDIUM

