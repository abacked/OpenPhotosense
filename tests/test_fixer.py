from scanner.fixer import FixStrategy, VideoFixer


def report() -> dict:
    return {"duration_seconds": 4, "events": [
        {"timestamp_seconds": 1.0, "is_red_flash": False},
        {"timestamp_seconds": 1.2, "is_red_flash": True},
        {"timestamp_seconds": 3.0, "is_red_flash": False},
    ]}


def test_overlapping_fix_intervals_are_merged() -> None:
    assert VideoFixer._intervals(report(), FixStrategy.DIM) == [
        (0.75, 1.45, True), (2.75, 3.25, False)
    ]


def test_remove_command_excludes_flagged_windows(tmp_path) -> None:
    fixer = VideoFixer()
    intervals = fixer._intervals(report(), FixStrategy.REMOVE)
    command = fixer._command(
        tmp_path / "in.mp4", tmp_path / "out.mp4", FixStrategy.REMOVE, intervals
    )
    expected = (
        "select='not(between(t,0.880,1.320)+between(t,2.880,3.120))',"
        "setpts=N/FRAME_RATE/TB"
    )
    assert expected in command
