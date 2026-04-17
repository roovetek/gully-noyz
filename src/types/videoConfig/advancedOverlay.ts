/**
 * Advanced overlay configuration for cricket analysis.
 */

export const ANALYSIS_MODES = ['batting', 'bowling', 'mixed'] as const;
export type AnalysisMode = (typeof ANALYSIS_MODES)[number];

export const ENTITY_TYPES = [
  'head',
  'torso',
  'bat-toe',
  'bat-handle',
  'bat-hand',
  'bowling-arm',
  'bowling-leg',
  'toe-line',
  'ball',
] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const TRAJECTORY_MODES = ['none', 'swing-arc', 'flight-path'] as const;
export type TrajectoryMode = (typeof TRAJECTORY_MODES)[number];

export const TRACKING_MODES = ['all', 'active-bat', 'active-bowler', 'auto-filter'] as const;
export type TrackingMode = (typeof TRACKING_MODES)[number];

/**
 * Configuration for the Advanced Overlay System
 * Controls tracking behavior, trajectory rendering, and object prioritization
 */
export interface AdvancedOverlayConfig {
  mode: AnalysisMode;
  trackBattingPoints: EntityType[];
  trackBowlingPoints: EntityType[];
  trajectoryMode: TrajectoryMode;
  prioritizeBall: boolean;
  trackingMode: TrackingMode;
  objectDetectionThreshold: {
    ball: number;
    bat: number;
    player: number;
  };
  trajectoryContinuity: 'strict' | 'predictive' | 'smooth-flow';
  focusRegion: 'full-frame' | 'batting-end' | 'bowling-end' | 'dynamic';
  entityColor: string;
  trajectoryColor: string;
  lineWidth: number;
  trajectoryPoints: number;
  showLabels: boolean;
}

export const DEFAULT_ADVANCED_OVERLAY_CONFIG: AdvancedOverlayConfig = {
  mode: 'mixed',
  trackBattingPoints: ['head', 'bat-toe', 'bat-handle', 'ball'],
  trackBowlingPoints: ['head', 'bowling-arm', 'bowling-leg', 'ball'],
  trajectoryMode: 'none',
  prioritizeBall: true,
  trackingMode: 'auto-filter',
  objectDetectionThreshold: {
    ball: 0.6,
    bat: 0.55,
    player: 0.5,
  },
  trajectoryContinuity: 'smooth-flow',
  focusRegion: 'full-frame',
  entityColor: '#34d399',
  trajectoryColor: '#fbbf24',
  lineWidth: 2,
  trajectoryPoints: 20,
  showLabels: true,
};

export const MODE_PRESETS: Record<
  AnalysisMode,
  Pick<
    AdvancedOverlayConfig,
    'trackBattingPoints' | 'trackBowlingPoints' | 'trajectoryMode' | 'trackingMode' | 'focusRegion'
  >
> = {
  batting: {
    trackBattingPoints: ['head', 'torso', 'bat-toe', 'bat-handle', 'bat-hand', 'ball'],
    trackBowlingPoints: [],
    trajectoryMode: 'swing-arc',
    trackingMode: 'active-bat',
    focusRegion: 'batting-end',
  },
  bowling: {
    trackBattingPoints: [],
    trackBowlingPoints: ['head', 'bowling-arm', 'bowling-leg', 'toe-line', 'ball'],
    trajectoryMode: 'flight-path',
    trackingMode: 'active-bowler',
    focusRegion: 'bowling-end',
  },
  mixed: {
    trackBattingPoints: ['head', 'bat-toe', 'bat-handle', 'ball'],
    trackBowlingPoints: ['head', 'bowling-arm', 'bowling-leg', 'ball'],
    trajectoryMode: 'none',
    trackingMode: 'auto-filter',
    focusRegion: 'full-frame',
  },
};

export function createConfigFromMode(
  mode: AnalysisMode,
  customConfig?: Partial<AdvancedOverlayConfig>
): AdvancedOverlayConfig {
  const preset = MODE_PRESETS[mode];
  return {
    ...DEFAULT_ADVANCED_OVERLAY_CONFIG,
    ...preset,
    mode,
    ...customConfig,
  };
}

export function getTrackedEntities(config: AdvancedOverlayConfig): EntityType[] {
  return Array.from(new Set([...config.trackBattingPoints, ...config.trackBowlingPoints]));
}
