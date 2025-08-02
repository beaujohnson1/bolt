import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  authUser: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      console.log('🔍 Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 User profile not found, creating new profile...');
          
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([
              {
                id: userId,
                email: user?.email || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select()
            .single();

          if (createError) {
            console.error('❌ Error creating user profile:', createError);
            return null;
          }

          console.log('✅ User profile created successfully:', newUser);
          return newUser;
        } else {
          console.error('❌ Error fetching user profile:', error);
          return null;
        }
      }

      console.log('✅ User profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Unexpected error in fetchUserProfile:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔄 Auth effect triggered');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Error getting initial session:', error);
          if (error.message.includes('session_not_found') || error.message.includes('JWT')) {
            console.log('🔄 Attempting to refresh session...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ Session refresh failed:', refreshError);
              setUser(null);
              setAuthUser(null);
              setLoading(false);
              return;
            }
            
            if (refreshData.session) {
              console.log('✅ Session refreshed successfully');
              setUser(refreshData.session.user);
              const profile = await fetchUserProfile(refreshData.session.user.id);
              setAuthUser(profile);
            }
          }
          setLoading(false);
          return;
        }

        if (session) {
          console.log('📱 Initial session found:', session.user.email);
          setUser(session.user);
          const profile = await fetchUserProfile(session.user.id);
          setAuthUser(profile);
        } else {
          console.log('ℹ️ No initial session found');
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Unexpected error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, session?.user?.email);
        
        if (session) {
          setUser(session.user);
          const profile = await fetchUserProfile(session.user.id);
          setAuthUser(profile);
        } else {
          setUser(null);
          setAuthUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      console.log('📝 Attempting to sign up:', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('❌ Sign up error:', error);
      } else {
        console.log('✅ Sign up successful');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ Unexpected sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting to sign in:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
      } else {
        console.log('✅ Sign in successful');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ Unexpected sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setAuthUser(null);
      console.log('✅ Sign out successful');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  const value = {
    user,
    authUser,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};