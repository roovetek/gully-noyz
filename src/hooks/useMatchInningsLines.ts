import { useMatchClipsOptional } from '../context/MatchClipsContext';
import type { InningsLine } from '../lib/inningsLine';

export type { InningsLine };

const emptyLine = (): InningsLine => ({ runs: 0, wickets: 0, overs: '0' });

export function useMatchInningsLines(matchId: string | null) {
  const ctxOptional = useMatchClipsOptional();
  if (!matchId || !ctxOptional) {
    return { inn1: emptyLine(), inn2: emptyLine(), loading: !matchId ? false : true, currentInnings: 1 };
  }
  const ctx = ctxOptional;
  return {
    inn1: ctx.inn1,
    inn2: ctx.inn2,
    loading: ctx.loading,
    currentInnings: ctx.currentInnings,
  };
}
