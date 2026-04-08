import { createContext, useContext, useState, ReactNode } from 'react';
import { SecureStorage } from '../lib/security';
import { STORAGE_KEYS } from '../lib/constants';
import { generateMatchId } from '../lib/match';
import { UserRole } from '../lib/types';

interface MatchContextType {
  matchId: string | null;
  matchName: string;
  userRole: UserRole;
  setMatchId: (id: string | null) => void;
  setMatchName: (name: string) => void;
  setUserRole: (role: UserRole) => void;
  generateMatchId: () => string;
  getMatchId: () => string;
  getMatchName: () => string;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: ReactNode }) {
  const [matchId, setMatchIdState] = useState<string | null>(() => {
    return SecureStorage.getItem(STORAGE_KEYS.MATCH_ID);
  });

  const [matchName, setMatchNameState] = useState<string>(() => {
    return SecureStorage.getItem(STORAGE_KEYS.MATCH_NAME) || '';
  });

  const [userRole, setUserRoleState] = useState<UserRole>(null);

  const setMatchId = (id: string | null) => {
    setMatchIdState(id);
    if (id) {
      SecureStorage.setItem(STORAGE_KEYS.MATCH_ID, id);
    } else {
      SecureStorage.removeItem(STORAGE_KEYS.MATCH_ID);
      SecureStorage.removeItem(STORAGE_KEYS.MATCH_NAME);
      setUserRoleState(null);
    }
  };

  const setMatchName = (name: string) => {
    setMatchNameState(name);
    SecureStorage.setItem(STORAGE_KEYS.MATCH_NAME, name);
  };

  const setUserRole = (role: UserRole) => {
    setUserRoleState(role);
  };

  const getMatchId = () => {
    return matchId || '';
  };

  const getMatchName = () => {
    return matchName;
  };

  return (
    <MatchContext.Provider value={{ matchId, matchName, userRole, setMatchId, setMatchName, setUserRole, generateMatchId, getMatchId, getMatchName }}>
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
