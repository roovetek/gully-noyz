import { describe, expect, it } from 'vitest';
import {
  createConfigFromMode,
  filterKeypointsForConfig,
} from '../../src/types/videoConfig';

describe('videoConfig helpers', () => {
  it('creates a batting preset with batting-specific defaults', () => {
    const config = createConfigFromMode('batting');

    expect(config.mode).toBe('batting');
    expect(config.trackingMode).toBe('active-bat');
    expect(config.trajectoryMode).toBe('swing-arc');
    expect(config.trackBattingPoints).toContain('bat-toe');
    expect(config.trackBowlingPoints).toEqual([]);
  });

  it('filters pose labels to only the selected entities', () => {
    const config = createConfigFromMode('bowling', {
      trackBattingPoints: [],
      trackBowlingPoints: ['head', 'bowling-arm'],
    });
    const keypoints = [
      { label: 'head', x: 1, y: 1 },
      { label: 'left_elbow', x: 2, y: 2 },
      { label: 'right_knee', x: 3, y: 3 },
      { label: 'left_ankle', x: 4, y: 4 },
    ];

    expect(filterKeypointsForConfig(keypoints, config)).toEqual([
      { label: 'head', x: 1, y: 1 },
      { label: 'left_elbow', x: 2, y: 2 },
    ]);
  });
});