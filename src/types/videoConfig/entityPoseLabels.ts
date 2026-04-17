/**
 * Entity Pose Labels and Keypoint Filtering
 * Maps entities to pose keypoints for filtering and trajectory capping
 */

import type { AdvancedOverlayConfig, EntityType } from './advancedOverlay';

/**
 * Mapping of entity types to their pose keypoints
 * Used for filtering and trajectory capping
 */
export const ENTITY_POSE_LABELS: Record<EntityType, string[]> = {
  head: ['head'],
  torso: ['left_shoulder', 'right_shoulder', 'left_hip', 'right_hip'],
  'bat-toe': ['left_wrist', 'right_wrist'],
  'bat-handle': ['left_wrist', 'right_wrist'],
  'bat-hand': ['left_wrist', 'right_wrist'],
  'bowling-arm': ['left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow'],
  'bowling-leg': ['left_hip', 'right_hip', 'left_knee', 'right_knee'],
  'toe-line': ['left_ankle', 'right_ankle'],
  ball: ['ball'],
};

/**
 * Get keypoints for a specific entity type
 * @param entityType - The entity type to get keypoints for
 * @returns Array of pose keypoint labels
 */
export function getEntityKeypoints(entityType: EntityType): string[] {
  return ENTITY_POSE_LABELS[entityType] ?? [];
}

/**
 * Check if a pose keypoint belongs to an entity
 * @param entityType - The entity type to check
 * @param keypointLabel - The pose keypoint label to check
 * @returns true if the keypoint belongs to the entity
 */
export function isKeypointForEntity(
  entityType: EntityType,
  keypointLabel: string
): boolean {
  const keypoints = getEntityKeypoints(entityType);
  return keypoints.includes(keypointLabel);
}

/**
 * Get all keypoints for multiple entity types
 * @param entityTypes - Array of entity types
 * @returns Array of unique pose keypoint labels
 */
export function getEntityKeypointsForTypes(
  entityTypes: EntityType[]
): string[] {
  const allKeypoints = entityTypes.flatMap(getEntityKeypoints);
  return Array.from(new Set(allKeypoints));
}

export function filterKeypointsForConfig<T extends { label: string }>(
  keypoints: T[],
  config: AdvancedOverlayConfig
): T[] {
  const trackedLabels = getEntityKeypointsForTypes([
    ...config.trackBattingPoints,
    ...config.trackBowlingPoints,
  ]);

  if (trackedLabels.length === 0) {
    return keypoints;
  }

  const allowed = new Set(trackedLabels);
  return keypoints.filter((keypoint) => allowed.has(keypoint.label));
}

export function capTrajectory<T>(points: T[], maxPoints: number): T[] {
  if (maxPoints <= 0) {
    return [];
  }
  if (points.length <= maxPoints) {
    return [...points];
  }
  return points.slice(points.length - maxPoints);
}
