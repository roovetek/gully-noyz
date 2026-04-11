import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, type Clip } from '../lib/supabase';
import { getTestDataFilter } from '../lib/testDataFilter';
import { calculateMatchStats } from '../lib/match';
import type { InningsLine } from '../lib/inningsLine';
import { useMatch } from './MatchContext';

export type MatchClipsContextValue = {
  matchId: string | null;
  clips: Clip[];
  inn1: InningsLine;
  inn2: InningsLine;
  loading: boolean;
  currentInnings: number;
  ballsPerOver: number;
  totalOvers: number;
  refresh: () => Promise<void>;
};

const MatchClipsContext = createContext<MatchClipsContextValue | null>(null);

export function MatchClipsProvider({ children }: { children: ReactNode }) {
  const { matchId } = useMatch();
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [ballsPerOver, setBallsPerOver] = useState(6);
  const [totalOvers, setTotalOvers] = useState(20);
  const [currentInnings, setCurrentInnings] = useState(1);

  const load = useCallback(async () => {
    if (!matchId) {
      setClips([]);
      setBallsPerOver(6);
      setTotalOvers(20);
      setCurrentInnings(1);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('balls_per_over, total_overs, current_innings')
      .eq('match_id', matchId)
      .maybeSingle();

    const bpo = matchData?.balls_per_over ?? 6;
    const to = matchData?.total_overs ?? 20;
    const ci = matchData?.current_innings === 2 ? 2 : 1;

    setBallsPerOver(bpo);
    setTotalOvers(to);
    setCurrentInnings(ci);

    const testDataFilter = getTestDataFilter();
    let q = supabase.from('clips').select('*').eq('match_id', matchId);

    if (testDataFilter !== undefined) {
      q = q.eq('is_test_data', testDataFilter);
    }

    const { data: clipRows } = await q
      .order('innings_number', { ascending: true })
      .order('over_number', { ascending: true })
      .order('delivery_index', { ascending: true })
      .order('ball_number', { ascending: true });

    setClips((clipRows as Clip[]) ?? []);
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match_clips_sync_${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clips', filter: `match_id=eq.${matchId}` },
        () => {
          void load();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `match_id=eq.${matchId}` },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, load]);

  const inn1 = useMemo(() => {
    const c1 = clips.filter((c) => c.innings_number === 1);
    const s = calculateMatchStats(c1, ballsPerOver);
    return { runs: s.totalRuns, wickets: s.totalWickets, overs: s.currentOvers };
  }, [clips, ballsPerOver]);

  const inn2 = useMemo(() => {
    const c2 = clips.filter((c) => c.innings_number === 2);
    const s = calculateMatchStats(c2, ballsPerOver);
    return { runs: s.totalRuns, wickets: s.totalWickets, overs: s.currentOvers };
  }, [clips, ballsPerOver]);

  const value = useMemo<MatchClipsContextValue>(
    () => ({
      matchId,
      clips,
      inn1,
      inn2,
      loading,
      currentInnings,
      ballsPerOver,
      totalOvers,
      refresh: load,
    }),
    [matchId, clips, inn1, inn2, loading, currentInnings, ballsPerOver, totalOvers, load]
  );

  return <MatchClipsContext.Provider value={value}>{children}</MatchClipsContext.Provider>;
}

export function useMatchClips(): MatchClipsContextValue {
  const ctx = useContext(MatchClipsContext);
  if (!ctx) {
    throw new Error('useMatchClips must be used within MatchClipsProvider');
  }
  return ctx;
}

/** For tests or rare mounts outside the provider (returns empty stats). */
export function useMatchClipsOptional(): MatchClipsContextValue | null {
  return useContext(MatchClipsContext);
}
