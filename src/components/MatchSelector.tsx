import { useState } from 'react';
import { useMatch } from '../context/MatchContext';
import { Plus, LogIn, List } from 'lucide-react';
import { MatchList } from './MatchList';
import { CreateMatchModal } from './CreateMatchModal';
import { SecretPrompt } from './SecretPrompt';
import { supabase } from '../lib/supabase';
import { verifySecret, SecureStorage } from '../lib/security';
import { validateMatchId, normalizeMatchId } from '../lib/validation';
import { STORAGE_KEYS, ERROR_MESSAGES } from '../lib/constants';

interface MatchSelectorProps {
  onOpenGullyRulz?: () => void;
}

export function MatchSelector({ onOpenGullyRulz }: MatchSelectorProps) {
  const { setMatchId, setMatchName } = useMatch();
  const [joinId, setJoinId] = useState('');
  const [error, setError] = useState('');
  const [showMatchList, setShowMatchList] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSecretPrompt, setShowSecretPrompt] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<{ id: string; name: string } | null>(null);

  const handleCreateMatch = () => {
    setShowCreateModal(true);
    setError('');
  };

  const handleMatchCreated = (matchId: string, matchSecret?: string, name?: string) => {
    setShowCreateModal(false);
    setMatchId(matchId);
    if (name) {
      setMatchName(name);
    }
    if (matchSecret) {
      SecureStorage.setItem(`${STORAGE_KEYS.MATCH_SECRET_PREFIX}${matchId}`, matchSecret);
    }
  };

  const handleJoinMatch = async () => {
    const validation = validateMatchId(joinId);
    if (!validation.isValid) {
      setError(validation.error || ERROR_MESSAGES.MATCH_ID_REQUIRED);
      return;
    }

    setError('');

    try {
      const normalizedId = normalizeMatchId(joinId);
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('match_id, name, is_public')
        .eq('match_id', normalizedId)
        .maybeSingle();

      if (matchError) throw matchError;

      if (!match) {
        setError(ERROR_MESSAGES.MATCH_NOT_FOUND);
        return;
      }

      if (!match.is_public) {
        const storedSecret = SecureStorage.getItem(`${STORAGE_KEYS.MATCH_SECRET_PREFIX}${match.match_id}`);
        if (!storedSecret) {
          setPendingMatch({ id: match.match_id, name: match.name });
          setShowSecretPrompt(true);
          return;
        }

        const { data: matchData } = await supabase
          .from('matches')
          .select('secret_hash')
          .eq('match_id', match.match_id)
          .maybeSingle();

        if (!matchData || !matchData.secret_hash) {
          setPendingMatch({ id: match.match_id, name: match.name });
          setShowSecretPrompt(true);
          return;
        }

        const isValid = await verifySecret(storedSecret, matchData.secret_hash);
        if (!isValid) {
          setPendingMatch({ id: match.match_id, name: match.name });
          setShowSecretPrompt(true);
          return;
        }
      }

      setMatchId(match.match_id);
      setMatchName(match.name);
    } catch (err) {
      setError(ERROR_MESSAGES.FAILED_TO_JOIN);
    }
  };

  const handleSecretVerify = async (secret: string) => {
    if (!pendingMatch) return;

    try {
      const { data: match } = await supabase
        .from('matches')
        .select('secret_hash')
        .eq('match_id', pendingMatch.id)
        .maybeSingle();

      if (!match || !match.secret_hash) {
        setError(ERROR_MESSAGES.MATCH_NOT_FOUND);
        setShowSecretPrompt(false);
        return;
      }

      const isValid = await verifySecret(secret, match.secret_hash);
      if (isValid) {
        SecureStorage.setItem(`${STORAGE_KEYS.MATCH_SECRET_PREFIX}${pendingMatch.id}`, secret);
        setMatchId(pendingMatch.id);
        setMatchName(pendingMatch.name);
        setShowSecretPrompt(false);
        setPendingMatch(null);
        return { success: true };
      } else {
        return { success: false, error: ERROR_MESSAGES.INCORRECT_SECRET };
      }
    } catch (err) {
      return { success: false, error: ERROR_MESSAGES.FAILED_TO_JOIN };
    }
  };

  if (showMatchList) {
    return <MatchList onBack={() => setShowMatchList(false)} />;
  }

  return (
    <>
      {showCreateModal && (
        <CreateMatchModal
          onClose={() => setShowCreateModal(false)}
          onMatchCreated={handleMatchCreated}
        />
      )}

      {showSecretPrompt && pendingMatch && (
        <SecretPrompt
          matchId={pendingMatch.id}
          matchName={pendingMatch.name}
          onVerify={handleSecretVerify}
          onCancel={() => {
            setShowSecretPrompt(false);
            setPendingMatch(null);
          }}
        />
      )}
    <div className="min-h-[calc(100vh-4rem)] bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="mb-2 text-5xl font-bold tracking-tight text-[#d97757] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
            GullyStream
          </h1>
          <p className="text-lg text-stone-100">Start streaming your match</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleCreateMatch}
            className="w-full bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors border border-yellow-400"
          >
            <Plus size={24} />
            <span className="text-lg">Create Match</span>
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-500">OR</span>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="Enter Match ID"
              value={joinId}
              onChange={(e) => {
                setJoinId(e.target.value);
                setError('');
              }}
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-500 py-3 px-4 rounded-lg focus:outline-none focus:border-green-400 text-center text-2xl tracking-wider uppercase"
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              onClick={handleJoinMatch}
              className="w-full bg-green-500/20 hover:bg-green-500/30 text-green-400 font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors border border-green-400"
            >
              <LogIn size={24} />
              <span className="text-lg">Join Match</span>
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-black text-gray-500">OR</span>
            </div>
          </div>

          <button
            onClick={() => setShowMatchList(true)}
            className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors border border-orange-400"
          >
            <List size={24} />
            <span className="text-lg">Browse All Matches</span>
          </button>

          {onOpenGullyRulz && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onOpenGullyRulz}
                className="text-sm text-gray-500 hover:text-gray-300 underline"
              >
                Gully Rulz (rules and info)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
