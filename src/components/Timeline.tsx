import { useMatch } from '../context/MatchContext';
import { MatchTimeline } from './MatchTimeline';
import { MatchHeaderSummary } from './MatchHeaderSummary';
import { MatchPageSummaryStrip } from './MatchPageSummaryStrip';

export function Timeline() {
  const { matchId } = useMatch();

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {matchId && (
        <MatchPageSummaryStrip>
          <MatchHeaderSummary variant="solid" showNameEdit />
        </MatchPageSummaryStrip>
      )}

      <MatchTimeline />
    </div>
  );
}
