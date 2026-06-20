# Architecture

The browser uploads directly to FastAPI and polls a job resource. FastAPI streams the upload to disk with a size limit, schedules CPU-bound analysis on a bounded thread pool, and returns the scanner's serialized report. The scanner has no HTTP dependency.

Detector functions operate on frame metrics rather than API models. `ScannerConfig` owns policy thresholds, while `VideoScanner` is the OpenCV media adapter and aggregator. This separation supports future adapters for decoded GIF frames, streaming frame iterators, and local browser-extension runtimes without changing the report contract.

The initial job store is deliberately small and process-local. Before horizontal production deployment, use a persistent queue, object storage with retention controls, authentication/rate limiting, malware inspection, and structured observability.

