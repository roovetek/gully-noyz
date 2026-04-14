export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  confidence: number;
}

export interface SkeletonKeypoint {
  x: number;
  y: number;
  label: string;
}

export interface TrajectoryPoint {
  x: number;
  y: number;
  t: number;
}

export interface ReasoningEntry {
  message: string;
  timestamp: number;
  type: 'info' | 'warning' | 'success' | 'analysis';
}

export interface AnalysisDelivery {
  id: string;
  over_number: number;
  ball_number: number;
  batsman: string;
  bowler: string;
  runs: number;
  extras: number;
  wicket: boolean;
  shot_type: string | null;
  ball_speed_kmh: number | null;
  timestamp_seconds: number;
}
