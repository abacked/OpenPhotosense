# Architecture

The default website is local-first. The browser decodes the selected file, samples frames into an off-screen canvas, calculates luminance/contrast/red metrics, and builds the report without uploading the file. Auto-fix renders processed frames to a canvas and uses `MediaRecorder` to create a downloadable WebM file.

Detector functions operate on frame metrics rather than API models. `ScannerConfig` owns policy thresholds, while `VideoScanner` is the OpenCV media adapter and aggregator. This separation supports future adapters for decoded GIF frames, streaming frame iterators, and local browser-extension runtimes without changing the report contract.

The FastAPI/OpenCV implementation is retained as an optional reference and batch-processing adapter. It is not contacted by the default frontend.
