import argparse
import json

from scanner.engine import VideoScanner


def main() -> None:
    parser = argparse.ArgumentParser(description="Scan a video for potential flash hazards")
    parser.add_argument("video")
    parser.add_argument("--output", "-o")
    args = parser.parse_args()
    report = VideoScanner().scan(args.video)
    if args.output:
        report.write_json(args.output)
    else:
        print(json.dumps(report.to_dict(), indent=2))


if __name__ == "__main__":
    main()
