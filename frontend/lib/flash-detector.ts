import type { AnalysisReport, FlashEvent, RiskLevel } from "./types";

// WCAG 2.2 general flash: opposing changes of at least 10% of the maximum relative
// luminance, where the darker state is below 0.80.
const LUMINANCE_STEP = 0.1;
const DARKER_STATE_LIMIT = 0.8;
// WCAG 2.2 red flash: one state has R/(R+G+B) >= 0.8, and the two states are more than
// 0.2 apart in CIE 1976 u'v'.
const SATURATED_RED_SHARE = 0.8;
const RED_CHROMA_STEP = 0.2;
// Concurrent flashing area: 25% of the WCAG 341x256 ten-degree field at 1024x768.
const FLASH_AREA = 21_824 / (1024 * 768);
// Pixels crossing within this window form one transition, so a flash that ramps over a
// few frames still counts once, at any frame rate.
const RAMP_WINDOW_SECONDS = 0.1;
const FLASH_LIMIT = 3; // flashes in any one-second period
const PAIR_GAP_SECONDS = 1;
const STRONG_SWING = 0.24;
// Below this luminance a pixel's colour is unreliable, so it is treated as neutral (D65).
const DARK_FOR_CHROMA = 0.004;
const D65_U = 0.1978, D65_V = 0.4683;
// Pixels sampled per row: every 4th, to keep each frame cheap.
const PIXEL_STRIDE = 4;
const LINEAR = Float32Array.from({ length: 256 }, (_, value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});

type Transition = { time: number; area: number; swing: number };
type Crossings = { time: number; up: number; down: number; upSwing: number; downSwing: number; red: number };

/**
 * Finds WCAG general and red flashes in a stream of RGBA frames.
 *
 * Each pixel tracks its last luminance extreme, so a change counts once it has moved
 * 10% from that extreme, however many frames it takes. A frame registers a transition
 * only when enough area crosses in the same direction at once; motion brightens and
 * darkens similar areas together and cancels out.
 */
