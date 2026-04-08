import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTestDataFilter } from '../lib/testDataFilter';
import { calculateMatchStats } from '../lib/match';

export interface InningsLine {
  runs: number;
  wickets: number;
  overs: string;
}

const emptyLine = (): InningsLine => ({ runs: 0, wickets: 0, overs: '0' });

export function useMatchInningsLines(matchId: string | null) {
  const [inn1, setInn1] = useState<InningsLine>(emptyLine);
  const [inn2, setInn2] = useState<InningsLine>(emptyLine);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!matchId) {
      setInn1(emptyLine());
      setInn2(emptyLine());
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: matchData } = await supabase
      .from('matches')
      .select('balls_per_over')
      .eq('match_id', matchId)
      .maybeSingle();

    const bpo = matchData?.balls_per_over ?? 6;

    const testDataFilter = getTestDataFilter();
    let q = supabase
      .from('clips')
      .select('outcome, dismissal_type, over_number, ball_number, innings_number')
      .eq('match_id', matchId);

    if (testDataFilter !== undefined) {
      q = q.eq('is_test_data', testDataFilter);
    }

    const { data: clips } = await q;

    const c1 = (clips || []).filter((c) => c.innings_number === 1);
    const c2 = (clips || []).filter((c) => c.innings_number === 2);

    const s1 = calculateMatchStats(c1, bpo);
    const s2 = calculateMatchStats(c2, bpo);

    setInn1({
      runs: s1.totalRuns,
      wickets: s1.totalWickets,
      overs: s1.currentOvers,
    });
    setInn2({
      runs: s2.totalRuns,
      wickets: s2.totalWickets,
      overs: s2.currentOvers,
    });
    setLoading(false);
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!matchId) return;

    const channel = supabase
      .channel(`match_innings_lines_${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clips', filter: `match_id=eq.${matchId}` },
        () => {
          void load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, load]);

  return { inn1, inn2, loading };
}
