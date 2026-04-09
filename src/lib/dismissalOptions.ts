/** Canonical list — keep in sync with DB / clip `dismissal_type` values. */
export const DISMISSAL_TYPES = [
  'unknown',
  'bowled',
  'caught',
  'lbw',
  'runout',
  'stumped',
  'hitwicket',
  'hitballtwice',
  'obstructing',
  'timedout',
  'handledball',
] as const;

export type DismissalType = (typeof DISMISSAL_TYPES)[number];
export interface DismissalOption {
  value: string;
  label: string;
}

/** Typical international frequency order (primary block). */
const PRIMARY_DISMISSAL_ORDER = ['bowled', 'caught', 'lbw', 'runout', 'stumped'] as const;

/**
 * Fixed order for dismissal selects: primary block first, then remaining keys from
 * {@link DISMISSAL_TYPES} alphabetically, then `unknown` last (shown as “Other”).
 */
export function getDismissalOptionOrder(): string[] {
  const primary = new Set<string>(PRIMARY_DISMISSAL_ORDER);
  const rest = DISMISSAL_TYPES.filter((t) => t !== 'unknown' && !primary.has(t));
  rest.sort((a, b) => a.localeCompare(b));
  return [...PRIMARY_DISMISSAL_ORDER, ...rest, 'unknown'];
}

const OPTION_LABELS: Record<string, string> = {
  bowled: 'Bowled',
  caught: 'Caught',
  lbw: 'Leg Before Wicket (LBW)',
  runout: 'Run Out',
  stumped: 'Stumped',
  hitwicket: 'Hit Wicket',
  hitballtwice: 'Hit the Ball Twice',
  obstructing: 'Obstructing the Field',
  timedout: 'Timed Out',
  handledball: 'Handled the Ball',
};

/** Human-readable label for a dismissal option in dropdowns. */
export function formatDismissalOptionLabel(kind: string): string {
  if (kind === 'unknown') return 'Other';
  if (OPTION_LABELS[kind]) return OPTION_LABELS[kind];
  return kind.charAt(0).toUpperCase() + kind.slice(1);
}

/** Offline-safe fallback options when lookup rows are unavailable. */
export function getFallbackDismissalOptions(): DismissalOption[] {
  return getDismissalOptionOrder().map((kind) => ({
    value: kind,
    label: formatDismissalOptionLabel(kind),
  }));
}
