
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { APP_PASSWORD, LOCAL_STORAGE_KEYS } from '../constants';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH);
      if (storedAuth) {
        const authData = JSON.parse(storedAuth);
        if (authData.isAuthenticated && authData.expiry > Date.now()) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH); // Clean up expired or invalid auth
        }
      }
    } catch (error) {
      console.error("Error reading auth state from localStorage:", error);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH);
    }
    setIsLoading(false);
  }, []);

  const login = (password: string): boolean => {
    if (password === APP_PASSWORD) {
      const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH, JSON.stringify({ isAuthenticated: true, expiry }));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
    