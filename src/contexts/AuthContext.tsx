import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, type User as AppUser } from '../lib/supabase';
import { withTimeout, withRetry } from '../utils/promiseUtils';

// Timeout constants
const PROFILE_FETCH_TIMEOUT = 60000; // 60 seconds
const PROFILE_CREATE_TIMEOUT = 60000; // 60 seconds
const SESSION_TIMEOUT = 60000; // 60 seconds

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
  if (!context) {
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
      console.log('🔍 [AUTH] Starting fetchUserProfile for user:', supabaseUser.id);
      console.log('📋 [AUTH] User metadata:', JSON.stringify(supabaseUser.user_metadata, null, 2));
      console.log('📧 [AUTH] User email:', supabaseUser.email);
      console.log('🔐 [AUTH] User role:', supabaseUser.role);
      console.log('⏰ [AUTH] User created at:', supabaseUser.created_at);
      
      // Extract name from user metadata or email
      const userName = 
        supabaseUser.user_metadata?.full_name || 
        supabaseUser.user_metadata?.name || 
        supabaseUser.email?.split('@')[0] || 
        'User';

      console.log('📝 [AUTH] Preparing user profile data with name:', userName);
      console.log('🆔 [AUTH] User ID:', supabaseUser.id);
      console.log('📧 [AUTH] User email:', supabaseUser.email);
      console.log('🖼️ [AUTH] Avatar URL:', supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture);

      const userData = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: userName,
        avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
        subscription_plan: 'free',
        subscription_status: 'active',
        listings_used: 0,
        listings_limit: 999,
        monthly_revenue: 0,
        total_sales: 0,
        notification_preferences: { email: true, push: true },
        timezone: 'America/New_York',
        is_active: true,
        updated_at: new Date().toISOString()
      };

      console.log('📤 [AUTH] Directly upserting user profile (bypassing select)...');
      console.log('📊 [AUTH] User data to upsert:', JSON.stringify(userData, null, 2));

      const { data: upsertedUser, error: upsertError } = await withTimeout(
        supabase
          .from('users')
          .upsert([userData], {
            onConflict: 'id'
          })
          .select()
          .single(),
        PROFILE_CREATE_TIMEOUT,
        'Database upsert operation timed out while creating/updating user profile'
      );

      console.log('📥 [AUTH] Upsert result:', { upsertedUser, upsertError });

      if (upsertError) {
        console.error('❌ [AUTH] Error upserting user profile:', upsertError);
        console.error('❌ [AUTH] Error details:', {
          code: upsertError.code,
          message: upsertError.message,
          details: upsertError.details,
          hint: upsertError.hint
        });
        console.error('❌ [AUTH] Data that failed to upsert:', JSON.stringify(userData, null, 2));
        return null;
      }

      console.log('✅ [AUTH] User profile upserted successfully:', upsertedUser);
      console.log('🔧 [AUTH] Profile data includes listing limit:', upsertedUser.listings_limit);
      
      return upsertedUser;
    } catch (error) {
      console.error('❌ [AUTH] Unexpected error in fetchUserProfile:', error);
      console.error('❌ [AUTH] Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      console.error('❌ [AUTH] User data that caused error:', {
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
      const { data, error } = await withTimeout(
        supabase
          .from('users')
          .update({
            ...updates,
            updated_at: new Date().toISOString()
          })
          .eq('id', authUser.id)
          .select()
          .single(),
        PROFILE_FETCH_TIMEOUT,
        'User profile update timed out'
      );

      if (error) throw error;

      setUser(data);
      console.log('✅ [AUTH] User profile updated successfully:', data);
    } catch (error) {
      console.error('❌ [AUTH] Error updating user profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log('🔄 [AUTH] Auth effect triggered - setting up authentication listeners');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 [AUTH] Getting initial session...');
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          3, // maxRetries
          'Session fetch timed out'
        );
        
        console.log('📊 [AUTH] Initial session result:', { session: session ? 'exists' : 'null', error });
        
        if (error) {
          console.error('❌ [AUTH] Error getting initial session:', error);
          if (error.message.includes('session_not_found') || error.message.includes('JWT')) {
            console.log('🔄 [AUTH] Attempting to refresh session...');
            const { data: refreshData, error: refreshError } = await withTimeout(
              supabase.auth.refreshSession(),
              SESSION_TIMEOUT,
              'Session refresh timed out'
            );
            
            if (refreshError) {
              console.error('❌ [AUTH] Session refresh failed:', refreshError);
              setUser(null);
              setAuthUser(null);
              return;
            }
            
            if (refreshData.session) {
              console.log('✅ [AUTH] Session refreshed successfully');
              setAuthUser(refreshData.session.user);
              const profile = await fetchUserProfile(refreshData.session.user);
              setUser(profile);
            }
          }
          return;
        }

        if (session) {
          console.log('📱 [AUTH] Initial session found for user:', session.user.email);
          setAuthUser(session.user);
          console.log('🔄 [AUTH] Fetching user profile for initial session...');
          const profile = await withRetry(
            () => withTimeout(
              fetchUserProfile(session.user),
              PROFILE_FETCH_TIMEOUT,
              'User profile fetch timed out during auth state change'
            ),
            3, // maxRetries
            2000 // baseDelay
              'User profile fetch timed out during initial session'
            ),
            3, // maxRetries
            2000 // baseDelay
          );
          console.log('📊 [AUTH] Profile fetch result for initial session:', profile ? 'success' : 'failed');
          console.log('📊 [AUTH] Initial profile data:', {
            listings_used: profile?.listings_used,
            listings_limit: profile?.listings_limit,
            user_id: profile?.id
          });
          setUser(profile);
        } else {
          console.log('ℹ️ [AUTH] No initial session found');
        }
      } catch (error) {
        console.error('❌ [AUTH] Unexpected error getting initial session:', error);
      } finally {
        // Always set loading to false, regardless of success or failure
        console.log('🏁 [AUTH] Initial session check complete, setting loading to false');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    console.log('👂 [AUTH] Setting up auth state change listener...');
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 [AUTH] Auth state change detected:', {
          event,
          userEmail: session?.user?.email || 'no user',
          sessionExists: !!session,
          userId: session?.user?.id || 'no id'
        });
        
        try {
          if (session) {
            console.log('✅ [AUTH] Session exists, setting authUser and fetching profile...');
            setAuthUser(session.user);
            console.log('🔄 [AUTH] Fetching user profile for auth state change...');
            const profile = await withTimeout(
              fetchUserProfile(session.user),
              PROFILE_FETCH_TIMEOUT,
              'User profile fetch timed out during auth state change'
            );
            console.log('📊 [AUTH] Profile fetch result for auth state change:', profile ? 'success' : 'failed');
            console.log('📊 [AUTH] Auth state change profile data:', {
              listings_used: profile?.listings_used,
              listings_limit: profile?.listings_limit,
              user_id: profile?.id
            });
            setUser(profile);
          } else {
            console.log('❌ [AUTH] No session, clearing user state...');
            setUser(null);
            setAuthUser(null);
          }
        } catch (error) {
          console.error('❌ [AUTH] Error in auth state change handler:', error);
          // Don't clear user state on timeout - they might still be valid
          if (!error.message.includes('timed out')) {
            setUser(null);
            setAuthUser(null);
          }
        } finally {
          console.log('🏁 [AUTH] Auth state change processing complete, setting loading to false');
          setLoading(false);
        }
      }
    );

    console.log('✅ [AUTH] Auth listeners set up successfully');

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name: string) => {
    try {
      console.log('📝 [AUTH] Attempting to sign up:', email);
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
        console.error('❌ [AUTH] Sign up error:', error);
      } else {
        console.log('✅ [AUTH] Sign up successful');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ [AUTH] Unexpected sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 [AUTH] Attempting to sign in:', email);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('❌ [AUTH] Sign in error:', error);
      } else {
        console.log('✅ [AUTH] Sign in successful');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ [AUTH] Unexpected sign in error:', error);
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log('🔑 [AUTH] Attempting to sign in with Google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) {
        console.error('❌ [AUTH] Google sign in error:', error);
      } else {
        console.log('✅ [AUTH] Google sign in initiated');
      }
      
      return { error };
    } catch (error) {
      console.error('❌ [AUTH] Unexpected Google sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('👋 [AUTH] Signing out...');
      await supabase.auth.signOut();
      setUser(null);
      setAuthUser(null);
      console.log('✅ [AUTH] Sign out successful');
    } catch (error) {
      console.error('❌ [AUTH] Sign out error:', error);
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