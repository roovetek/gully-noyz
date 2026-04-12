import { useMatch } from '../context/MatchContext';

export function SessionIndicator() {
  const { sessionWarning } = useMatch();

  if (!sessionWarning) {
    return null;
  }

  const minutesRemaining = Math.ceil(sessionWarning / 60000);

  return (
    <div className="bg-amber-900 border-l border-amber-700 px-3 py-2">
      <p className="text-xs text-amber-300 font-semibold">
        Session expires in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
