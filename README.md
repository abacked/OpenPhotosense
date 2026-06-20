# OpenPhotosense

OpenPhotosense is an open-source web application that screens uploaded videos for potential photosensitive accessibility hazards. It identifies rapid luminance transitions, red-dominant flashes, and high-contrast changes, then provides a timestamped report for human review.

> **Important:** OpenPhotosense is an accessibility screening aid, **not a medical diagnostic tool**, certification service, or guarantee of WCAG conformance. Automated results can contain false positives and false negatives. Qualified human review remains necessary before publishing.

## Features

- Drag-and-drop video upload with live scan progress
- Risk levels, a 0–100 explainable score, and event timestamps
- Flash-frequency windows that flag more than three transitions per second
- Separate red-flash and high-contrast warnings
- Auto-fix exports with smoothing, targeted dimming, or risky-interval removal
- Responsive light/dark interface
- Private, browser-only processing: videos never leave the device
- Optional FastAPI/OpenCV reference engine for research and batch workflows
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

Visitors need only a modern browser—there are no plugins, accounts, uploads, or local media tools to install. To run the website locally, developers need Node.js 20+:

```bash
git clone https://github.com/your-org/OpenPhotosense.git
cd OpenPhotosense

cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`. Scanning, timeline generation, and safer-video rendering all run locally in the browser.

### Docker

```bash
docker compose up --build
```

### Scanner CLI

```bash
python -m scanner.cli path/to/video.mp4 --output report.json
```

## How detection works

Sampled frames are downscaled in an off-screen canvas, converted to luminance metrics, and compared with the preceding frame. The browser records brightness, contrast, and red-dominant transitions without transmitting the video. Safer versions are rendered to a canvas and encoded using the browser's built-in `MediaRecorder` API.

Events are grouped into one-second windows. A window containing **more than three events** is marked high risk, reflecting the WCAG guidance around three flashes in a one-second period. The score also weights red flashes and high-contrast events. Thresholds live in `ScannerConfig`, making calibration and future detector profiles explicit.

See [Detection methodology](docs/detection.md) for limitations and implementation details.

## Optional Python engine

The `backend/` and `scanner/` directories remain available as an optional reference implementation for CLI, automated batch, and future server workflows. They are not required by the website.

## Development

```bash
ruff check backend scanner tests
pytest
cd frontend && npm run typecheck && npm run build
```

Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing changes. The planned path to persistent workers, GIFs, streams, and browser tooling is in [ROADMAP.md](ROADMAP.md).

## License

Apache License 2.0. See [LICENSE](LICENSE).
