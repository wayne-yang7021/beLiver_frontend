import { createContext, ReactNode, useContext, useState } from 'react';

type Session = {
  token: string;
  user_id: string;
  name: string;
};

type SessionContextType = {
  session: Session | null;
  setSession: (data: Session) => void;
  clearSession: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSessionState] = useState<Session | null>(null);

  const setSession = (data: Session) => setSessionState(data);
  const clearSession = () => setSessionState(null);

  return (
    <SessionContext.Provider value={{ session, setSession, clearSession }}>
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
