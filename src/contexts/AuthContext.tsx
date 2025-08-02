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
      setAuthUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.email);
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If user doesn't exist in our users table, create them
        if (error.code === 'PGRST116') {
          const authUser = await supabase.auth.getUser();
          if (authUser.data.user) {
            const { error: insertError } = await supabase
              .from('users')
              .insert([
                {
                  id: authUser.data.user.id,
                  email: authUser.data.user.email!,
                  name: authUser.data.user.user_metadata?.full_name || authUser.data.user.email!.split('@')[0],
                  subscription_plan: 'free',
                  subscription_status: 'active',
                  listings_used: 0,
                  listings_limit: 5,
                  monthly_revenue: 0,
                  total_sales: 0,
                },
              ]);
            
            if (!insertError) {
              // Fetch the newly created user
              const { data: newUser } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.data.user.id)
                .single();
              
              if (newUser) {
                setUser(newUser);
              }
            }
          }
        } else {
          console.error('Error fetching user profile:', error);
        }
      }

      if (data) {
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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