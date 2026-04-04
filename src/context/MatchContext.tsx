import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MatchContextType {
  matchId: string | null;
  setMatchId: (id: string | null) => void;
  generateMatchId: () => string;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [matchId, setMatchIdState] = useState<string | null>(() => {
    return sessionStorage.getItem('current_match_id');
  });

  const setMatchId = (id: string | null) => {
    setMatchIdState(id);
    if (id) {
      sessionStorage.setItem('current_match_id', id);
    } else {
      sessionStorage.removeItem('current_match_id');
    }
  };

  const generateMatchId = () => {
    const id = Math.floor(100000 + Math.random() * 900000).toString();
    return id;
  };

  return (
    <MatchContext.Provider value={{ matchId, setMatchId, generateMatchId }}>
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
