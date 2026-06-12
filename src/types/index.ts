export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  subscription_tier: '1_month' | '3_month' | '6_month' | 'admin' | 'user';
  createdAt: string;
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
  prepTime: number;
  servings: number;
  categories: string[];
  dietaryPreferences: string[];
  ingredients: Ingredient[];
  steps: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  variants?: RecipeVariant[];
  createdBy: string;
  createdAt: string;
}

export interface RecipeVariant {
  id: string;
  name: string;
  targetCalories: number;
  ingredients: Ingredient[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  adjustments: string; // Description des ajustements
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: 'fruits-legumes' | 'boucherie-charcuterie' | 'poisson' | 'produits-laitiers' | 'epicerie-salee' | 'epicerie-sucree' | 'boisson' | 'surgeles' | 'boulangerie-patisserie' | 'bio-dietetique' | 'condiments-assaisonnements' | 'complements-alimentaires';
}

export interface Podcast {
  id: string;
  title: string;
  description: string;
  keyPoints?: string[];
  weekChallenges?: string[];
  audioUrl: string;
  duration: number;
  category: string;
  thumbnail: string;
  access_tiers: ('1_month' | '3_month' | '6_month' | 'all')[];
  createdBy: string;
  createdAt: string;
  displayOrder?: number;
  support_pdf_url?: string;
  ctaButton?: {
    text: string;
    url: string;
    enabled: boolean;
  };
  ctaButton2?: {
    text: string;
    url: string;
    enabled: boolean;
  };
}

export interface MealPlan {
  id: string;
  userId: string;
  date: string;
  meals: {
    'petit-déjeuner'?: string;
    'déjeuner'?: string;
    'dîner'?: string;
    'collation'?: string;
  };
}

export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  date: string;
  measurements?: {
    waist?: number;
    chest?: number;
    hips?: number;
  };
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
}

export interface WeeklyGoal {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly';
  icon: string;
  color: string;
}

export interface WeeklyProgress {
  id: string;
  userId: string;
  weekStart: string; // Date de début de semaine (lundi)
  goals: {
    [goalId: string]: {
      completed: boolean[];
      weeklyCompleted?: boolean;
    };
  };
  badgeEarned?: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  condition: string;
}

export interface Message {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  status: 'new' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  adminResponse?: string;
  adminId?: string;
  respondedAt?: string;
  createdAt: string;
  updatedAt: string;
}