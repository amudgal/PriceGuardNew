import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);

  const value = useMemo(
    () => ({
      isAuthenticated,
      login: () => setAuthenticated(true),
      logout: () => setAuthenticated(false),
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
