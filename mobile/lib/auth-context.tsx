import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    (async () => {
      try {
        const savedUser = await AsyncStorage.getItem('party-hub-user');
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const saveUser = useCallback(async (u: User) => {
    setUser(u);
    await AsyncStorage.setItem('party-hub-user', JSON.stringify(u));
  }, []);

  const sendCode = useCallback(async (phone: string): Promise<boolean> => {
    console.log(`[Mock SMS] Code 1234 sent to ${phone}`);
    await AsyncStorage.setItem('party-hub-sms-code', '1234');
    await AsyncStorage.setItem('party-hub-sms-phone', phone);
    return true;
  }, []);

  const verifyCode = useCallback(async (phone: string, code: string): Promise<boolean> => {
    const savedCode = await AsyncStorage.getItem('party-hub-sms-code');
    const savedPhone = await AsyncStorage.getItem('party-hub-sms-phone');

    if (code === savedCode && phone === savedPhone) {
      const existingData = await AsyncStorage.getItem(`party-hub-user-${phone}`);
      let userData: User;

      if (existingData) {
        userData = JSON.parse(existingData);
      } else {
        userData = {
          id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          phone,
          nickname: '',
          stats: { gamesPlayed: 0, gamesWon: 0, totalScore: 0 },
          gameHistory: [],
        };
        await AsyncStorage.setItem(`party-hub-user-${phone}`, JSON.stringify(userData));
      }

      await saveUser(userData);
      return true;
    }
    return false;
  }, [saveUser]);

  const updateNickname = useCallback(async (nickname: string) => {
    if (user) {
      const updated = { ...user, nickname };
      await saveUser(updated);
      if (user.phone) {
        await AsyncStorage.setItem(`party-hub-user-${user.phone}`, JSON.stringify(updated));
      }
    }
  }, [user, saveUser]);

  const logout = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem('party-hub-user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, sendCode, verifyCode, updateNickname, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
