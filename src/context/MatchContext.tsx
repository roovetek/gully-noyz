import { createContext, useContext, useState, ReactNode } from 'react';

interface MatchContextType {
  matchId: string | null;
  setMatchId: (id: string | null) => void;
  generateMatchId: () => string;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [matchId, setMatchId] = useState<string | null>(null);

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
