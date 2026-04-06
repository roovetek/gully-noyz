import { useMatch } from '../context/MatchContext';
import { VideoCapture } from './VideoCapture';
import { Home, CreditCard as Edit2, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Record() {
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
    <div className="relative bg-black text-white h-full min-h-[calc(100vh-10rem)]">
      <div className="absolute top-2 left-4 right-4 z-20 flex items-center justify-between gap-2">
        <button
          onClick={handleHome}
          className="bg-black/70 backdrop-blur p-2 rounded-lg border border-green-400 hover:bg-green-400/20 transition-colors flex-shrink-0"
        >
          <Home size={24} className="text-green-400" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2 bg-black/70 backdrop-blur px-3 py-2 rounded-lg border border-yellow-400">
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
            <div className="bg-black/70 backdrop-blur px-4 py-2 rounded-lg border border-yellow-400 flex items-center gap-2 min-w-0">
              <div className="min-w-0">
                {matchName && (
                  <div className="text-white font-bold text-sm truncate max-w-[180px]">{matchName}</div>
                )}
                <div className="text-xs">
                  <span className="text-gray-400">ID: </span>
                  <span className="text-yellow-400 font-mono font-bold">{matchId}</span>
                </div>
              </div>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-700 rounded flex-shrink-0"
              >
                <Edit2 size={14} className="text-gray-400" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="h-full pt-2">
        <VideoCapture />
      </div>
    </div>
  );
}
