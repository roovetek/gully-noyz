import { useMatch } from '../context/MatchContext';
import { VideoCapture } from './VideoCapture';
import { MatchHeaderSummary } from './MatchHeaderSummary';
import { MatchPageSummaryStrip } from './MatchPageSummaryStrip';

export function Record() {
  const { matchId } = useMatch();

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col pt-16 pb-20">
      {matchId && (
        <MatchPageSummaryStrip>
          <MatchHeaderSummary variant="solid" showNameEdit />
        </MatchPageSummaryStrip>
      )}

      <div className="flex-1 min-h-0 relative">
        <VideoCapture />
      </div>
    </div>
  );
}
