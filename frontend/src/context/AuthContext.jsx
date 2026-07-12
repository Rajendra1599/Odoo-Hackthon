import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, ApiError } from '../lib/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'transitops_token';
const USER_KEY = 'transitops_user';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    // Token/user are read synchronously above; nothing async to resolve on boot.
    setInitializing(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Unable to reach the server. Please try again.' };
    }
  }, []);

  const register = useCallback(async (name, email, password, role) => {
    try {
      const data = await api.post('/auth/register', { name, email, password, role });
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      if (err instanceof ApiError) {
        return { success: false, error: err.message, field: err.field };
      }
      return { success: false, error: 'Unable to reach the server. Please try again.' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const hasRole = useCallback(
    (...roles) => !!user && roles.includes(user.role),
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, token, initializing, login, register, logout, hasRole }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
