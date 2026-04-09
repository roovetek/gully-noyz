import { useMatch } from '../context/MatchContext';
import { VideoCapture } from './VideoCapture';
import { MatchHeaderSummary } from './MatchHeaderSummary';
import { MatchPageSummaryStrip } from './MatchPageSummaryStrip';

export function Record() {
  const { matchId } = useMatch();

  return (
    <div className="flex w-full flex-1 min-h-0 flex-col bg-black pb-20 text-white">
      {matchId && (
        <MatchPageSummaryStrip>
          <MatchHeaderSummary variant="solid" showNameEdit />
        </MatchPageSummaryStrip>
      )}

      {/* In-flow layout (not position:fixed) so flex height reaches VideoCapture; fixed was collapsing h-full on some viewports */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <VideoCapture />
      </div>
    </div>
  );
}
