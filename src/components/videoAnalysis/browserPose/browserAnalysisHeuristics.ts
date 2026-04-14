import type { BrowserPoseFrame } from './runBrowserPoseScan';
import type { AnalysisRole, StylePreset } from '../stylePresets';
import type { TrajectoryPoint } from '../types';

function kp(frames: BrowserPoseFrame[], label: string) {
  return frames.map((f) => {
    const p = f.keypointsNorm.find((k) => k.label === label);
    return { t: f.timeSec, x: p?.x ?? NaN, y: p?.y ?? NaN };
  });
}

function meanHipX(frames: BrowserPoseFrame[]): number[] {
  return frames.map((f) => {
    const lh = f.keypointsNorm.find((k) => k.label === 'left_hip');
    const rh = f.keypointsNorm.find((k) => k.label === 'right_hip');
    if (!lh || !rh) return NaN;
    return (lh.x + rh.x) / 2;
  });
}

export interface BrowserHeuristicSummary {
  stanceWidthNorm: number;
  wristTravelY: number;
  hipTravelX: number;
  phases: string[];
  wristTrajectory: TrajectoryPoint[];
}

function dominantWristLabel(role: AnalysisRole, handedness: 'right' | 'left'): string {
  if (role === 'batting') {
    return handedness === 'right' ? 'right_wrist' : 'left_wrist';
  }
  return handedness === 'right' ? 'right_wrist' : 'left_wrist';
}

export function computeBrowserHeuristics(
  frames: BrowserPoseFrame[],
  role: AnalysisRole,
  handedness: 'right' | 'left'
): BrowserHeuristicSummary | null {
  if (frames.length < 2) return null;

  const ankleL = kp(frames, 'left_ankle');
  const ankleR = kp(frames, 'right_ankle');
  const stanceSamples = frames.map((_, i) => {
    if (Number.isNaN(ankleL[i].x) || Number.isNaN(ankleR[i].x)) return NaN;
    return Math.abs(ankleL[i].x - ankleR[i].x);
  });
  const validSw = stanceSamples.filter((v) => !Number.isNaN(v));
  const stanceWidthNorm =
    validSw.length === 0
      ? 0
      : [...validSw].sort((a, b) => a - b)[Math.floor(validSw.length / 2)] ?? 0;

  const wristLbl = dominantWristLabel(role, handedness);
  const wrist = kp(frames, wristLbl);
  const ys = wrist.map((w) => w.y).filter((y) => !Number.isNaN(y));
  const wristTravelY = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;

  const hipX = meanHipX(frames).filter((x) => !Number.isNaN(x));
  const hipTravelX = hipX.length ? Math.max(...hipX) - Math.min(...hipX) : 0;

  const wristTrajectory: TrajectoryPoint[] = wrist
    .filter((w) => !Number.isNaN(w.x) && !Number.isNaN(w.y))
    .map((w) => ({ x: w.x, y: w.y, t: w.t }));

  const phases: string[] = [];
  if (role === 'batting') {
    const n = wrist.length;
    if (n >= 4) {
      const q = Math.floor(n / 4);
      phases.push(`Early (${wrist[0].t.toFixed(1)}s–${wrist[q].t.toFixed(1)}s): setup / gather — estimate`);
      phases.push(`Mid (${wrist[q].t.toFixed(1)}s–${wrist[2 * q].t.toFixed(1)}s): backlift / load — estimate`);
      phases.push(`Late (${wrist[2 * q].t.toFixed(1)}s–${wrist[3 * q].t.toFixed(1)}s): downswing — estimate`);
      phases.push(`Finish (${wrist[3 * q].t.toFixed(1)}s–${wrist[n - 1].t.toFixed(1)}s): follow-through — estimate`);
    } else {
      phases.push('Batting phases: need more frames for quartile split.');
    }
  } else {
    phases.push(`Approach / run-up (hip travel ~${hipTravelX.toFixed(2)} norm. units) — estimate`);
    phases.push('Bound / gather: check knee/hip dip in slow motion — not inferred reliably from pose alone');
    phases.push('Release: arm height proxy from shoulder–wrist line — single-camera caveat');
    phases.push('Follow-through: trunk rotation and front-arm height — qualitative review');
  }

  return { stanceWidthNorm, wristTravelY, hipTravelX, phases, wristTrajectory };
}

export function compareToPreset(summary: BrowserHeuristicSummary, preset: StylePreset): string[] {
  const lines: string[] = [];
  const { stanceWidthNorm, wristTravelY, hipTravelX } = summary;
  const sw = preset.stanceWidthNorm;
  if (stanceWidthNorm < sw.min) {
    lines.push(`Stance width (ankle proxy) is narrower than the ${preset.playerName} band — you may prefer a wider base.`);
  } else if (stanceWidthNorm > sw.max) {
    lines.push(`Stance width is wider than the ${preset.playerName} band — narrowing slightly can help mobility for some batters.`);
  } else {
    lines.push(`Stance width sits near the illustrative ${preset.playerName} range.`);
  }

  const wt = preset.wristTravelY;
  if (preset.role === 'batting') {
    if (wristTravelY < wt.min) {
      lines.push(`Hand path range is smaller than the ${preset.playerName} template — explore a slightly taller backlift if timing allows.`);
    } else if (wristTravelY > wt.max) {
      lines.push(`Hand path range is larger than the ${preset.playerName} template — check excess movement vs head stability.`);
    } else {
      lines.push(`Backlift / hand-path envelope is in the ballpark of the ${preset.playerName} preset.`);
    }
  }

  const hx = preset.hipTravelX;
  if (preset.role === 'bowling') {
    if (hipTravelX < hx.min) {
      lines.push(`Horizontal hip travel is less than the ${preset.playerName} preset — you might add a few steps of rhythm if safe.`);
    } else if (hipTravelX > hx.max) {
      lines.push(`Horizontal hip travel is larger than the ${preset.playerName} preset — check control and repeatability at the crease.`);
    } else {
      lines.push(`Run-up length proxy is near the ${preset.playerName} illustrative band.`);
    }
  }

  lines.push(preset.disclaimer);
  return lines;
}
