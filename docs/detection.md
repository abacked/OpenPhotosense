# Detection methodology

OpenPhotosense performs conservative browser-based screening informed by WCAG 2.2 “Three Flashes or Below Threshold.” It is an editorial aid, not a conformance decision or medical diagnostic tool.

## Pipeline

1. The browser decodes the selected video locally.
2. Frames are sampled at 12 frames per second and resized to 320×180.
3. Sampled sRGB channels are linearized and converted to relative luminance.
4. Adjacent frames produce per-pixel general-flash and saturated-red transition masks.
5. Non-overlapping opposing transitions are paired into flashes.
6. The intersection of both transition masks estimates the area participating in the complete flash.
7. Every flash is evaluated in a rolling one-second window.

## General flash calculation

A sampled pixel participates in a general transition when its relative-luminance change is at least 0.10 and the darker state is below 0.80. An increase followed by a decrease, or a decrease followed by an increase, forms one flash. Transitions are consumed in pairs so one bright/dark pulse is not counted twice.

## Red flash calculation

A sampled pixel is treated as saturated red when `R / (R + G + B) ≥ 0.8`. Colors are converted through CIE XYZ to 1976 UCS `u′,v′`; a transition participates in the red mask when its chromaticity distance is greater than 0.2. Opposing transitions are paired using the same temporal model.

## Area calculation

WCAG describes an area limit of 25% of a 341×256 CSS-pixel ten-degree field at a 1024×768 reference viewport: 21,824 pixels. For conservative full-frame video screening, OpenPhotosense expresses that as approximately 2.78% of the analyzed frame. Reports show the affected-frame percentage and identify events above this reference area.

This raster approximation does not prove spatial contiguity inside every possible ten-degree viewing window. Display size, viewing distance, magnification, HDR transfer functions, browser decoding, and source color metadata can change a normative assessment.

## Rolling frequency

For every flash, the scanner counts flashes occurring during the preceding one-second interval. This prevents a rapid burst from being split by fixed integer-second boundaries. A rolling count above three is treated as high risk.

## Known limitations

- The 12 fps sampling rate cannot characterize all high-frequency or very short flashes.
- Compression artifacts, edits, fades, and camera cuts can produce false results.
- Fine balanced patterns and precise contiguous-area geometry are not specially exempted.
- SDR sRGB calculations are used; HDR footage needs dedicated luminance handling.
- A low-risk result is never proof that content is safe for every viewer.

Threshold changes should be evaluated against labeled fixtures and accompanied by benchmark results before release.
