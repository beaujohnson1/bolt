import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, type User as AppUser } from '../lib/supabase';

interface AuthContextType {
  user: AppUser | null;
  authUser: User | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (supabaseUser: User): Promise<AppUser | null> => {
    try {
      console.log('🔍 Fetching user profile for:', supabaseUser.id);
      console.log('📋 User metadata:', supabaseUser.user_metadata);
      console.log('📧 User email:', supabaseUser.email);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 User profile not found, creating new profile...');
          
          // Extract name from user metadata or email
          const userName = 
            supabaseUser.user_metadata?.full_name || 
            supabaseUser.user_metadata?.name || 
            supabaseUser.email?.split('@')[0] || 
            'User';

          console.log('📝 Creating user profile with name:', userName);
          console.log('🆔 User ID:', supabaseUser.id);
          console.log('📧 User email:', supabaseUser.email);
          console.log('🖼️ Avatar URL:', supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture);

          const { data: newUser, error: upsertError } = await supabase
            .from('users')
            .upsert([
              {
                id: supabaseUser.id,
                email: supabaseUser.email || '',
                name: userName,
                avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
                subscription_plan: 'free',
                subscription_status: 'active',
                listings_used: 0,
                listings_limit: 5,
                monthly_revenue: 0,
                total_sales: 0,
                notification_preferences: { email: true, push: true },
                timezone: 'America/New_York',
                is_active: true
              }
            ], {
              onConflict: 'id'
            })
            .select()
            .single();

          if (upsertError) {
            console.error('❌ Error upserting user profile:', upsertError);
            console.error('❌ Error details:', {
              code: upsertError.code,
              message: upsertError.message,
              details: upsertError.details,
              hint: upsertError.hint
            });
            console.error('❌ Data being inserted:', {
              id: supabaseUser.id,
              email: supabaseUser.email,
              name: userName,
              avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null
            });
            return null;
          }

          console.log('✅ User profile upserted successfully:', newUser);
          return newUser;
        } else {
          console.error('❌ Error fetching user profile:', error);
          console.error('❌ Fetch error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          return null;
        }
      }

      console.log('✅ User profile fetched successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Unexpected error in fetchUserProfile:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      console.error('❌ User data that caused error:', {
        id: supabaseUser.id,
        email: supabaseUser.email,
        metadata: supabaseUser.user_metadata
      });
      return null;
    }
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!authUser) {
      throw new Error('No authenticated user');
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)
        .select()
        .single();

      if (error) throw error;

      setUser(data);
      console.log('✅ User profile updated successfully:', data);
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
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
              setAuthUser(refreshData.session.user);
              const profile = await fetchUserProfile(refreshData.session.user);
              setUser(profile);
            }
          }
          setLoading(false);
          return;
        }

        if (session) {
          console.log('📱 Initial session found:', session.user.email);
          setAuthUser(session.user);
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
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
          setAuthUser(session.user);
          const profile = await fetchUserProfile(session.user);
          setUser(profile);
        } else {
          setUser(null);
          setAuthUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('📝 Attempting to sign up:', email);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            name: name
          },
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

  const signInWithGoogle = async () => {
    try {
      console.log('🔑 Attempting to sign in with Google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('❌ Google sign in error:', error);
      } else {
        console.log('✅ Google sign in initiated');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ Unexpected Google sign in error:', error);
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