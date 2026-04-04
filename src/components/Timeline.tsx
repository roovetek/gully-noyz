import { useMatch } from '../context/MatchContext';
import { MatchTimeline } from './MatchTimeline';
import { Home, CreditCard as Edit2, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Timeline() {
  const { matchId, matchName, setMatchId, setMatchName } = useMatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(matchName);

  useEffect(() => {
    if (matchId && !matchName) {
      fetchMatchName();
    }
  }, [matchId]);

  const fetchMatchName = async () => {
    const { data } = await supabase
      .from('matches')
      .select('name')
      .eq('match_id', matchId)
      .maybeSingle();

    if (data?.name) {
      setMatchName(data.name);
      setEditedName(data.name);
    }
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ name: editedName.trim() })
        .eq('match_id', matchId);

      if (!error) {
        setMatchName(editedName.trim());
        setIsEditing(false);
      }
    } catch (err) {
      console.error('Error updating match name:', err);
    }
  };

  const handleHome = () => {
    setMatchId(null);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      <div className="p-4 mb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={handleHome}
            className="bg-gray-900 p-2 rounded-lg border border-green-400 hover:bg-green-400/20 transition-colors"
          >
            <Home size={24} className="text-green-400" />
          </button>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg border border-yellow-400">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm w-32"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="p-1 bg-green-500 hover:bg-green-600 rounded"
                >
                  <Check size={16} className="text-black" />
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedName(matchName);
                  }}
                  className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>
            ) : (
              <div className="bg-gray-900 px-4 py-2 rounded-lg border border-yellow-400 flex items-center gap-2">
                <div>
                  {matchName && (
                    <div className="text-white font-bold text-sm">{matchName}</div>
                  )}
                  <div className="text-xs">
                    <span className="text-gray-400">ID: </span>
                    <span className="text-yellow-400 font-mono font-bold">{matchId}</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <Edit2 size={14} className="text-gray-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <MatchTimeline />
    </div>
  );
}
