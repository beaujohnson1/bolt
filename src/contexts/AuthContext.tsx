import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, type User as AppUser } from '../lib/supabase';
import { withTimeout, withRetry, debounceAsync } from '../utils/promiseUtils';

// Timeout constants
const PROFILE_FETCH_TIMEOUT = 15000; // 15 seconds
const PROFILE_CREATE_TIMEOUT = 15000; // 15 seconds
const SESSION_TIMEOUT = 30000; // 30 seconds

interface AuthContextType {
  user: AppUser | null;
  authUser: User | null;
  loading: boolean;
  redirectPath: string | null;
  setRedirectPath: (path: string | null) => void;
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
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const authEffectInitialized = React.useRef(false);

  const fetchUserProfile = async (supabaseUser: User): Promise<AppUser | null> => {
    try {
      console.log('🔍 [AUTH] Starting fetchUserProfile for user:', supabaseUser.id);
      
      // Use RPC function to create or retrieve user profile (bypasses RLS)
      console.log('🔍 [AUTH] Using RPC function to create/retrieve user profile...');
      const userName = 
        supabaseUser.user_metadata?.full_name || 
        supabaseUser.user_metadata?.name || 
        supabaseUser.email?.split('@')[0] || 
        'User';
      
      const { data: userProfile, error: rpcError } = await withTimeout(
        supabase.rpc('create_user_profile', {
          user_avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
          user_email: supabaseUser.email || '',
          user_id: supabaseUser.id,
          user_name: userName
        }),
        PROFILE_FETCH_TIMEOUT,
        'RPC create_user_profile operation timed out while creating/updating user profile'
      );

      if (rpcError) {
        console.error('❌ [AUTH] Error details:', rpcError.message);
        console.error('❌ [AUTH] RPC parameters that failed:', {
          user_id: supabaseUser.id,
          user_email: supabaseUser.email || '',
          user_name: userName,
          user_avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null
        });
        throw rpcError;
      }

      if (!userProfile) {
        console.error('❌ [AUTH] RPC function returned no data');
        // If insert fails, return a minimal user object to prevent auth blocking
        return {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: userName,
          avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
          subscription_plan: 'free',
          subscription_status: 'active',
          listings_used: 0,
          listings_limit: 999,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        } as AppUser;
      }

      console.log('✅ [AUTH] User profile created/retrieved successfully:', userProfile);
      return userProfile;
      
    } catch (error) {
      console.error('❌ [AUTH] Unexpected error in fetchUserProfile:', error);
      
      // Return a minimal user object to prevent auth from completely failing
      const userName = 
        supabaseUser.user_metadata?.full_name || 
        supabaseUser.user_metadata?.name || 
        supabaseUser.email?.split('@')[0] || 
        'User';
        
      return {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: userName,
        avatar_url: supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture || null,
        subscription_plan: 'free',
        subscription_status: 'active',
        listings_used: 0,
        listings_limit: 999,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as AppUser;
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

  // Debounced auth state change handler to prevent rapid successive updates
  const handleAuthStateChange = React.useCallback(
    debounceAsync(async (event: string, session: any) => {
      // Always set loading to true at the start of processing any auth state change
      setLoading(true);
      
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
          const profile = await withRetry(
            () => withTimeout(
              fetchUserProfile(session.user),
              PROFILE_FETCH_TIMEOUT,
              'User profile fetch timed out during auth state change'
            ),
            3, // maxRetries
            2000 // baseDelay
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
    }, 500), // 500ms debounce delay
    []
  );

  useEffect(() => {
    // Prevent multiple effect runs
    if (authEffectInitialized.current) {
      console.log('🛑 [AUTH] Auth effect already initialized, skipping');
      return;
    }
    
    authEffectInitialized.current = true;
    console.log('🔄 [AUTH] Auth effect triggered - setting up authentication listeners');
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Get initial session and trigger auth state change handler
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('❌ [AUTH] Error getting initial session:', error);
        handleAuthStateChange('INITIAL_SESSION_ERROR', null);
      } else {
        console.log('📱 [AUTH] Initial session check:', session ? 'found' : 'not found');
        handleAuthStateChange('INITIAL_SESSION', session);
      }
    });

    console.log('✅ [AUTH] Auth listeners set up successfully');

    return () => {
      subscription.unsubscribe();
      authEffectInitialized.current = false; // Reset flag on cleanup
    };
  }, [handleAuthStateChange]);

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
    redirectPath,
    setRedirectPath,
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