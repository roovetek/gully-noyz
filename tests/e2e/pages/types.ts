export interface CreateMatchOptions {
  name: string;
  umpirePasscode: string;
  isPrivate?: boolean;
  secret?: string;
  customizeRules?: {
    oversPerInnings?: number;
    ballsPerOver?: number;
    maxWickets?: number;
    maxOversPerBowler?: number;
  };
}

export type ManualOutcome =
  | 'dot'
  | '1'
  | '2'
  | '3'
  | '4'
  | '6'
  | 'wide'
  | 'noball'
  | 'wicket'
  | 'other';