export function createFlashDetector() {
  let size = 0;
  let frames = 0;
  let direction = new Int8Array(0), low = new Float32Array(0), high = new Float32Array(0);
  let anchorU = new Float32Array(0), anchorV = new Float32Array(0), anchorRed = new Uint8Array(0);
  const recent: Crossings[] = [];
  let lastDirection = 0;
  const general: Transition[] = [];
  const red: Transition[] = [];

  function push(time: number, rgba: Uint8ClampedArray) {
    const count = Math.ceil(rgba.length / (4 * PIXEL_STRIDE));
    const first = frames === 0;
    if (first) {
      size = count;
      direction = new Int8Array(count); low = new Float32Array(count); high = new Float32Array(count);
      anchorU = new Float32Array(count); anchorV = new Float32Array(count); anchorRed = new Uint8Array(count);
    } else if (count !== size) {
      throw new Error("Frame size changed during analysis.");
    }
    frames += 1;

    let up = 0, down = 0, upSwing = 0, downSwing = 0, redCrossings = 0;
    for (let p = 0, i = 0; p < size; p += 1, i += 4 * PIXEL_STRIDE) {
      const r = LINEAR[rgba[i]], g = LINEAR[rgba[i + 1]], b = LINEAR[rgba[i + 2]];
      const luminance = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
      let u = D65_U, v = D65_V, saturated = 0;
      if (luminance >= DARK_FOR_CHROMA) {
        const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
        const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
        const denominator = x + 15 * luminance + 3 * z;
        u = 4 * x / denominator; v = 9 * luminance / denominator;
        saturated = r / (r + g + b) >= SATURATED_RED_SHARE ? 1 : 0;
      }
      if (first) {
        low[p] = high[p] = luminance;
        anchorU[p] = u; anchorV[p] = v; anchorRed[p] = saturated;
        continue;
      }

      // General flash: zigzag on luminance with a 10% step.
      const trend = direction[p];
      if (trend <= 0 && luminance - low[p] >= LUMINANCE_STEP) {
        if (low[p] < DARKER_STATE_LIMIT) { up += 1; upSwing += luminance - low[p]; }
        direction[p] = 1; high[p] = luminance;
      } else if (trend >= 0 && high[p] - luminance >= LUMINANCE_STEP) {
        if (luminance < DARKER_STATE_LIMIT) { down += 1; downSwing += high[p] - luminance; }
        direction[p] = -1; low[p] = luminance;
      } else {
        if (trend >= 0 && luminance > high[p]) high[p] = luminance;
        if (trend <= 0 && luminance < low[p]) low[p] = luminance;
      }

      // Red flash: a large chromaticity change to or from saturated red.
      const du = u - anchorU[p], dv = v - anchorV[p];
      if (du * du + dv * dv > RED_CHROMA_STEP * RED_CHROMA_STEP) {
        if (saturated || anchorRed[p]) redCrossings += 1;
        anchorU[p] = u; anchorV[p] = v; anchorRed[p] = saturated;
      }
    }
    if (first) return;

    recent.push({ time, up, down, upSwing, downSwing, red: redCrossings });
    while (time - recent[0].time > RAMP_WINDOW_SECONDS) recent.shift();
    let totalUp = 0, totalDown = 0, totalUpSwing = 0, totalDownSwing = 0, totalRed = 0;
    for (const entry of recent) {
      totalUp += entry.up; totalDown += entry.down; totalUpSwing += entry.upSwing; totalDownSwing += entry.downSwing; totalRed += entry.red;
    }
    const net = (totalUp - totalDown) / size;
    if (net >= FLASH_AREA && lastDirection !== 1) {
      general.push({ time, area: totalUp / size, swing: totalUpSwing / totalUp });
      lastDirection = 1;
      for (const entry of recent) entry.up = entry.down = 0;
    } else if (-net >= FLASH_AREA && lastDirection !== -1) {
      general.push({ time, area: totalDown / size, swing: totalDownSwing / totalDown });
      lastDirection = -1;
      for (const entry of recent) entry.up = entry.down = 0;
    }
    if (totalRed / size >= FLASH_AREA) {
      red.push({ time, area: totalRed / size, swing: 0 });
      for (const entry of recent) entry.red = 0;
    }
  }

  function finish(duration: number): AnalysisReport {
    const events: FlashEvent[] = [];
    const rates: Record<string, number> = {};
    let peak = 0;
    for (const [transitions, isRed] of [[general, false], [red, true]] as const) {
      let start = 0;
      let open: Transition | undefined;
      transitions.forEach((transition, index) => {
        // Transitions in the one-second window ending here; a flash is two of them.
        while (transition.time - transitions[start].time >= 1 - 1e-6) start += 1;
        const rate = (index - start + 1) / 2;
        peak = Math.max(peak, rate);
        if (open && transition.time - open.time <= PAIR_GAP_SECONDS) {
          const timestamp = formatTimestamp(transition.time);
          const area = Math.max(open.area, transition.area);
          const swing = round(Math.max(open.swing, transition.swing), 4);
          events.push({
            timestamp_seconds: round(transition.time, 3), timestamp,
            brightness_delta: swing, contrast_delta: swing, is_red_flash: isRed,
            affected_area_ratio: round(area, 4), red_area_ratio: isRed ? round(area, 4) : 0,
            exceeds_area_threshold: true,
          });
          rates[timestamp] = Math.max(rates[timestamp] ?? 0, rate);
          open = undefined;
        } else {
          open = transition;
        }
      });
    }
    events.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);

    const redCount = events.filter((event) => event.is_red_flash).length;
    const strongCount = events.filter((event) => !event.is_red_flash && event.brightness_delta >= STRONG_SWING).length;
    const riskLevel: RiskLevel = peak > FLASH_LIMIT ? "high" : peak >= 2 || redCount > 0 ? "medium" : "low";
    const recommendation = {
      high: "Flashing exceeds three flashes in one second. Edit the flagged segments before publishing.",
      medium: "Flashing stays within the limit but comes close or involves saturated red. Review the flagged segments.",
      low: "No major flash risks were detected. Review before publishing.",
    }[riskLevel];
    return {
      risk_level: riskLevel, risk_score: Math.min(100, Math.round(peak / FLASH_LIMIT * 75)),
      total_flash_events: events.length, red_flash_events: redCount, high_contrast_events: strongCount,
      flagged_timestamps: events.map((event) => event.timestamp), events, flashes_per_second: rates,
      duration_seconds: round(duration, 3), frames_analyzed: frames, recommendation,
    };
  }

  return { push, finish };
}

function round(value: number, places: number) { const scale = 10 ** places; return Math.round(value * scale) / scale; }
function formatTimestamp(seconds: number) { const safe = Math.max(0, seconds); const whole = Math.floor(safe); const hours = Math.floor(whole / 3600); const minutes = Math.floor((whole % 3600) / 60); const secs = whole % 60; const milliseconds = Math.floor((safe - whole) * 1000); return `${[hours, minutes, secs].map((part) => String(part).padStart(2, "0")).join(":")}.${String(milliseconds).padStart(3, "0")}`; }
