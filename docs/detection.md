# Detection methodology

OpenPhotosense performs conservative browser-based screening informed by WCAG 2.2 “Three Flashes or Below Threshold.” It is an editorial aid, not a conformance decision or medical diagnostic tool.

## Pipeline

1. The browser decodes the selected video locally.
2. Every frame is decoded in order with WebCodecs and resized to 320×180. Browsers that cannot decode the file this way fall back to seeking at 60 samples per second.
3. Sampled sRGB channels are linearized and converted to relative luminance and CIE 1976 `u′,v′` chromaticity.
4. Each sampled pixel tracks its own luminance and colour transitions over time (below).
5. A frame registers a transition only when enough of the frame crosses at once (area, below).
6. Two opposing transitions form a flash, and every transition is evaluated in a rolling one-second window.

The implementation is `frontend/lib/flash-detector.ts`; labelled synthetic clips in `flash-detector.test.ts` pin the behaviour and run in CI.

## General flash calculation

Each pixel remembers its last luminance extreme. A transition happens when its relative luminance has moved at least 0.10 away from that extreme, however many frames the change takes, and it counts only if the darker state is below 0.80. Tracking extremes instead of comparing neighbouring frames keeps the result independent of frame rate: a flash that ramps over several frames counts once, and slow fades never accumulate into flashes because the direction must reverse by a full 0.10.

## Red flash calculation

A pixel is saturated red when `R / (R + G + B) ≥ 0.8`. Each pixel keeps an anchor colour in CIE 1976 UCS `u′,v′`; a red transition happens when the colour moves more than 0.2 from the anchor and either state is saturated red. Near-black pixels are treated as neutral grey, because their chromaticity is unreliable.

## Area calculation

WCAG describes an area limit of 25% of a 341×256 CSS-pixel ten-degree field at a 1024×768 reference viewport: 21,824 pixels. For conservative full-frame video screening, OpenPhotosense expresses that as approximately 2.78% of the analysed frame.

A frame registers a general transition when the area brightening minus the area darkening (or the reverse) reaches that limit within 0.1 seconds, and transitions alternate direction. Motion such as a pan or a moving object brightens and darkens similar areas at the same time, so it cancels out instead of being counted as flashing. Red transitions use the same area limit.

This raster approximation does not prove spatial contiguity inside every possible ten-degree viewing window. Display size, viewing distance, magnification, HDR transfer functions, browser decoding, and source color metadata can change a normative assessment.

## Rolling frequency and risk

At every transition the scanner counts the transitions in the one-second window ending there; half of that is the flash rate. More than three flashes in any one second (more than six transitions) is high risk. Two or more flashes in a second, or any red flash, is medium risk. The score is the peak flash rate scaled so that the three-flash limit is 75.

## Known limitations

- The 60-sample-per-second fallback, used only when WebCodecs cannot decode a file, cannot characterize flashes in footage above 60 fps.
- Rapid cuts between bright and dark scenes are flashes by definition and are reported as such.
- Compression artifacts and large shapes that grow and shrink quickly can still produce false results.
- Fine balanced patterns and precise contiguous-area geometry are not specially exempted.
- SDR sRGB calculations are used; HDR footage needs dedicated luminance handling.
- A low-risk result is never proof that content is safe for every viewer.

Threshold changes should be evaluated against labeled fixtures and accompanied by benchmark results before release.
