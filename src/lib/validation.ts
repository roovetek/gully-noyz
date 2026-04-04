import { CRICKET_CONSTANTS, ERROR_MESSAGES } from './constants';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateMatchName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { isValid: false, error: ERROR_MESSAGES.MATCH_NAME_REQUIRED };
  }
  if (trimmed.length < 3) {
    return { isValid: false, error: 'Match name must be at least 3 characters' };
  }
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Match name must be less than 100 characters' };
  }
  return { isValid: true };
}

export function validateMatchSecret(secret: string, isPrivate: boolean): ValidationResult {
  if (!isPrivate) {
    return { isValid: true };
  }

  const trimmed = secret.trim();
  if (!trimmed) {
    return { isValid: false, error: ERROR_MESSAGES.SECRET_REQUIRED };
  }
  if (trimmed.length < 6) {
    return { isValid: false, error: 'Secret must be at least 6 characters' };
  }
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Secret must be less than 50 characters' };
  }
  return { isValid: true };
}

export function validateMatchId(matchId: string): ValidationResult {
  const trimmed = matchId.trim().toUpperCase();
  if (!trimmed) {
    return { isValid: false, error: ERROR_MESSAGES.MATCH_ID_REQUIRED };
  }
  if (trimmed.length !== CRICKET_CONSTANTS.MATCH_ID_LENGTH) {
    return {
      isValid: false,
      error: `Match ID must be ${CRICKET_CONSTANTS.MATCH_ID_LENGTH} characters`
    };
  }
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return { isValid: false, error: 'Match ID must contain only letters and numbers' };
  }
  return { isValid: true };
}

export function validateOversConfig(
  totalOvers: number,
  ballsPerOver: number
): ValidationResult {
  if (totalOvers < CRICKET_CONSTANTS.MIN_OVERS || totalOvers > CRICKET_CONSTANTS.MAX_OVERS) {
    return {
      isValid: false,
      error: `Total overs must be between ${CRICKET_CONSTANTS.MIN_OVERS} and ${CRICKET_CONSTANTS.MAX_OVERS}`,
    };
  }

  if (
    ballsPerOver < CRICKET_CONSTANTS.MIN_BALLS_PER_OVER ||
    ballsPerOver > CRICKET_CONSTANTS.MAX_BALLS_PER_OVER
  ) {
    return {
      isValid: false,
      error: `Balls per over must be between ${CRICKET_CONSTANTS.MIN_BALLS_PER_OVER} and ${CRICKET_CONSTANTS.MAX_BALLS_PER_OVER}`,
    };
  }

  return { isValid: true };
}

export function validateOutcome(outcome: string | null): ValidationResult {
  if (!outcome) {
    return { isValid: false, error: ERROR_MESSAGES.SELECT_OUTCOME };
  }
  return { isValid: true };
}

export function validateDismissal(
  outcome: string | null,
  outType: string | null
): ValidationResult {
  if (outcome === 'out' && !outType) {
    return { isValid: false, error: ERROR_MESSAGES.SELECT_DISMISSAL };
  }
  return { isValid: true };
}

export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

export function normalizeMatchId(matchId: string): string {
  return matchId.trim().toUpperCase();
}
