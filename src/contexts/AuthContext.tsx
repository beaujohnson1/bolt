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
        setAuthUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    console.log('🔍 Fetching user profile for:', userId);
    setLoading(true);
    
    try {
      // Try to fetch user profile from database
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.log('❌ Error fetching user profile:', error.code, error.message);
        
        // Only sign out for actual auth errors, not temporary session issues
        if (error.code === 'PGRST301' && error.message?.includes('JWT')) {
          console.log('🔄 JWT expired, attempting to refresh session...');
          const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError || !session) {
            console.log('❌ Session refresh failed, signing out...');
            await signOut();
            return;
          }
          
          // Retry fetching profile with refreshed session
          return fetchUserProfile(userId);
        }
        
        // If user doesn't exist in database, create a profile
        if (error.code === 'PGRST116') {
          console.log('👤 User profile not found, creating new profile...');
          const { data: authUser } = await supabase.auth.getUser();
          
          if (!authUser.user) {
            console.log('❌ No authenticated user found');
            await signOut();
            return;
          }

          const newUser: Omit<SupabaseUser, 'id'> = {
            email: authUser.user.email!,
            name: authUser.user.user_metadata?.full_name || 
                  authUser.user.user_metadata?.name || 
                  authUser.user.email!.split('@')[0],
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
            console.error('❌ Error creating user profile:', createError);
            // Don't sign out immediately, might be a temporary issue
            setUser(null);
            setLoading(false);
            return;
          }

          console.log('✅ User profile created successfully');
          setUser(createdUser);
        } else {
          console.error('❌ Unexpected error fetching user profile:', error);
          // For other errors, don't sign out but set user to null
          setUser(null);
        }
      } else {
        console.log('✅ User profile found');
        setUser(userProfile);
      }
    } catch (error) {
      console.error('❌ Unexpected error in fetchUserProfile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
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
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name
          }
        }
      });

      if (error) throw error;

      // Don't create profile here - let the auth state change handler do it
      // This prevents race conditions
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        throw error;
      }
      
      // Clear local state
      setUser(null);
      setAuthUser(null);
    } catch (error) {
      console.error('Error in signOut:', error);
      // Even if signOut fails, clear local state
      setUser(null);
      setAuthUser(null);
    } finally {
      setLoading(false);
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