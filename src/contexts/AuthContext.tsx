import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  isPro: boolean;
  listingsUsed: number;
  listingsLimit: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('homeSaleHelper_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // TODO: Implement actual authentication with Supabase
      // For now, simulate successful login
      const mockUser: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        isPro: false,
        listingsUsed: 0,
        listingsLimit: 5
      };
      
      setUser(mockUser);
      localStorage.setItem('homeSaleHelper_user', JSON.stringify(mockUser));
    } catch (error) {
      throw new Error('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      // TODO: Implement actual authentication with Supabase
      const mockUser: User = {
        id: '1',
        email,
        name,
        isPro: false,
        listingsUsed: 0,
        listingsLimit: 5
      };
      
      setUser(mockUser);
      localStorage.setItem('homeSaleHelper_user', JSON.stringify(mockUser));
    } catch (error) {
      throw new Error('Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      // TODO: Implement Google OAuth with Supabase
      const mockUser: User = {
        id: '1',
        email: 'user@gmail.com',
        name: 'Google User',
        isPro: false,
        listingsUsed: 0,
        listingsLimit: 5
      };
      
      setUser(mockUser);
      localStorage.setItem('homeSaleHelper_user', JSON.stringify(mockUser));
    } catch (error) {
      throw new Error('Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('homeSaleHelper_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('homeSaleHelper_user', JSON.stringify(updatedUser));
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;