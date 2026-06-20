# OpenPhotosense

OpenPhotosense is an open-source web application that screens uploaded videos for potential photosensitive accessibility hazards. It identifies rapid luminance transitions, red-dominant flashes, and high-contrast changes, then provides a timestamped report for human review.

> **Important:** OpenPhotosense is an accessibility screening aid, **not a medical diagnostic tool**, certification service, or guarantee of WCAG conformance. Automated results can contain false positives and false negatives. Qualified human review remains necessary before publishing.

## Features

- Drag-and-drop video upload with live scan progress
- Risk levels, a 0–100 explainable score, and event timestamps
- Flash-frequency windows that flag more than three transitions per second
- Separate red-flash and high-contrast warnings
- Responsive light/dark interface
- FastAPI job API and modular OpenCV analysis engine
- Docker Compose and GitHub Actions setup

## Repository layout

```text
frontend/   Next.js, TypeScript, and Tailwind user interface
backend/    FastAPI upload and background job API
scanner/    Media-independent analysis models and OpenCV video adapter
docs/       Architecture, API, and detection notes
examples/   Example reports
tests/      Scanner and API tests
```

## Quick start

Requirements: Python 3.11+, Node.js 20+, and FFmpeg. OpenCV reads common formats directly; installing FFmpeg expands codec support.

```bash
git clone https://github.com/your-org/OpenPhotosense.git
cd OpenPhotosense

python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn backend.main:app --reload
```

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`; the API documentation is at `http://localhost:8000/docs`.

### Docker

```bash
docker compose up --build
```

### Scanner CLI

```bash
python -m scanner.cli path/to/video.mp4 --output report.json
```

## How detection works

Each frame is downsampled for consistent performance, converted to luminance, and compared with the preceding sampled frame. The engine records a flash event when normalized brightness changes by at least `0.20` or the combined luminance/spatial-contrast change reaches `0.35`. It separately marks a flash red when red-dominant pixels cover enough of the frame.

Events are grouped into one-second windows. A window containing **more than three events** is marked high risk, reflecting the WCAG guidance around three flashes in a one-second period. The score also weights red flashes and high-contrast events. Thresholds live in `ScannerConfig`, making calibration and future detector profiles explicit.

See [Detection methodology](docs/detection.md) for limitations and implementation details.

## API summary

```bash
curl -F "video=@example.mp4" http://localhost:8000/api/v1/scans
curl http://localhost:8000/api/v1/scans/JOB_ID
```

The first request returns HTTP 202 with a job ID. Poll the second endpoint for `queued`, `processing`, `completed`, or `failed` status. Completed jobs include the JSON report.

## Development

```bash
ruff check backend scanner tests
pytest
cd frontend && npm run typecheck && npm run build
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. The planned path to persistent workers, GIFs, streams, and browser tooling is in [ROADMAP.md](ROADMAP.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).

