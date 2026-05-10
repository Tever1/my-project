'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string;
  stats: {
    gamesPlayed: number;
    gamesWon: number;
    totalScore: number;
  };
  gameHistory: {
    gameType: string;
    date: number;
    score: number;
    won: boolean;
    players: number;
  }[];
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sendCode: (phone: string) => Promise<boolean>;
  verifyCode: (phone: string, code: string) => Promise<boolean>;
  updateNickname: (nickname: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  sendCode: async () => false,
  verifyCode: async () => false,
  updateNickname: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('party-hub-user');
    queueMicrotask(() => {
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {}
      }
      setIsLoading(false);
    });
  }, []);

  const saveUser = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem('party-hub-user', JSON.stringify(u));
  }, []);

  const sendCode = useCallback(async (phone: string): Promise<boolean> => {
    // In production, this would call an SMS API (e.g., Twilio, SMS.ru)
    // For MVP, we simulate sending a code
    console.log(`[Mock SMS] Code 1234 sent to ${phone}`);
    localStorage.setItem('party-hub-sms-code', '1234');
    localStorage.setItem('party-hub-sms-phone', phone);
    return true;
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string): Promise<boolean> => {
    // In production, verify against server
    const savedCode = localStorage.getItem('party-hub-sms-code');
    const savedPhone = localStorage.getItem('party-hub-sms-phone');

    if (code === savedCode && phone === savedPhone) {
      const existingData = localStorage.getItem(`party-hub-user-${phone}`);
      let userData: User;

      if (existingData) {
        const existing = JSON.parse(existingData) as User;
        userData = { ...existing, nickname: '' };
      } else {
        userData = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          phone,
          nickname: '',
          stats: { gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
          gameHistory: [],
        };
        localStorage.setItem(`party-hub-user-${phone}`, JSON.stringify(userData));
      }

      saveUser(userData);
      return true;
    }
    return false;
  }, [saveUser]);

  const updateNickname = useCallback((nickname: string) => {
    if (user) {
      const updated = { ...user, nickname };
      saveUser(updated);
      if (user.phone) {
        localStorage.setItem(`party-hub-user-${user.phone}`, JSON.stringify(updated));
      }
    }
  }, [user, saveUser]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('party-hub-user');
    localStorage.removeItem('party-hub-sms-code');
    localStorage.removeItem('party-hub-sms-phone');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, sendCode, verifyCode, updateNickname, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
