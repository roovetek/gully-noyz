import { createContext, useContext, useState, ReactNode } from 'react';
import { SecureStorage } from '../lib/security';
import { STORAGE_KEYS } from '../lib/constants';
import { generateMatchId } from '../lib/match';

interface MatchContextType {
  matchId: string | null;
  matchName: string;
  setMatchId: (id: string | null) => void;
  setMatchName: (name: string) => void;
  generateMatchId: () => string;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [matchId, setMatchIdState] = useState<string | null>(() => {
    return SecureStorage.getItem(STORAGE_KEYS.MATCH_ID);
  });

  const [matchName, setMatchNameState] = useState<string>(() => {
    return SecureStorage.getItem(STORAGE_KEYS.MATCH_NAME) || '';
  });

  const setMatchId = (id: string | null) => {
    setMatchIdState(id);
    if (id) {
      SecureStorage.setItem(STORAGE_KEYS.MATCH_ID, id);
    } else {
      SecureStorage.removeItem(STORAGE_KEYS.MATCH_ID);
      SecureStorage.removeItem(STORAGE_KEYS.MATCH_NAME);
    }
  };

  const setMatchName = (name: string) => {
    setMatchNameState(name);
    SecureStorage.setItem(STORAGE_KEYS.MATCH_NAME, name);
  };

  return (
    <MatchContext.Provider value={{ matchId, matchName, setMatchId, setMatchName, generateMatchId }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatch() {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatch must be used within a MatchProvider');
  }
  return context;
}
