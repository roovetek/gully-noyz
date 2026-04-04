import { useState } from 'react';
import { useMatch } from '../context/MatchContext';
import { Plus, LogIn, List } from 'lucide-react';
import { MatchList } from './MatchList';
import { CreateMatchModal } from './CreateMatchModal';
import { SecretPrompt } from './SecretPrompt';
import { supabase } from '../lib/supabase';

export function MatchSelector() {
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
      sessionStorage.setItem(`match_secret_${matchId}`, matchSecret);
    }
  };

  const handleJoinMatch = async () => {
    if (!joinId.trim()) {
      setError('Please enter a Match ID');
      return;
    }

    setError('');

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('match_id, name, is_public')
        .eq('match_id', joinId.trim().toUpperCase())
        .maybeSingle();

      if (matchError) throw matchError;

      if (!match) {
        setError('Match not found');
        return;
      }

      if (!match.is_public) {
        const storedSecret = sessionStorage.getItem(`match_secret_${match.match_id}`);
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

        if (!matchData || matchData.secret_hash !== btoa(storedSecret)) {
          setPendingMatch({ id: match.match_id, name: match.name });
          setShowSecretPrompt(true);
          return;
        }
      }

      setMatchId(match.match_id);
      setMatchName(match.name);
    } catch (err) {
      console.error('Error joining match:', err);
      setError('Failed to join match');
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

      if (!match) {
        setError('Match not found');
        setShowSecretPrompt(false);
        return;
      }

      const secretHash = btoa(secret);
      if (match.secret_hash === secretHash) {
        sessionStorage.setItem(`match_secret_${pendingMatch.id}`, secret);
        setMatchId(pendingMatch.id);
        setMatchName(pendingMatch.name);
        setShowSecretPrompt(false);
        setPendingMatch(null);
        return { success: true };
      } else {
        return { success: false, error: 'Incorrect secret' };
      }
    } catch (err) {
      console.error('Error verifying secret:', err);
      return { success: false, error: 'Failed to verify secret' };
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
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-yellow-400 mb-2">GullyStream</h1>
          <p className="text-green-400 text-lg">Start streaming your match</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleCreateMatch}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors"
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
              className="w-full bg-green-500 hover:bg-green-600 text-black font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors"
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
            className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 px-6 rounded-lg flex items-center justify-center gap-3 transition-colors border border-gray-700"
          >
            <List size={24} />
            <span className="text-lg">Browse All Matches</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
