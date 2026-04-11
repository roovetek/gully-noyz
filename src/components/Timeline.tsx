import { useMatch } from '../context/MatchContext';
import { MatchTimeline } from './MatchTimeline';
import { MatchHeaderSummary } from './MatchHeaderSummary';
import { MatchPageSummaryStrip } from './MatchPageSummaryStrip';

export function Timeline() {
  const { matchId } = useMatch();

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-black pb-20 text-white">
      {matchId && (
        <MatchPageSummaryStrip>
          <MatchHeaderSummary variant="solid" showNameEdit />
        </MatchPageSummaryStrip>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <MatchTimeline />
      </div>
    </div>
  );
}
