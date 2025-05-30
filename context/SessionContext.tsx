import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type Session = {
  token: string;
  user_id: string;
  name: string;
};

type SessionContextType = {
  session: Session | null;
  setSession: (data: Session) => void;
  clearSession: () => void;
  isLoaded: boolean;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSessionState] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const STORAGE_KEY = 'user-session';

  const setSession = async (data: Session) => {
    setSessionState(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  const clearSession = async () => {
    setSessionState(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const loadSession = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSessionState(parsed);
      }
    } catch (e) {
      console.warn('Failed to restore session', e);
    } finally {
      setIsLoaded(true);
    }
  };

  useEffect(() => {
    loadSession();
  }, []);

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession, isLoaded }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = (): SessionContextType => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
};
