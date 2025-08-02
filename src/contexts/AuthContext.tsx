import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, type User as SupabaseUser } from '../lib/supabase';
import type { User as AuthUser } from '@supabase/supabase-js';

interface AuthContextType {
  user: SupabaseUser | null;
  authUser: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<SupabaseUser>) => void;
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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email);
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

  }, []);
  const fetchUserProfile = async (userId: string) => {
    try {
      // Try to fetch user profile from database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // Check if it's a session/auth error
        if (error.message?.includes('session_not_found') || error.code === 'PGRST301') {
          console.log('Session invalid, signing out...');
          await signOut();
          return;
        }
        
        // If user doesn't exist in database, create a profile
        if (error.code === 'PGRST116') {
          const { data: authUser } = await supabase.auth.getUser();
          if (authUser.user) {
            const newUser: Omit<SupabaseUser, 'id'> = {
              email: authUser.user.email!,
              name: authUser.user.user_metadata?.full_name || authUser.user.email!.split('@')[0],
              avatar_url: authUser.user.user_metadata?.avatar_url,
              subscription_plan: 'free',
              subscription_status: 'active',
              listings_used: 0,
              listings_limit: 5,
              monthly_revenue: 0,
              total_sales: 0,
              created_at: new Date().toISOString(),
            };

            const { data: createdUser, error: createError } = await supabase
              .from('users')
              .insert([{ id: authUser.user.id, ...newUser }])
              .select()
              .single();

            if (createError) {
              console.error('Error creating user profile:', createError);
              await signOut();
              return;
            }

            setUser(createdUser);
          }
        } else {
          console.error('Error fetching user profile:', error);
          await signOut();
          return;
        }
      } else {
        setUser(userProfile);
      }
    } catch (error) {
      console.error('Unexpected error in fetchUserProfile:', error);
      // If there's any unexpected error, sign out to clear invalid session
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Create user profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email: data.user.email!,
              name,
              subscription_plan: 'free',
              subscription_status: 'active',
              listings_used: 0,
              listings_limit: 5,
              monthly_revenue: 0,
              total_sales: 0,
            },
          ]);

        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
      }
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/app`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const updateUser = async (updates: Partial<SupabaseUser>) => {
    if (user && authUser) {
      try {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', authUser.id);

        if (error) throw error;

        // Update local state
        setUser({ ...user, ...updates });
      } catch (error) {
        console.error('Error updating user:', error);
        throw error;
      }
    }
  };

  const value = {
    user,
    authUser,
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