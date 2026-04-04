export const CRICKET_CONSTANTS = {
  DEFAULT_BALLS_PER_OVER: 6,
  DEFAULT_TOTAL_OVERS: 20,
  MIN_OVERS: 1,
  MAX_OVERS: 50,
  MIN_BALLS_PER_OVER: 5,
  MAX_BALLS_PER_OVER: 8,
  MAX_RECORDING_DURATION: 15,
  TIMER_INTERVAL: 1000,
  TOTAL_INNINGS: 2,
  MATCH_ID_LENGTH: 6,
} as const;

export const OUTCOMES = {
  DOT: 'dot',
  ONE: '1',
  TWO: '2',
  THREE: '3',
  FOUR: '4',
  SIX: '6',
  WICKET: 'wicket',
  OUT: 'out',
} as const;

export const OUT_TYPES = {
  BOWLED: 'bowled',
  CAUGHT: 'caught',
  LBW: 'lbw',
  RUNOUT: 'runout',
  STUMPED: 'stumped',
  HIT_WICKET: 'hitwicket',
  HIT_BALL_TWICE: 'hitballtwice',
  OBSTRUCTING: 'obstructing',
  TIMED_OUT: 'timedout',
  HANDLED_BALL: 'handledball',
} as const;

export const OUT_TYPE_LABELS: Record<string, string> = {
  [OUT_TYPES.BOWLED]: 'Bowled',
  [OUT_TYPES.CAUGHT]: 'Caught',
  [OUT_TYPES.LBW]: 'Leg Before Wicket (LBW)',
  [OUT_TYPES.RUNOUT]: 'Run Out',
  [OUT_TYPES.STUMPED]: 'Stumped',
  [OUT_TYPES.HIT_WICKET]: 'Hit Wicket',
  [OUT_TYPES.HIT_BALL_TWICE]: 'Hit the Ball Twice',
  [OUT_TYPES.OBSTRUCTING]: 'Obstructing the Field',
  [OUT_TYPES.TIMED_OUT]: 'Timed Out',
  [OUT_TYPES.HANDLED_BALL]: 'Handled the Ball',
};

export const STORAGE_KEYS = {
  MATCH_ID: 'current_match_id',
  MATCH_NAME: 'current_match_name',
  MATCH_SECRET_PREFIX: 'match_secret_',
} as const;

export const MEDIA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'environment',
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  audio: true,
};

export const ERROR_MESSAGES = {
  MATCH_NOT_FOUND: 'Match not found',
  INCORRECT_SECRET: 'Incorrect secret',
  FAILED_TO_JOIN: 'Failed to join match',
  FAILED_TO_CREATE: 'Failed to create match. Please try again.',
  CAMERA_ACCESS: 'Camera access error',
  UPLOAD_FAILED: 'Upload failed',
  BALL_ALREADY_RECORDED: 'Ball has already been recorded',
  MATCH_NAME_REQUIRED: 'Please enter a match name',
  SECRET_REQUIRED: 'Please enter a secret for private match',
  MATCH_ID_REQUIRED: 'Please enter a Match ID',
  SELECT_DISMISSAL: 'Please select the type of dismissal',
  SELECT_OUTCOME: 'Please select outcome',
} as const;

export const TABS = {
  RECORD: 'record',
  TIMELINE: 'timeline',
  STATS: 'stats',
} as const;

export type TabType = typeof TABS[keyof typeof TABS];
export type OutcomeType = typeof OUTCOMES[keyof typeof OUTCOMES];
export type OutType = typeof OUT_TYPES[keyof typeof OUT_TYPES];
