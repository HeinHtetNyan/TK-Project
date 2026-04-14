import { useState, createContext, useMemo, useCallback } from 'react';
import { authService } from '../services/api';

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [loading] = useState(false);

  const login = async (username, password) => {
    const userData = await authService.login(username, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const isAdmin = useCallback(() => user?.role === 'ADMIN', [user]);

  const value = useMemo(() => ({ user, loading, login, logout, isAdmin }), [user, loading, isAdmin]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
