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
      
      console.log('🔍 [AUTH] Attempting to fetch existing user profile from database...');
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      console.log('📊 [AUTH] Database query result:', { data, error });

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('👤 [AUTH] User profile not found (PGRST116), creating new profile...');
          
          // Extract name from user metadata or email
          const userName = 
            supabaseUser.user_metadata?.full_name || 
            supabaseUser.user_metadata?.name || 
            supabaseUser.email?.split('@')[0] || 
            'User';

          console.log('📝 [AUTH] Creating user profile with name:', userName);
          console.log('🆔 [AUTH] User ID:', supabaseUser.id);
          console.log('📧 [AUTH] User email:', supabaseUser.email);
          console.log('🖼️ [AUTH] Avatar URL:', supabaseUser.user_metadata?.avatar_url || supabaseUser.user_metadata?.picture);

          const newUserData = {
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
            is_active: true
          };

          console.log('📤 [AUTH] Attempting to upsert user with data:', JSON.stringify(newUserData, null, 2));

          const { data: newUser, error: upsertError } = await supabase
            .from('users')
            .upsert([newUserData], {
              onConflict: 'id'
            })
            .select()
            .single();

          console.log('📥 [AUTH] Upsert result:', { newUser, upsertError });

          if (upsertError) {
            console.error('❌ [AUTH] Error upserting user profile:', upsertError);
            console.error('❌ [AUTH] Error details:', {
              code: upsertError.code,
              message: upsertError.message,
              details: upsertError.details,
              hint: upsertError.hint
            });
            console.error('❌ [AUTH] Data that failed to insert:', JSON.stringify(newUserData, null, 2));
            return null;
          }

          console.log('✅ [AUTH] User profile upserted successfully:', newUser);
          return newUser;
        } else {
          console.error('❌ [AUTH] Error fetching user profile (not PGRST116):', error);
          console.error('❌ [AUTH] Fetch error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          return null;
        }
      }

      console.log('✅ [AUTH] User profile fetched successfully from database:', data);
      return data;
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
      console.log('✅ [AUTH] User profile updated successfully:', data);
    } catch (error) {
      console.error('❌ [AUTH] Error updating user profile:', error);
      throw error;
    }
  };

  // Function to fix existing user's listing limit
  const fixUserListingLimit = async () => {
    if (!authUser) return;
    
    try {
      console.log('🔧 [AUTH] Fixing user listing limit...');
      const { data, error } = await supabase
        .from('users')
        .update({
          listings_limit: 999,
          updated_at: new Date().toISOString()
        })
        .eq('id', authUser.id)
        .select()
        .single();

      if (error) throw error;

      setUser(data);
      console.log('✅ [AUTH] User listing limit fixed:', data.listings_limit);
    } catch (error) {
      console.error('❌ [AUTH] Error fixing user listing limit:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 [AUTH] Auth effect triggered - setting up authentication listeners');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('🔍 [AUTH] Getting initial session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('📊 [AUTH] Initial session result:', { session: session ? 'exists' : 'null', error });
        
        if (error) {
          console.error('❌ [AUTH] Error getting initial session:', error);
          if (error.message.includes('session_not_found') || error.message.includes('JWT')) {
            console.log('🔄 [AUTH] Attempting to refresh session...');
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('❌ [AUTH] Session refresh failed:', refreshError);
              setUser(null);
              setAuthUser(null);
              setLoading(false);
              return;
            }
            
            if (refreshData.session) {
              console.log('✅ [AUTH] Session refreshed successfully');
              setAuthUser(refreshData.session.user);
              const profile = await fetchUserProfile(refreshData.session.user);
              setUser(profile);
              // Fix listing limit for existing users
              if (profile && profile.listings_limit < 999) {
                await fixUserListingLimit();
              }
            }
          }
          setLoading(false);
          return;
        }

        if (session) {
          console.log('📱 [AUTH] Initial session found for user:', session.user.email);
          setAuthUser(session.user);
          console.log('🔄 [AUTH] Fetching user profile for initial session...');
          const profile = await fetchUserProfile(session.user);
          console.log('📊 [AUTH] Profile fetch result for initial session:', profile ? 'success' : 'failed');
          setUser(profile);
          // Fix listing limit for existing users
          if (profile && profile.listings_limit < 999) {
            await fixUserListingLimit();
          }
        } else {
          console.log('ℹ️ [AUTH] No initial session found');
        }
      } catch (error) {
        console.error('❌ [AUTH] Unexpected error getting initial session:', error);
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
        
        if (session) {
          console.log('✅ [AUTH] Session exists, setting authUser and fetching profile...');
          setAuthUser(session.user);
          console.log('🔄 [AUTH] Fetching user profile for auth state change...');
          const profile = await fetchUserProfile(session.user);
          console.log('📊 [AUTH] Profile fetch result for auth state change:', profile ? 'success' : 'failed');
          setUser(profile);
          // Fix listing limit for existing users
          if (profile && profile.listings_limit < 999) {
            await fixUserListingLimit();
          }
        } else {
          console.log('❌ [AUTH] No session, clearing user state...');
          setUser(null);
          setAuthUser(null);
        }
        
        console.log('🏁 [AUTH] Auth state change processing complete, setting loading to false');
        setLoading(false);
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
    updateUser,
    fixUserListingLimit
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};