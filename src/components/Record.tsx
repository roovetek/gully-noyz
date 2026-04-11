import { useMatch } from '../context/MatchContext';
import { ScoringInterface } from './ScoringInterface';
import { MatchHeaderSummary } from './MatchHeaderSummary';
import { MatchPageSummaryStrip } from './MatchPageSummaryStrip';

export function Record() {
  const { matchId } = useMatch();

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-black pb-20 text-white">
      {matchId && (
        <MatchPageSummaryStrip>
          <MatchHeaderSummary variant="solid" showNameEdit />
        </MatchPageSummaryStrip>
      )}

      {/* In-flow layout (not position:fixed) so flex height reaches ScoringInterface; fixed was collapsing h-full on some viewports */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <ScoringInterface />
      </div>
    </div>
  );
}
