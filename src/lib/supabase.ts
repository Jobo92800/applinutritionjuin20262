import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);
export const isProduction = import.meta.env.PROD;

if (import.meta.env.DEV) {
  console.log('Supabase configured:', isSupabaseConfigured);
}

let supabase: any;

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: (_name, _acquireTimeout, fn) => fn(),
      },
    });
  } catch (error) {
    console.error('Error creating Supabase client:', error);
    throw error;
  }
} else {
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }) }) })
    })
  };
}

export { supabase };

// Types Supabase
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: 'user' | 'admin';
          subscription_tier: '1_month' | '3_month' | '6_month' | 'admin' | 'user';
          onboarding_complete: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name: string;
          role?: 'user' | 'admin';
          subscription_tier?: '1_month' | '3_month' | '6_month' | 'admin' | 'user';
          onboarding_complete?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          role?: 'user' | 'admin';
          subscription_tier?: '1_month' | '3_month' | '6_month' | 'admin' | 'user';
          onboarding_complete?: boolean;
          updated_at?: string;
        };
      };
      recipes: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          image: string | null;
          difficulty: 'facile' | 'moyen' | 'difficile';
          prep_time: number;
          servings: number;
          category: string | null;
          categories: string[];
          ingredients: any[];
          steps: string[];
          nutrition: any;
          dietary_preferences: string[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image?: string | null;
          difficulty: 'facile' | 'moyen' | 'difficile';
          prep_time: number;
          servings: number;
          category?: string | null;
          categories: string[];
          ingredients?: any[];
          steps?: string[];
          nutrition?: any;
          dietary_preferences?: string[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          description?: string | null;
          image?: string | null;
          difficulty?: 'facile' | 'moyen' | 'difficile';
          prep_time?: number;
          servings?: number;
          category?: string | null;
          categories?: string[];
          ingredients?: any[];
          steps?: string[];
          nutrition?: any;
          dietary_preferences?: string[];
          updated_at?: string;
        };
      };
      podcasts: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          audio_url: string;
          duration: number;
          category: string;
          thumbnail: string | null;
          access_tiers: ('1_month' | '3_month' | '6_month' | 'all')[];
          created_by: string | null;
          created_at: string;
          updated_at: string;
          key_points: string[] | null;
          week_challenges: string[] | null;
          cta_button: any | null;
          cta_button2: any | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          audio_url: string;
          duration?: number;
          category: string;
          thumbnail?: string | null;
          access_tiers?: ('1_month' | '3_month' | '6_month' | 'all')[];
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          key_points?: string[];
          week_challenges?: string[];
          cta_button?: any | null;
          cta_button2?: any | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          audio_url?: string;
          duration?: number;
          category?: string;
          thumbnail?: string | null;
          access_tiers?: ('1_month' | '3_month' | '6_month' | 'all')[];
          updated_at?: string;
          key_points?: string[];
          week_challenges?: string[];
          cta_button?: any | null;
          cta_button2?: any | null;
        };
      };
      meal_plans: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          meals: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          meals?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          date?: string;
          meals?: any;
          updated_at?: string;
        };
      };
      weight_entries: {
        Row: {
          id: string;
          user_id: string;
          weight: number;
          date: string;
          measurements: any | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          weight: number;
          date: string;
          measurements?: any | null;
          created_at?: string;
        };
        Update: {
          weight?: number;
          date?: string;
          measurements?: any | null;
        };
      };
      shopping_items: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          quantity: number;
          unit: string;
          category: string;
          checked: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          quantity?: number;
          unit?: string;
          category?: string;
          checked?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          quantity?: number;
          unit?: string;
          category?: string;
          checked?: boolean;
          updated_at?: string;
        };
      };
      weekly_progress: {
        Row: {
          id: string;
          user_id: string;
          week_start: string;
          goals: any;
          badge_earned: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          week_start: string;
          goals?: any;
          badge_earned?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          goals?: any;
          badge_earned?: string | null;
          updated_at?: string;
        };
      };
      user_favorites: {
        Row: {
          id: string;
          user_id: string;
          recipe_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          recipe_id: string;
          created_at?: string;
        };
        Update: {};
      };
      weekly_goals: {
        Row: {
          id: string;
          title: string;
          description: string;
          type: 'daily' | 'weekly';
          icon: string;
          color: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          title: string;
          description: string;
          type: 'daily' | 'weekly';
          icon: string;
          color: string;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          type?: 'daily' | 'weekly';
          icon?: string;
          color?: string;
          active?: boolean;
        };
      };
    };
  };
}

export type User = Database['public']['Tables']['profiles']['Row'];