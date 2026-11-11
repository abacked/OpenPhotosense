// Labelled synthetic clips for the flash detector. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { createFlashDetector } from "./flash-detector.ts";

const WIDTH = 320, HEIGHT = 180;
type Paint = (x: number, y: number) => [number, number, number];

function scan(fps: number, seconds: number, paint: (t: number) => Paint) {
  const detector = createFlashDetector();
  const frame = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
  for (let f = 0; f < Math.round(fps * seconds); f += 1) {
    const t = f / fps, colour = paint(t);
    for (let y = 0, i = 0; y < HEIGHT; y += 1) {
      for (let x = 0; x < WIDTH; x += 1, i += 4) {
        const [r, g, b] = colour(x, y);
        frame[i] = r; frame[i + 1] = g; frame[i + 2] = b; frame[i + 3] = 255;
      }
    }
    detector.push(t, frame);
  }
  return detector.finish(seconds);
}

const peak = (report: ReturnType<typeof scan>) => Math.max(0, ...Object.values(report.flashes_per_second));
const solid = (value: number): Paint => () => [value, value, value];
const square = (hz: number, t: number) => Math.floor(t * hz * 2) % 2 === 1; // two states per cycle
const toSrgb = (linear: number) => Math.round(255 * (linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055));

test("per-frame strobe at 25 fps is high risk at about 12.5 flashes/s", () => {
  const report = scan(25, 3, (t) => solid(t > 0.5 && t < 2.5 && Math.round(t * 25) % 2 ? 255 : 20));
  assert.equal(report.risk_level, "high");
  assert.ok(peak(report) >= 12, `peak ${peak(report)}`);
});

test("3 flashes/s is at the limit, not over it", () => {
  const report = scan(30, 3, (t) => solid(square(3, t) ? 230 : 20));
  assert.notEqual(report.risk_level, "high");
  assert.equal(peak(report), 3);
});

test("4 flashes/s is high risk", () => {
  const report = scan(30, 3, (t) => solid(square(4, t) ? 230 : 20));
  assert.equal(report.risk_level, "high");
});

test("a smooth 4 Hz flash at 120 fps still counts, though no two frames differ by 10%", () => {
  const report = scan(120, 3, (t) => solid(toSrgb(0.35 - 0.3 * Math.cos(2 * Math.PI * 4 * t))));
  assert.equal(report.risk_level, "high");
  assert.ok(peak(report) >= 3.5, `peak ${peak(report)}`);
});

test("flashing in 1% of the frame is below the area threshold", () => {
  const report = scan(30, 3, (t) => (x, y) => (x < 32 && y < 18 && square(8, t) ? [255, 255, 255] : [20, 20, 20]));
  assert.equal(report.risk_level, "low");
  assert.equal(report.total_flash_events, 0);
});

test("a fast-moving white bar on black is motion, not flashing", () => {
  const report = scan(30, 3, (t) => (x) => ((x - t * 400) % 320 + 320) % 320 < 32 ? [255, 255, 255] : [0, 0, 0]);
  assert.equal(report.risk_level, "low");
});

test("a camera pan across random high-contrast texture is motion, not flashing", () => {
  // Brightened and darkened areas are nearly equal but differ frame to frame, as in real footage.
  let seed = 7;
  const bits = Array.from({ length: 4096 }, () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) % 2);
  const report = scan(30, 4, (t) => (x, y) => bits[(Math.floor((x + t * 300) / 6) * 13 + Math.floor(y / 15)) % bits.length] ? [255, 255, 255] : [0, 0, 0]);
  assert.equal(report.risk_level, "low");
  assert.equal(report.total_flash_events, 0);
});

test("bright-only flicker (darker state above 0.8) is not a flash", () => {
  const report = scan(30, 3, (t) => solid(square(5, t) ? 255 : 240));
  assert.equal(report.total_flash_events, 0);
});

test("saturated red against equally bright grey at 4 Hz is a high-risk red flash", () => {
  const report = scan(30, 3, (t) => () => (square(4, t) ? [255, 0, 0] : [127, 127, 127]));
  assert.equal(report.risk_level, "high");
  assert.ok(report.red_flash_events > 0);
  assert.ok(report.events.every((event) => event.is_red_flash), "no general flashes at equal luminance");
});

test("one camera flash is low risk", () => {
  const report = scan(30, 3, (t) => solid(t > 1 && t < 1.07 ? 255 : 40));
  assert.equal(report.risk_level, "low");
  assert.equal(report.total_flash_events, 1);
});

test("a slow fade from black to white and back is not flashing", () => {
  const report = scan(30, 6, (t) => solid(Math.round(255 * (t < 3 ? t / 3 : (6 - t) / 3))));
  assert.equal(report.risk_level, "low");
});
