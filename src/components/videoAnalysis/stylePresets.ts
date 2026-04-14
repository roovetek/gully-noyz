export type AnalysisRole = 'batting' | 'bowling';

export interface StylePreset {
  id: string;
  playerName: string;
  role: AnalysisRole;
  /** Short public-style description for coaching context (not a medical claim). */
  summary: string;
  disclaimer: string;
  /** Typical normalized horizontal ankle separation (0–1 of frame width), approximate band. */
  stanceWidthNorm: { min: number; max: number };
  /** Batting: vertical range of dominant wrist y during clip (normalized 0–1); larger implies a bigger hand-path envelope. */
  wristTravelY: { min: number; max: number };
  /** Bowling: normalized range of hip center x (proxy for run-up horizontal travel). */
  hipTravelX: { min: number; max: number };
}

/** Illustrative templates — not measured from private athlete data. */
export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'kohli-bat',
    playerName: 'Virat Kohli',
    role: 'batting',
    summary: 'Compact base, strong base-to-ball head position, controlled backlift.',
    disclaimer:
      'Preset bands are educational guesses from broadcast-style footage, not an exact match to any pro swing.',
    stanceWidthNorm: { min: 0.12, max: 0.22 },
    wristTravelY: { min: 0.12, max: 0.28 },
    hipTravelX: { min: 0.02, max: 0.12 },
  },
  {
    id: 'smith-bat',
    playerName: 'Steve Smith',
    role: 'batting',
    summary: 'Distinctive lateral pre-movement, hands busy but balanced at release.',
    disclaimer:
      'Use as a style reference only; copying movement patterns should be done with a qualified coach.',
    stanceWidthNorm: { min: 0.1, max: 0.2 },
    wristTravelY: { min: 0.14, max: 0.32 },
    hipTravelX: { min: 0.03, max: 0.15 },
  },
  {
    id: 'bumrah-bowl',
    playerName: 'Jasprit Bumrah',
    role: 'bowling',
    summary: 'Short approach, braced front leg, whippy release — emphasis on repeatability.',
    disclaimer: 'Fast bowling is high load; any drill should respect workload and supervision.',
    stanceWidthNorm: { min: 0.08, max: 0.18 },
    wristTravelY: { min: 0.1, max: 0.26 },
    hipTravelX: { min: 0.05, max: 0.2 },
  },
  {
    id: 'steyn-bowl',
    playerName: 'Dale Steyn',
    role: 'bowling',
    summary: 'Longer rhythm in approach, aggressive chest drive through the crease.',
    disclaimer: 'Line/length from a single 2D phone angle is unreliable; treat metrics as coarse.',
    stanceWidthNorm: { min: 0.09, max: 0.19 },
    wristTravelY: { min: 0.12, max: 0.3 },
    hipTravelX: { min: 0.08, max: 0.24 },
  },
];

export function presetForRole(role: AnalysisRole): StylePreset[] {
  return STYLE_PRESETS.filter((p) => p.role === role);
}
