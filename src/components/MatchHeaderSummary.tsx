import { CreditCard as Edit2, Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMatch } from '../context/MatchContext';
import { executeTrackedAction, supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { userFriendlyMessage } from '../lib/userFriendlyError';
import { useMatchInningsLines } from '../hooks/useMatchInningsLines';

type Variant = 'glass' | 'solid';

interface MatchHeaderSummaryProps {
  /** `solid` matches all match tabs; `glass` is optional for overlays. */
  variant?: Variant;
  /** Show inline name edit (Record, Timeline, Stats). */
  showNameEdit?: boolean;
}

const shellClass: Record<Variant, string> = {
  glass: 'bg-black/70 backdrop-blur px-3 py-2 rounded-lg border border-yellow-400',
  solid: 'bg-gray-900 px-3 py-2 rounded-lg border border-yellow-400',
};

export function MatchHeaderSummary({ variant = 'solid', showNameEdit = true }: MatchHeaderSummaryProps) {
  const { matchId, matchName, setMatchName } = useMatch();
  const { inn1, inn2, loading } = useMatchInningsLines(matchId);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(matchName);
  const [matchCreatedAt, setMatchCreatedAt] = useState<string | null>(null);
  const [nameSaveError, setNameSaveError] = useState<string | null>(null);

  useEffect(() => {
    setEditedName(matchName);
  }, [matchName]);

  useEffect(() => {
    if (!matchId) {
      setMatchCreatedAt(null);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from('matches')
        .select('name, created_at')
        .eq('match_id', matchId)
        .maybeSingle();
      if (data?.name) {
        setMatchName(data.name);
        setEditedName(data.name);
      }
      setMatchCreatedAt(data?.created_at ?? null);
    })();
  }, [matchId, setMatchName]);

  const handleSaveName = async () => {
    if (!editedName.trim() || !matchId) return;
    setNameSaveError(null);
    try {
      const { error } = await executeTrackedAction({
        tableName: 'matches',
        action: 'update_name',
        matchId,
        payload: { name: editedName.trim() },
        execute: () =>
          supabase.from('matches').update({ name: editedName.trim() }).eq('match_id', matchId),
      });
      if (error) {
        logger.error('Failed to update match name', error);
        setNameSaveError(
          userFriendlyMessage(error, { fallback: 'Could not update match name. Please try again.' })
        );
        return;
      }
      setMatchName(editedName.trim());
      setIsEditing(false);
    } catch (err) {
      logger.error('Error updating match name', err);
      setNameSaveError(
        userFriendlyMessage(err, { fallback: 'Could not update match name. Please try again.' })
      );
    }
  };

  if (!matchId) return null;

  return (
    <div className={`${shellClass[variant]} flex flex-col gap-1.5 min-w-0 max-w-[min(100%,22rem)]`}>
      {showNameEdit && isEditing ? (
        <div className="flex flex-col gap-1.5 w-full min-w-0">
          {nameSaveError && (
            <p className="text-red-400 text-xs" role="alert">
              {nameSaveError}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm flex-1 min-w-[8rem]"
              autoFocus
            />
            <button type="button" onClick={handleSaveName} className="p-1 bg-green-500 hover:bg-green-600 rounded">
              <Check size={16} className="text-black" />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditedName(matchName);
                setNameSaveError(null);
              }}
              className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
          {matchCreatedAt && (
            <div className="text-[11px] text-gray-400">
              <span className="text-gray-500">Date </span>
              <span className="text-gray-300">{new Date(matchCreatedAt).toLocaleString()}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {matchName ? (
              <div className="text-white font-bold text-sm truncate">{matchName}</div>
            ) : (
              <div className="text-gray-500 text-sm">Unnamed match</div>
            )}
            <div className="text-[11px] mt-0.5">
              <span className="text-gray-400">ID </span>
              <span className="text-yellow-400 font-mono font-bold">{matchId}</span>
            </div>
            {matchCreatedAt && (
              <div className="text-[11px] mt-1 text-gray-400">
                <span className="text-gray-500">Date </span>
                <span className="text-gray-300">{new Date(matchCreatedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
          {showNameEdit && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-gray-700/80 rounded flex-shrink-0"
              aria-label="Edit match name"
            >
              <Edit2 size={14} className="text-gray-400" />
            </button>
          )}
        </div>
      )}

      <div
        className="grid grid-cols-2 gap-x-3 gap-y-0.5 pt-1 border-t border-yellow-400/30 text-[11px] sm:text-xs"
        aria-busy={loading}
      >
        <div
          data-testid="match-header-innings-1-label"
          className="text-orange-400 font-semibold uppercase tracking-wide"
        >
          Innings 1
        </div>
        <div className="text-orange-400 font-semibold uppercase tracking-wide">Innings 2</div>
        <div className="text-white tabular-nums">
          {loading ? (
            <span className="text-gray-500">…</span>
          ) : (
            <>
              <span className="font-bold">
                {inn1.runs}/{inn1.wickets}
              </span>
              <span className="text-gray-400"> · {inn1.overs} ov</span>
            </>
          )}
        </div>
        <div className="text-white tabular-nums">
          {loading ? (
            <span className="text-gray-500">…</span>
          ) : (
            <>
              <span className="font-bold">
                {inn2.runs}/{inn2.wickets}
              </span>
              <span className="text-gray-400"> · {inn2.overs} ov</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
