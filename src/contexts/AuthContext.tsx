import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subscription_tier: '1_month' | '3_month' | '6_month' | 'admin' | 'user';
  createdAt: string;
  isOnboardingComplete?: boolean;
  profile?: {
    weightGoal?: number;
    heightCm?: number;
    gender?: 'homme' | 'femme';
    age?: '18-30' | '31-50' | '51+';
    activityLevel?: 'faible' | 'moderee' | 'elevee';
    metabolism?: 'normal' | 'ralentissement';
    dietaryPreferences?: string[];
  };
}

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<'success' | 'invalid_credentials' | 'error'>;
  register: (email: string, password: string, name: string) => Promise<'success' | 'user_exists' | 'error'>;
  requestPasswordReset: (email: string) => Promise<'success' | 'error'>;
  completeOnboarding: (data: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initAuth = async () => {
      try {
        if (!isSupabaseConfigured) {
          // Vérifier s'il y a un profil sauvegardé
          let savedProfile = null;
          try {
            savedProfile = localStorage.getItem('user_profile');
          } catch (error) {
            console.error('Cannot access localStorage:', error);
          }

          if (savedProfile) {
            try {
              const parsedProfile = JSON.parse(savedProfile);
              if (mounted) {
                setUser(parsedProfile);
                setIsLoading(false);
              }
              return;
            } catch (error) {
              console.error('Erreur lors du parsing du profil sauvegardé:', error);
              try {
                localStorage.removeItem('user_profile');
              } catch (e) {
                // ignore
              }
            }
          }

          // Mode démo avec utilisateur fictif (admin par défaut)
          if (mounted) {
            setUser({
              id: 'demo-user',
              email: 'demo@nutrition.com',
              name: 'Utilisateur Démo',
              role: 'admin',
              subscription_tier: 'admin',
              createdAt: new Date().toISOString(),
              isOnboardingComplete: true
            });
            setIsLoading(false);
          }
          return;
        }

        // Essayer de restaurer la session depuis le localStorage en premier
        let restoredUser = null;
        try {
          const savedSupabaseProfile = localStorage.getItem('supabase_user_profile');
          if (savedSupabaseProfile) {
            restoredUser = JSON.parse(savedSupabaseProfile);
            if (mounted) {
              setUser(restoredUser);
              setIsLoading(false);
            }
          }
        } catch (error) {
          // ignore
        }

        // Récupérer la session actuelle
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);

          if (restoredUser && mounted) {
            return;
          }

          if (error.message?.includes('refresh_token_not_found') ||
              error.message?.includes('Invalid Refresh Token')) {
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
            try {
              await supabase.auth.signOut();
              localStorage.removeItem('supabase_user_profile');
            } catch (signOutError) {
              console.error('Erreur lors de la déconnexion:', signOutError);
            }
            return;
          }

          if (mounted) {
            setUser(null);
            setIsLoading(false);
          }
          return;
        }

        if (session?.user && mounted) {
          await fetchUserProfile(session.user);
        } else if (mounted && !restoredUser) {
          setUser(null);
          setIsLoading(false);
        }

        // Écouter les changements d'authentification
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          if (event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              await fetchUserProfile(session.user, true);
            }
            return;
          }

          if (event === 'SIGNED_OUT') {
            setUser(null);
            setIsLoading(false);
            try {
              localStorage.removeItem('supabase_user_profile');
            } catch (e) {
              // ignore
            }
            return;
          }

          if (event === 'SIGNED_IN' && session?.user) {
            await fetchUserProfile(session.user);
          }
        });

        authSubscription = subscription;

        return () => {
          if (authSubscription) {
            authSubscription.unsubscribe();
          }
        };
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'authentification:', error);

        if (mounted) {
          try {
            const savedProfile = localStorage.getItem('supabase_user_profile');
            if (savedProfile) {
              const parsedProfile = JSON.parse(savedProfile);
              setUser(parsedProfile);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // ignore
          }

          setUser(null);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    // Ajouter un listener pour détecter quand l'utilisateur revient sur l'onglet
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isSupabaseConfigured) {
        try {
          const savedProfile = localStorage.getItem('supabase_user_profile');
          if (savedProfile) {
            const parsedProfile = JSON.parse(savedProfile);
            setUser(parsedProfile);
          }

          const { data: { session }, error } = await supabase.auth.getSession();
          if (session?.user && !error) {
            await fetchUserProfile(session.user, true);
          }
        } catch (error) {
          console.error('Error checking session on visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const fetchUserProfile = async (authUser: User, silent: boolean = false) => {
    try {
      if (!isSupabaseConfigured) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error fetching profile:', error);
        if (!silent) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      if (profile) {
        const userProfile = {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          subscription_tier: profile.subscription_tier,
          createdAt: profile.created_at,
          isOnboardingComplete: profile.onboarding_complete === true,
          profile: {
            currentWeight: profile.current_weight,
            weightGoal: profile.weight_goal,
            heightCm: profile.height_cm,
            gender: profile.gender,
            age: profile.age,
            activityLevel: profile.activity_level,
            metabolism: profile.metabolism,
            dietaryPreferences: profile.dietary_preferences || []
          }
        };

        setUser(userProfile);

        try {
          localStorage.setItem('supabase_user_profile', JSON.stringify(userProfile));
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      if (!silent) {
        setUser(null);
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const login = async (email: string, password: string): Promise<'success' | 'invalid_credentials' | 'error'> => {
    try {
      if (!isSupabaseConfigured) {
        let savedProfile = null;
        try {
          savedProfile = localStorage.getItem('user_profile');
        } catch (error) {
          // ignore
        }

        if (savedProfile) {
          try {
            const parsedProfile = JSON.parse(savedProfile);
            if (parsedProfile.email === email) {
              setUser(parsedProfile);
              return 'success';
            }
          } catch (error) {
            console.error('Erreur lors du parsing du profil sauvegardé:', error);
            try {
              localStorage.removeItem('user_profile');
            } catch (e) {
              // ignore
            }
          }
        }

        // Mode démo - vérifier les identifiants de démonstration
        if ((email === 'admin@nutrition.com' && password === 'admin123') ||
            (email === 'user@nutrition.com' && password === 'user123')) {
          const demoUser = {
            id: 'demo-user',
            email: email,
            name: email === 'admin@nutrition.com' ? 'Admin Démo' : 'Utilisateur Démo',
            role: email === 'admin@nutrition.com' ? 'admin' : 'user',
            subscription_tier: 'admin',
            createdAt: new Date().toISOString(),
            isOnboardingComplete: true
          };

          try {
            localStorage.setItem('user_profile', JSON.stringify(demoUser));
          } catch (error) {
            // ignore
          }
          setUser(demoUser);
          return 'success';
        } else {
          return 'invalid_credentials';
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return 'invalid_credentials';
        }
        console.error('Erreur de connexion:', error);
        return 'error';
      }

      if (data.user) {
        await fetchUserProfile(data.user);
        return 'success';
      }

      return 'error';
    } catch (error) {
      console.error('Erreur de connexion:', error);
      return 'error';
    }
  };

  const register = async (email: string, password: string, name: string): Promise<'success' | 'user_exists' | 'error'> => {
    try {
      if (!isSupabaseConfigured) {
        const newUser = {
          id: 'demo-user-new',
          email: email,
          name: name,
          role: 'user',
          subscription_tier: 'user',
          createdAt: new Date().toISOString(),
          isOnboardingComplete: false
        };
        setUser(newUser);
        localStorage.setItem('user_profile', JSON.stringify(newUser));
        return 'success';
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          return 'user_exists';
        }
        console.error('Erreur d\'inscription:', error);
        return 'error';
      }

      if (data.user) {
        // Le profil sera créé automatiquement par le trigger Supabase
        // et récupéré via fetchUserProfile dans onAuthStateChange
        await fetchUserProfile(data.user);
        
        return 'success';
      }

      return 'error';
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      return 'error';
    }
  };

  const requestPasswordReset = async (email: string): Promise<'success' | 'error'> => {
    try {
      if (!isSupabaseConfigured) {
        return 'success';
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`
      });

      if (error) {
        console.error('Erreur lors de la demande de réinitialisation:', error);
        return 'error';
      }

      return 'success';
    } catch (error) {
      console.error('Erreur lors de la demande de réinitialisation:', error);
      return 'error';
    }
  };

  const completeOnboarding = async (data: {
    currentWeight: number;
    weightGoal: number;
    heightCm: number;
    gender: 'homme' | 'femme';
    age: '18-30' | '31-70' | '71+';
    activityLevel: 'faible' | 'moderee' | 'elevee';
    metabolism: 'normal' | 'ralentissement';
  }) => {
    if (!user) return;

    try {
      if (!isSupabaseConfigured) {
        const updatedUser = {
          ...user,
          isOnboardingComplete: true,
          profile: {
            currentWeight: data.currentWeight,
            weightGoal: data.weightGoal,
            heightCm: data.heightCm,
            gender: data.gender,
            age: data.age,
            activityLevel: data.activityLevel,
            metabolism: data.metabolism
          }
        };

        localStorage.setItem('user_profile', JSON.stringify(updatedUser));
        setUser(updatedUser);
        return;
      }

      // En mode réel avec Supabase, mettre à jour le profil dans la base de données
      const { error } = await supabase
        .from('profiles')
        .update({
          onboarding_complete: true,
          weight_goal: data.weightGoal,
          current_weight: data.currentWeight,
          height_cm: data.heightCm,
          gender: data.gender,
          age: data.age,
          activity_level: data.activityLevel,
          metabolism: data.metabolism
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erreur lors de la mise à jour du profil:', error);
        throw error;
      }

      // Créer la première entrée de poids
      const { error: weightError } = await supabase
        .from('weight_entries')
        .insert({
          user_id: user.id,
          weight: data.currentWeight,
          date: new Date().toISOString().split('T')[0]
        });

      if (weightError) {
        console.error('Erreur lors de l\'ajout du poids initial:', weightError);
        // Ne pas bloquer l'onboarding si l'ajout du poids échoue
      }

      // Mettre à jour l'état local
      const updatedUser = {
        ...user,
        isOnboardingComplete: true,
        profile: {
          currentWeight: data.currentWeight,
          weightGoal: data.weightGoal,
          heightCm: data.heightCm,
          gender: data.gender,
          age: data.age,
          activityLevel: data.activityLevel,
          metabolism: data.metabolism,
          dietaryPreferences: []
        }
      };

      setUser(updatedUser);

      try {
        localStorage.setItem('supabase_user_profile', JSON.stringify(updatedUser));
      } catch (e) {
        // ignore
      }
    } catch (error) {
      console.error('Erreur lors de la finalisation de l\'onboarding:', error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        await fetchUserProfile(authUser, true);
      }
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du profil:', error);
    }
  };

  const logout = async () => {
    try {
      if (isSupabaseConfigured && user) {
        // Vérifier s'il y a une session active avant de tenter la déconnexion
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (!sessionError && session) {
          const { error } = await supabase.auth.signOut();

          // Ignore session-related errors as they indicate the session is already invalid
          if (error &&
              !error.message?.includes('session_not_found') &&
              !error.message?.includes('Auth session missing') &&
              !error.message?.includes('Session from session_id claim in JWT does not exist') &&
              !(error as any)?.status === 403) {
            console.error('Erreur de déconnexion:', error);
          }
        }
      }

      // Nettoyer le localStorage
      try {
        if (!isSupabaseConfigured) {
          localStorage.removeItem('user_profile');
        } else {
          localStorage.removeItem('supabase_user_profile');
        }
      } catch (error) {
        console.warn('Cannot remove from localStorage:', error);
      }

      setUser(null);
    } catch (error) {
      // Only log errors that are not related to session issues
      if (error instanceof Error &&
          !error.message?.includes('session_not_found') &&
          !error.message?.includes('Auth session missing') &&
          !error.message?.includes('Session from session_id claim in JWT does not exist') &&
          !(error as any)?.status === 403) {
        console.error('Erreur de déconnexion:', error);
      }
      // Même en cas d'erreur, nettoyer l'état local
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      requestPasswordReset,
      completeOnboarding,
      refreshProfile,
      logout,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}