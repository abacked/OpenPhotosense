# Detection methodology

OpenPhotosense performs conservative frame-transition screening inspired by the WCAG 2.x “Three Flashes or Below Threshold” guidance. It does not currently implement the complete general-flash and red-flash area formulas from the normative standard, so its output must be treated as an editorial signal rather than a conformance decision.

## Pipeline

1. OpenCV decodes the video and supplies its frame rate and frames.
2. Frames are resized to 320×180 to bound CPU and memory use.
3. Grayscale mean and standard deviation represent luminance and spatial contrast.
4. Adjacent measurements are compared against configurable thresholds.
5. Red dominance is estimated from red-channel separation and affected area.
6. Events are timestamped, grouped by integer-second window, and scored.

The default brightness delta is 0.20 on a normalized 0–1 scale. The high-contrast threshold is 0.35 for the sum of absolute brightness and contrast changes. A red flash must also be a brightness flash, cover at least 55% of the sampled image with a red signal, and have red-channel mean at least 1.35 times the other channels.

## Risk score

The bounded score adds 25 points for each second over the three-flash limit, 8 per red flash, 2 per high-contrast event, and 1 per recorded event. A score of 70 or any window above three flashes is high risk. Scores of 25–69, or any red event, are medium risk. Other reports are low risk.

This heuristic is intentionally readable and versioned. Before changing thresholds, add synthetic fixtures, evaluate against a labeled corpus, document precision/recall changes, and increment `methodology_version`.

## Known limitations

- Compression artifacts, fades, camera cuts, and strobe-like patterns can cause false results.
- Integer-second windows can split a burst across boundaries; a future rolling-window detector is planned.
- The current red detector is an approximation, not the normative WCAG red-flash equation.
- Decoder and color-space differences can affect measurements.
- The in-process queue is appropriate for a single instance only.

Never interpret a low-risk result as proof that content is safe for every viewer.

