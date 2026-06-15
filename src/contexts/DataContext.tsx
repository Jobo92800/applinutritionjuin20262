import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Recipe, Podcast, MealPlan, WeightEntry, ShoppingItem, WeeklyGoal, WeeklyProgress, Badge, Message } from '../types';

interface DataContextType {
  recipes: Recipe[];
  podcasts: Podcast[];
  mealPlans: MealPlan[];
  weightEntries: WeightEntry[];
  shoppingList: ShoppingItem[];
  favorites: string[];
  weeklyGoals: WeeklyGoal[];
  weeklyProgress: WeeklyProgress[];
  badges: Badge[];
  messages: Message[];
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => Promise<void>;
  updateRecipe: (id: string, recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addPodcast: (podcast: Omit<Podcast, 'id' | 'createdAt'>) => Promise<void>;
  updatePodcast: (id: string, podcast: Partial<Podcast>) => Promise<void>;
  deletePodcast: (id: string) => Promise<void>;
  addMealPlan: (mealPlan: Omit<MealPlan, 'id'>) => Promise<void>;
  updateMealPlan: (id: string, mealPlan: Partial<MealPlan>) => Promise<void>;
  getMealPlanByDate: (userId: string, date: string) => Promise<MealPlan | null>;
  addWeightEntry: (entry: Omit<WeightEntry, 'id'>) => Promise<void>;
  updateWeightEntry: (id: string, entry: Partial<Omit<WeightEntry, 'id' | 'userId'>>) => Promise<void>;
  deleteWeightEntry: (id: string) => Promise<void>;
  toggleFavorite: (recipeId: string) => Promise<void>;
  updateShoppingList: (items: ShoppingItem[]) => Promise<void>;
  generateShoppingList: (userId: string) => Promise<void>;
  updateWeeklyProgress: (userId: string, goalId: string, dayIndex: number, completed: boolean) => Promise<void>;
  updateWeeklyGoal: (userId: string, goalId: string, completed: boolean) => Promise<void>;
  getCurrentWeekProgress: (userId: string) => WeeklyProgress | null;
  getUserBadges: (userId: string) => Badge[];
  uploadPodcastAudio: (file: File) => Promise<string>;
  uploadRecipeImage: (file: File) => Promise<string>;
  uploadPodcastImage: (file: File) => Promise<string>;
  uploadPodcastPdf: (file: File) => Promise<string>;
  updatePodcastOrder: (reorderedPodcasts: Podcast[]) => Promise<void>;
  sendMessage: (message: Omit<Message, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateMessage: (id: string, updates: Partial<Message>) => Promise<void>;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

// Données de démonstration
const DEMO_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Salade de quinoa aux légumes',
    description: 'Une salade nutritive et colorée parfaite pour un déjeuner équilibré',
    image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    difficulty: 'facile',
    prepTime: 20,
    servings: 4,
    category: 'Déjeuner',
    categories: ['Déjeuner'],
    dietaryPreferences: ['Végétarien', 'Sans gluten'],
    ingredients: [
      { id: '1', name: 'Quinoa', quantity: 200, unit: 'g', category: 'epicerie-salee' },
      { id: '2', name: 'Tomates cerises', quantity: 200, unit: 'g', category: 'fruits-legumes' },
      { id: '3', name: 'Concombre', quantity: 1, unit: 'pièce', category: 'fruits-legumes' }
    ],
    steps: [
      'Rincer le quinoa et le cuire dans l\'eau bouillante pendant 15 minutes',
      'Couper les tomates cerises en deux',
      'Découper le concombre en dés',
      'Mélanger tous les ingrédients et assaisonner'
    ],
    nutrition: { calories: 320, protein: 12, carbs: 45, fat: 8 },
    createdBy: 'demo-user',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

const DEMO_PODCASTS: Podcast[] = [
  {
    id: '1',
    title: 'Les bases de la nutrition',
    description: 'Découvrez les fondamentaux d\'une alimentation équilibrée',
    keyPoints: [
      'Comprendre les macronutriments essentiels',
      'L\'importance de l\'hydratation quotidienne',
      'Comment équilibrer ses repas',
      'Les erreurs nutritionnelles courantes à éviter'
    ],
    audioUrl: '/audio/demo.mp3',
    duration: 1800,
    category: 'Nutrition',
    thumbnail: 'https://images.pexels.com/photos/6975474/pexels-photo-6975474.jpeg',
    access_tiers: ['all'],
    createdBy: 'demo-user',
    createdAt: '2024-01-01T00:00:00Z'
  }
];

// Badges disponibles
const AVAILABLE_BADGES: Badge[] = [
  {
    id: 'perfect_week',
    name: 'Semaine Parfaite',
    description: 'Tous les objectifs de la semaine accomplis !',
    icon: '🏆',
    color: 'bg-yellow-100 text-yellow-800',
    condition: 'all_goals_completed'
  },
  {
    id: 'hydration_master',
    name: 'Maître de l\'Hydratation',
    description: 'Objectif hydratation atteint 7 jours d\'affilée',
    icon: '💧',
    color: 'bg-blue-100 text-blue-800',
    condition: 'water_7_days'
  },
  {
    id: 'supplement_champion',
    name: 'Champion des Compléments',
    description: 'Compléments pris tous les jours de la semaine',
    icon: '💊',
    color: 'bg-green-100 text-green-800',
    condition: 'supplements_7_days'
  },
  {
    id: 'chef_at_home',
    name: 'Chef à Domicile',
    description: 'Cuisine maison tous les jours de la semaine',
    icon: '👨‍🍳',
    color: 'bg-orange-100 text-orange-800',
    condition: 'cooking_7_days'
  },
  {
    id: 'podcast_listener',
    name: 'Auditeur Assidu',
    description: 'Audio de la semaine écouté',
    icon: '🎧',
    color: 'bg-purple-100 text-purple-800',
    condition: 'podcast_weekly'
  }
];

const DEMO_WEEKLY_GOALS: WeeklyGoal[] = [
  {
    id: 'supplements',
    title: 'Compléments alimentaires',
    description: 'Ai-je bien pris mes compléments ce matin ?',
    type: 'daily',
    icon: '💊',
    color: 'bg-blue-100 text-blue-800'
  },
  {
    id: 'water',
    title: 'Hydratation',
    description: 'Ai-je bien bu mes 2 litres d\'eau ?',
    type: 'daily',
    icon: '💧',
    color: 'bg-cyan-100 text-cyan-800'
  },
  {
    id: 'podcast',
    title: 'Audio de la semaine',
    description: 'Ai-je bien écouté l\'audio de la semaine ?',
    type: 'weekly',
    icon: '🎧',
    color: 'bg-purple-100 text-purple-800'
  },
  {
    id: 'homecooking',
    title: 'Cuisine maison',
    description: 'Ai-je cuisiné mes repas maison ?',
    type: 'daily',
    icon: '👨‍🍳',
    color: 'bg-orange-100 text-orange-800'
  }
];

// Fonction utilitaire pour générer un UUID simple
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoal[]>(DEMO_WEEKLY_GOALS);
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [badges] = useState<Badge[]>(AVAILABLE_BADGES);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        if (!user) {
          if (mounted) {
            setIsLoading(false);
          }
          return;
        }

        if (isSupabaseConfigured) {
          await loadAllDataFromSupabase();
        } else {
          // Mode démo
          loadDemoData();
        }
      } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    // Ajouter un listener pour recharger les données quand l'onglet devient visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        if (isSupabaseConfigured) {
          loadAllDataFromSupabase().catch(error => {
            console.error('Error reloading data on visibility change:', error);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  const loadDemoData = () => {
    setRecipes(DEMO_RECIPES);
    setPodcasts(DEMO_PODCASTS);
    setMealPlans([]);
    setWeightEntries([
      {
        id: '1',
        userId: user?.id || 'demo-user',
        weight: 85,
        date: '2024-06-09',
        measurements: { waist: 90, chest: 95, hips: 100 }
      }
    ]);
    setShoppingList([]);
    setFavorites([]);
    setWeeklyProgress([]);
  };

  const loadAllDataFromSupabase = async () => {
    await Promise.all([
      loadRecipes(),
      loadPodcasts(),
      loadMealPlans(),
      loadWeightEntries(),
      loadShoppingList(),
      loadFavorites(),
      loadWeeklyGoals(),
      loadWeeklyProgress(),
      loadMessages()
    ]);
  };

  const loadRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[DataContext] Error loading recipes:', error);
        setRecipes([]);
        return;
      }

      if (!data || data.length === 0) {
        setRecipes([]);
        return;
      }

      const formattedRecipes: Recipe[] = data.map(recipe => ({
        id: recipe.id,
        title: recipe.title,
        description: recipe.description || '',
        image: recipe.image || '',
        difficulty: recipe.difficulty,
        prepTime: recipe.prep_time,
        servings: recipe.servings,
        categories: recipe.categories || (recipe.category ? [recipe.category] : []),
        dietaryPreferences: recipe.dietary_preferences || [],
        ingredients: recipe.ingredients || [],
        steps: recipe.steps || [],
        nutrition: recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        variants: recipe.variants || [],
        createdBy: recipe.created_by || '',
        createdAt: recipe.created_at
      }));

      setRecipes(formattedRecipes);
    } catch (error) {
      console.error('[DataContext] Exception loading recipes:', error);
      setRecipes([]);
    }
  };

  const loadPodcasts = async () => {
    try {
      const { data, error } = await supabase
        .from('podcasts')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) {
        console.error('[DataContext] Error loading podcasts:', error);
        setPodcasts([]);
        return;
      }

      if (!data || data.length === 0) {
        setPodcasts([]);
        return;
      }

      const formattedPodcasts: Podcast[] = data.map(podcast => ({
        id: podcast.id,
        title: podcast.title,
        description: podcast.description || '',
        keyPoints: podcast.key_points || [],
        weekChallenges: podcast.week_challenges || [],
        audioUrl: podcast.audio_url,
        duration: podcast.duration,
        category: podcast.category,
        thumbnail: podcast.thumbnail || '',
        access_tiers: podcast.access_tiers || ['all'],
        displayOrder: podcast.display_order || 0,
        support_pdf_url: podcast.support_pdf_url || undefined,
        ctaButton: podcast.cta_button || null,
        ctaButton2: podcast.cta_button2 || null,
        createdBy: podcast.created_by || '',
        createdAt: podcast.created_at
      }));

      setPodcasts(formattedPodcasts);
    } catch (error) {
      console.error('[DataContext] Exception loading podcasts:', error);
      setPodcasts([]);
    }
  };

  const loadMealPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des plans de repas:', error);
        return;
      }

      const formattedMealPlans: MealPlan[] = data.map(plan => ({
        id: plan.id,
        userId: plan.user_id,
        date: plan.date,
        meals: plan.meals || {}
      }));

      setMealPlans(formattedMealPlans);
    } catch (error) {
      console.error('Erreur lors du chargement des plans de repas:', error);
      setMealPlans([]);
    }
  };

  const loadWeightEntries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weight_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement des entrées de poids:', error);
        return;
      }

      const formattedEntries: WeightEntry[] = data.map(entry => ({
        id: entry.id,
        userId: entry.user_id,
        weight: entry.weight,
        date: entry.date,
        measurements: entry.measurements || {}
      }));

      setWeightEntries(formattedEntries);
    } catch (error) {
      console.error('Erreur lors du chargement des entrées de poids:', error);
      setWeightEntries([]);
    }
  };

  const loadShoppingList = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement de la liste de courses:', error);
        return;
      }

      const formattedItems: ShoppingItem[] = data.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        checked: item.checked
      }));

      setShoppingList(formattedItems);
    } catch (error) {
      console.error('Erreur lors du chargement de la liste de courses:', error);
      setShoppingList([]);
    }
  };

  const loadFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('recipe_id')
        .eq('user_id', user.id);

      if (error) {
        console.error('Erreur lors du chargement des favoris:', error);
        return;
      }

      setFavorites(data.map(fav => fav.recipe_id));
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      setFavorites([]);
    }
  };

  const loadWeeklyGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('active', true)
        .order('created_at');

      if (error) {
        console.error('Erreur lors du chargement des objectifs hebdomadaires:', error);
        return;
      }

      const formattedGoals: WeeklyGoal[] = data.map(goal => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        type: goal.type,
        icon: goal.icon,
        color: goal.color
      }));

      setWeeklyGoals(formattedGoals.length > 0 ? formattedGoals : DEMO_WEEKLY_GOALS);
    } catch (error) {
      console.error('Erreur lors du chargement des objectifs hebdomadaires:', error);
      setWeeklyGoals(DEMO_WEEKLY_GOALS);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('weekly_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: false });

      if (error) {
        console.error('Erreur lors du chargement du progrès hebdomadaire:', error);
        return;
      }

      const formattedProgress: WeeklyProgress[] = data.map(progress => ({
        id: progress.id,
        userId: progress.user_id,
        weekStart: progress.week_start,
        goals: progress.goals || {},
        badgeEarned: progress.badge_earned
      }));

      setWeeklyProgress(formattedProgress);
    } catch (error) {
      console.error('Erreur lors du chargement du progrès hebdomadaire:', error);
      setWeeklyProgress([]);
    }
  };

  const loadMessages = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (user.role !== 'admin') {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erreur lors du chargement des messages:', error);
        return;
      }

      const formattedMessages: Message[] = data.map(msg => ({
        id: msg.id,
        userId: msg.user_id,
        userName: msg.user_name,
        userEmail: msg.user_email,
        subject: msg.subject,
        message: msg.message,
        status: msg.status,
        priority: msg.priority,
        adminResponse: msg.admin_response,
        adminId: msg.admin_id,
        respondedAt: msg.responded_at,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Erreur lors du chargement des messages:', error);
      setMessages([]);
    }
  };

  // Fonction pour obtenir le début de la semaine (lundi)
  const getWeekStart = (date: Date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  // Obtenir ou créer le progrès de la semaine courante
  const getCurrentWeekProgress = (userId: string): WeeklyProgress | null => {
    const weekStart = getWeekStart();
    return weeklyProgress.find(p => p.userId === userId && p.weekStart === weekStart) || null;
  };

  // Upload de fichier audio pour podcast
  const uploadPodcastAudio = async (file: File): Promise<string> => {
    if (!isSupabaseConfigured) {
      // Mode démo - retourner une URL fictive
      return '/audio/demo.mp3';
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('podcast-audio')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Erreur lors du téléchargement: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('podcast-audio')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadPodcastPdf = async (file: File): Promise<string> => {
    if (!isSupabaseConfigured) {
      return '/pdf/demo.pdf';
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('podcast-support-pdfs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur lors du téléchargement du PDF: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('podcast-support-pdfs')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadRecipeImage = async (file: File): Promise<string> => {
    if (!isSupabaseConfigured) {
      // Mode démo - retourner une URL fictive
      return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c';
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur lors du téléchargement: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const uploadPodcastImage = async (file: File): Promise<string> => {
    if (!isSupabaseConfigured) {
      return 'https://images.pexels.com/photos/6975474/pexels-photo-6975474.jpeg';
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('podcast-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Erreur lors du téléchargement de l'image: ${uploadError.message}`);
    }

    const { data } = supabase.storage
      .from('podcast-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  // Fonction pour mettre à jour l'ordre des podcasts
  const updatePodcastOrder = async (reorderedPodcasts: Podcast[]) => {
    if (!isSupabaseConfigured) {
      setPodcasts(reorderedPodcasts);
      return;
    }

    try {
      const updatedPodcasts = reorderedPodcasts.map((podcast, index) => ({
        ...podcast,
        displayOrder: index + 1
      }));

      setPodcasts(updatedPodcasts);

      const updates = updatedPodcasts.map((podcast, index) => ({
        id: podcast.id,
        display_order: index + 1
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('podcasts')
          .update({ display_order: update.display_order })
          .eq('id', update.id);

        if (error) {
          console.error('Erreur lors de la mise à jour de l\'ordre:', error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'ordre des podcasts:', error);
      await loadPodcasts();
      throw error;
    }
  };

  // Fonctions CRUD simplifiées pour le mode démo
  const addRecipe = async (recipe: Omit<Recipe, 'id' | 'createdAt'>) => {
    if (!isSupabaseConfigured) {
      const newRecipe: Recipe = {
        ...recipe,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      setRecipes(prev => [newRecipe, ...prev]);
      return;
    }

    try {
      // Validation et nettoyage des données
      const cleanedIngredients = recipe.ingredients.map(ingredient => ({
        id: ingredient.id,
        name: String(ingredient.name || ''),
        quantity: Number(ingredient.quantity) || 0,
        unit: String(ingredient.unit || ''),
        category: String(ingredient.category || 'epicerie-salee')
      }));
      
      const cleanedSteps = recipe.steps.map(step => String(step || ''));
      
      const cleanedNutrition = {
        calories: Number(recipe.nutrition.calories) || 0,
        protein: Number(recipe.nutrition.protein) || 0,
        carbs: Number(recipe.nutrition.carbs) || 0,
        fat: Number(recipe.nutrition.fat) || 0
      };
      
      const cleanedCategories = Array.isArray(recipe.categories) 
        ? recipe.categories.map(cat => String(cat)).filter(Boolean)
        : [];
        
      const cleanedDietaryPreferences = Array.isArray(recipe.dietaryPreferences)
        ? recipe.dietaryPreferences.map(pref => String(pref)).filter(Boolean)
        : [];
      
      const insertData = {
        description: String(recipe.description || ''),
        image: String(recipe.image || ''),
        difficulty: recipe.difficulty,
        prep_time: Number(recipe.prepTime) || 0,
        servings: Number(recipe.servings) || 1,
        category: cleanedCategories[0] || 'Général',
        categories: cleanedCategories,
        ingredients: cleanedIngredients,
        steps: cleanedSteps,
        nutrition: cleanedNutrition,
        dietary_preferences: cleanedDietaryPreferences,
        created_by: user?.id
      };

      const { data, error } = await supabase
        .from('recipes')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de l\'ajout de la recette:', error);
        throw new Error(`Erreur lors de l'ajout de la recette: ${error.message}`);
      }

      await loadRecipes();
    } catch (error) {
      console.error('Erreur dans addRecipe:', error);
      throw error;
    }
  };

  const updateRecipe = async (id: string, recipe: Partial<Recipe>) => {
    if (!isSupabaseConfigured) {
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, ...recipe } : r));
      return;
    }

    try {
      const updateData: any = {};
      
      if (recipe.title !== undefined) updateData.title = String(recipe.title || '');
      if (recipe.description !== undefined) updateData.description = String(recipe.description || '');
      if (recipe.image !== undefined) updateData.image = String(recipe.image || '');
      if (recipe.difficulty !== undefined) updateData.difficulty = recipe.difficulty;
      if (recipe.prepTime !== undefined) updateData.prep_time = Number(recipe.prepTime) || 0;
      if (recipe.servings !== undefined) updateData.servings = Number(recipe.servings) || 1;
      
      if (recipe.categories !== undefined) {
        const cleanedCategories = Array.isArray(recipe.categories) 
          ? recipe.categories.map(cat => String(cat)).filter(Boolean)
          : [];
        updateData.categories = cleanedCategories;
        updateData.category = cleanedCategories[0] || 'Général';
      }
      
      if (recipe.dietaryPreferences !== undefined) {
        updateData.dietary_preferences = Array.isArray(recipe.dietaryPreferences)
          ? recipe.dietaryPreferences.map(pref => String(pref)).filter(Boolean)
          : [];
      }
      
      if (recipe.ingredients !== undefined) {
        updateData.ingredients = recipe.ingredients.map(ingredient => ({
          id: ingredient.id,
          name: String(ingredient.name || ''),
          quantity: Number(ingredient.quantity) || 0,
          unit: String(ingredient.unit || ''),
          category: String(ingredient.category || 'epicerie-salee')
        }));
      }
      
      if (recipe.steps !== undefined) {
        updateData.steps = recipe.steps.map(step => String(step || ''));
      }
      
      if (recipe.nutrition !== undefined) {
        updateData.nutrition = {
          calories: Number(recipe.nutrition.calories) || 0,
          protein: Number(recipe.nutrition.protein) || 0,
          carbs: Number(recipe.nutrition.carbs) || 0,
          fat: Number(recipe.nutrition.fat) || 0
        };
      }
      
      if (recipe.variants !== undefined) {
        updateData.variants = recipe.variants || [];
      }

      const { error } = await supabase
        .from('recipes')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la mise à jour de la recette:', error);
        throw new Error(`Erreur lors de la mise à jour de la recette: ${error.message}`);
      }

      await loadRecipes();
    } catch (error) {
      console.error('Erreur dans updateRecipe:', error);
      throw error;
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!isSupabaseConfigured) {
      setRecipes(prev => prev.filter(r => r.id !== id));
      return;
    }

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de la recette:', error);
        throw new Error(`Erreur lors de la suppression de la recette: ${error.message}`);
      }

      await loadRecipes();
    } catch (error) {
      console.error('Erreur dans deleteRecipe:', error);
      throw error;
    }
  };

  // Fonctions similaires pour les autres entités (simplifiées pour le mode démo)
  const addPodcast = async (podcast: Omit<Podcast, 'id' | 'createdAt'>) => {
    if (!isSupabaseConfigured) {
      const newPodcast: Podcast = {
        ...podcast,
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      setPodcasts(prev => [newPodcast, ...prev]);
      return;
    }

    try {
      const maxOrder = podcasts.length > 0
        ? Math.max(...podcasts.map(p => p.displayOrder || 0))
        : 0;

      const insertData: any = {
        title: podcast.title,
        description: podcast.description,
        audio_url: podcast.audioUrl,
        duration: podcast.duration,
        category: podcast.category,
        thumbnail: podcast.thumbnail,
        access_tiers: podcast.access_tiers,
        display_order: maxOrder + 1,
        created_by: user?.id
      };

      // Ajouter les champs optionnels s'ils existent
      if (podcast.keyPoints && podcast.keyPoints.length > 0) {
        insertData.key_points = podcast.keyPoints;
      }

      if (podcast.weekChallenges && podcast.weekChallenges.length > 0) {
        insertData.week_challenges = podcast.weekChallenges;
      }

      if (podcast.support_pdf_url) {
        insertData.support_pdf_url = podcast.support_pdf_url;
      }

      // Ajouter les CTA buttons s'ils existent et sont valides
      if (podcast.ctaButton && podcast.ctaButton.enabled && podcast.ctaButton.text && podcast.ctaButton.url) {
        insertData.cta_button = podcast.ctaButton;
      }

      if (podcast.ctaButton2 && podcast.ctaButton2.enabled && podcast.ctaButton2.text && podcast.ctaButton2.url) {
        insertData.cta_button2 = podcast.ctaButton2;
      }

      const { data, error } = await supabase
        .from('podcasts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de l\'ajout du podcast:', error);
        throw new Error(`Erreur lors de l'ajout du podcast: ${error.message}`);
      }

      await loadPodcasts();
    } catch (error) {
      console.error('Erreur dans addPodcast:', error);
      throw error;
    }
  };

  const updatePodcast = async (id: string, podcast: Partial<Podcast>) => {
    if (!isSupabaseConfigured) {
      setPodcasts(prev => prev.map(p => p.id === id ? { ...p, ...podcast } : p));
      return;
    }

    try {
      const updateData: any = {};
      
      if (podcast.title !== undefined) updateData.title = podcast.title;
      if (podcast.description !== undefined) updateData.description = podcast.description;
      if (podcast.keyPoints !== undefined) {
        updateData.key_points = podcast.keyPoints.length > 0 ? podcast.keyPoints : null;
      }
      if (podcast.weekChallenges !== undefined) {
        updateData.week_challenges = podcast.weekChallenges.length > 0 ? podcast.weekChallenges : null;
      }
      if (podcast.audioUrl !== undefined) updateData.audio_url = podcast.audioUrl;
      if (podcast.duration !== undefined) updateData.duration = podcast.duration;
      if (podcast.category !== undefined) updateData.category = podcast.category;
      if (podcast.thumbnail !== undefined) updateData.thumbnail = podcast.thumbnail;
      if (podcast.access_tiers !== undefined) updateData.access_tiers = podcast.access_tiers;
      if (podcast.support_pdf_url !== undefined) updateData.support_pdf_url = podcast.support_pdf_url;

      // Gérer les CTA buttons avec validation
      if (podcast.ctaButton !== undefined) {
        if (podcast.ctaButton && podcast.ctaButton.enabled && podcast.ctaButton.text && podcast.ctaButton.url) {
          updateData.cta_button = podcast.ctaButton;
        } else {
          updateData.cta_button = null;
        }
      }

      if (podcast.ctaButton2 !== undefined) {
        if (podcast.ctaButton2 && podcast.ctaButton2.enabled && podcast.ctaButton2.text && podcast.ctaButton2.url) {
          updateData.cta_button2 = podcast.ctaButton2;
        } else {
          updateData.cta_button2 = null;
        }
      }

      const { error } = await supabase
        .from('podcasts')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la mise à jour du podcast:', error);
        throw new Error(`Erreur lors de la mise à jour du podcast: ${error.message}`);
      }

      await loadPodcasts();
    } catch (error) {
      console.error('Erreur dans updatePodcast:', error);
      throw error;
    }
  };

  const deletePodcast = async (id: string) => {
    if (!isSupabaseConfigured) {
      setPodcasts(prev => prev.filter(p => p.id !== id));
      return;
    }

    const { error } = await supabase
      .from('podcasts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression du podcast:', error);
      throw error;
    }

    await loadPodcasts();
  };

  // Fonction pour obtenir un plan de repas par date
  const getMealPlanByDate = async (userId: string, date: string): Promise<MealPlan | null> => {
    if (!isSupabaseConfigured) {
      return mealPlans.find(plan => plan.userId === userId && plan.date === date) || null;
    }

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();

      if (error) {
        console.error('Erreur lors de la récupération du plan de repas:', error);
        return null;
      }

      if (!data) {
        // Aucun résultat trouvé
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        date: data.date,
        meals: data.meals || {}
      };
    } catch (error) {
      console.error('Erreur lors de la récupération du plan de repas:', error);
      return null;
    }
  };

  // Fonctions simplifiées pour les autres opérations
  const addMealPlan = async (mealPlan: Omit<MealPlan, 'id'>) => {
    if (!isSupabaseConfigured) {
      const newMealPlan: MealPlan = {
        ...mealPlan,
        id: Date.now().toString()
      };

      setMealPlans(prev => {
        const existingIndex = prev.findIndex(plan =>
          plan.userId === mealPlan.userId && plan.date === mealPlan.date
        );

        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = newMealPlan;
          return updated;
        } else {
          return [newMealPlan, ...prev];
        }
      });

      return;
    }

    const { error } = await supabase
      .from('meal_plans')
      .upsert({
        user_id: mealPlan.userId,
        date: mealPlan.date,
        meals: mealPlan.meals
      });

    if (error) {
      console.error('Erreur lors de l\'ajout du plan de repas:', error);
      throw error;
    }

    await loadMealPlans();

    setMealPlans(prev => [...prev]);
  };

  const updateMealPlan = async (id: string, mealPlan: Partial<MealPlan>) => {
    if (!isSupabaseConfigured) {
      setMealPlans(prev => prev.map(mp => mp.id === id ? { ...mp, ...mealPlan } : mp));
      return;
    }

    const updateData: any = {};
    
    if (mealPlan.date !== undefined) updateData.date = mealPlan.date;
    if (mealPlan.meals !== undefined) updateData.meals = mealPlan.meals;

    const { error } = await supabase
      .from('meal_plans')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la mise à jour du plan de repas:', error);
      throw error;
    }

    await loadMealPlans();
  };

  const addWeightEntry = async (entry: Omit<WeightEntry, 'id'>) => {
    if (!isSupabaseConfigured) {
      const newEntry: WeightEntry = {
        ...entry,
        id: Date.now().toString()
      };
      setWeightEntries(prev => [newEntry, ...prev]);
      return;
    }

    const { error } = await supabase
      .from('weight_entries')
      .insert({
        user_id: entry.userId,
        weight: entry.weight,
        date: entry.date,
        measurements: entry.measurements
      });

    if (error) {
      console.error('Erreur lors de l\'ajout de l\'entrée de poids:', error);
      throw error;
    }

    await loadWeightEntries();
  };

  const updateWeightEntry = async (id: string, entry: Partial<Omit<WeightEntry, 'id' | 'userId'>>) => {
    if (!isSupabaseConfigured) {
      setWeightEntries(prev => prev.map(e =>
        e.id === id ? { ...e, ...entry } : e
      ));
      return;
    }

    const { error } = await supabase
      .from('weight_entries')
      .update({
        weight: entry.weight,
        date: entry.date,
        measurements: entry.measurements
      })
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la mise à jour de l\'entrée de poids:', error);
      throw error;
    }

    await loadWeightEntries();
  };

  const deleteWeightEntry = async (id: string) => {
    if (!isSupabaseConfigured) {
      setWeightEntries(prev => prev.filter(e => e.id !== id));
      return;
    }

    const { error } = await supabase
      .from('weight_entries')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur lors de la suppression de l\'entrée de poids:', error);
      throw error;
    }

    await loadWeightEntries();
  };

  const toggleFavorite = async (recipeId: string) => {
    if (!user) return;

    const isFavorite = favorites.includes(recipeId);

    if (!isSupabaseConfigured) {
      if (isFavorite) {
        setFavorites(prev => prev.filter(id => id !== recipeId));
      } else {
        setFavorites(prev => [...prev, recipeId]);
      }
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipeId);

      if (error) {
        console.error('Erreur lors de la suppression du favori:', error);
        return;
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: user.id,
          recipe_id: recipeId
        });

      if (error) {
        console.error('Erreur lors de l\'ajout du favori:', error);
        return;
      }
    }

    await loadFavorites();
  };

  const updateShoppingList = async (items: ShoppingItem[]) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      setShoppingList(items);
      return;
    }

    try {
      // Supprimer tous les articles existants
      await supabase
        .from('shopping_items')
        .delete()
        .eq('user_id', user.id);

      // Ajouter les nouveaux articles
      if (items.length > 0) {
        const { error } = await supabase
          .from('shopping_items')
          .insert(
            items.map(item => ({
              user_id: user.id,
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              category: item.category,
              checked: item.checked
            }))
          );

        if (error) {
          console.error('Erreur lors de la mise à jour de la liste de courses:', error);
          throw error;
        }
      }

      await loadShoppingList();
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la liste de courses:', error);
      throw error;
    }
  };

  const generateShoppingList = async (userId: string, weekStart?: string) => {
    let userMealPlans = mealPlans.filter(plan => plan.userId === userId);

    if (weekStart) {
      const weekStartDate = new Date(weekStart);
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekEndDate.getDate() + 6);

      userMealPlans = userMealPlans.filter(plan => {
        const planDate = new Date(plan.date);
        return planDate >= weekStartDate && planDate <= weekEndDate;
      });
    }
    
    const ingredients: { [key: string]: ShoppingItem } = {};

    userMealPlans.forEach(plan => {
      Object.values(plan.meals).forEach(recipeId => {
        if (recipeId) {
          const recipe = recipes.find(r => r.id === recipeId);
          if (recipe) {
            recipe.ingredients.forEach(ingredient => {
              const key = `${ingredient.name}-${ingredient.unit}`;
              if (ingredients[key]) {
                ingredients[key].quantity += ingredient.quantity;
              } else {
                ingredients[key] = {
                  id: generateUUID(),
                  name: ingredient.name,
                  quantity: ingredient.quantity,
                  unit: ingredient.unit,
                  category: ingredient.category,
                  checked: false
                };
              }
            });
          }
        }
      });
    });

    const shoppingItems = Object.values(ingredients);
    await updateShoppingList(shoppingItems);
  };

  const updateWeeklyProgress = async (userId: string, goalId: string, dayIndex: number, completed: boolean) => {
    if (!user) return;

    const weekStart = getWeekStart();
    let progress = weeklyProgress.find(p => p.userId === userId && p.weekStart === weekStart);

    if (!isSupabaseConfigured) {
      if (!progress) {
        const newGoals: any = {};
        weeklyGoals.forEach(goal => {
          if (goal.type === 'daily') {
            newGoals[goal.id] = {
              completed: [false, false, false, false, false, false, false]
            };
          } else {
            newGoals[goal.id] = {
              completed: [],
              weeklyCompleted: false
            };
          }
        });

        newGoals[goalId].completed[dayIndex] = completed;

        const newProgress: WeeklyProgress = {
          id: Date.now().toString(),
          userId,
          weekStart,
          goals: newGoals
        };

        setWeeklyProgress(prev => [newProgress, ...prev]);
      } else {
        const updatedGoals = { ...progress.goals };
        if (!updatedGoals[goalId]) {
          updatedGoals[goalId] = { completed: [false, false, false, false, false, false, false] };
        }
        updatedGoals[goalId].completed[dayIndex] = completed;

        setWeeklyProgress(prev => prev.map(p => 
          p.id === progress!.id ? { ...p, goals: updatedGoals } : p
        ));
      }
      return;
    }

    if (!progress) {
      // Créer un nouveau progrès
      const newGoals: any = {};
      weeklyGoals.forEach(goal => {
        if (goal.type === 'daily') {
          newGoals[goal.id] = {
            completed: [false, false, false, false, false, false, false]
          };
        } else {
          newGoals[goal.id] = {
            completed: [],
            weeklyCompleted: false
          };
        }
      });

      newGoals[goalId].completed[dayIndex] = completed;

      const { error } = await supabase
        .from('weekly_progress')
        .insert({
          user_id: userId,
          week_start: weekStart,
          goals: newGoals
        });

      if (error) {
        console.error('Erreur lors de la création du progrès hebdomadaire:', error);
        return;
      }
    } else {
      // Mettre à jour le progrès existant
      const updatedGoals = { ...progress.goals };
      if (!updatedGoals[goalId]) {
        updatedGoals[goalId] = { completed: [false, false, false, false, false, false, false] };
      }
      updatedGoals[goalId].completed[dayIndex] = completed;

      const { error } = await supabase
        .from('weekly_progress')
        .update({ goals: updatedGoals })
        .eq('id', progress.id);

      if (error) {
        console.error('Erreur lors de la mise à jour du progrès hebdomadaire:', error);
        return;
      }
    }

    await loadWeeklyProgress();
  };

  const updateWeeklyGoal = async (userId: string, goalId: string, completed: boolean) => {
    if (!user) return;

    const weekStart = getWeekStart();
    let progress = weeklyProgress.find(p => p.userId === userId && p.weekStart === weekStart);

    if (!isSupabaseConfigured) {
      if (!progress) {
        const newGoals: any = {};
        weeklyGoals.forEach(goal => {
          if (goal.type === 'daily') {
            newGoals[goal.id] = {
              completed: [false, false, false, false, false, false, false]
            };
          } else {
            newGoals[goal.id] = {
              completed: [],
              weeklyCompleted: false
            };
          }
        });

        newGoals[goalId].weeklyCompleted = completed;

        const newProgress: WeeklyProgress = {
          id: Date.now().toString(),
          userId,
          weekStart,
          goals: newGoals
        };

        setWeeklyProgress(prev => [newProgress, ...prev]);
      } else {
        const updatedGoals = { ...progress.goals };
        if (!updatedGoals[goalId]) {
          updatedGoals[goalId] = { completed: [], weeklyCompleted: false };
        }
        updatedGoals[goalId].weeklyCompleted = completed;

        setWeeklyProgress(prev => prev.map(p => 
          p.id === progress!.id ? { ...p, goals: updatedGoals } : p
        ));
      }
      return;
    }

    if (!progress) {
      // Créer un nouveau progrès
      const newGoals: any = {};
      weeklyGoals.forEach(goal => {
        if (goal.type === 'daily') {
          newGoals[goal.id] = {
            completed: [false, false, false, false, false, false, false]
          };
        } else {
          newGoals[goal.id] = {
            completed: [],
            weeklyCompleted: false
          };
        }
      });

      newGoals[goalId].weeklyCompleted = completed;

      const { error } = await supabase
        .from('weekly_progress')
        .insert({
          user_id: userId,
          week_start: weekStart,
          goals: newGoals
        });

      if (error) {
        console.error('Erreur lors de la création du progrès hebdomadaire:', error);
        return;
      }
    } else {
      // Mettre à jour le progrès existant
      const updatedGoals = { ...progress.goals };
      if (!updatedGoals[goalId]) {
        updatedGoals[goalId] = { completed: [], weeklyCompleted: false };
      }
      updatedGoals[goalId].weeklyCompleted = completed;

      const { error } = await supabase
        .from('weekly_progress')
        .update({ goals: updatedGoals })
        .eq('id', progress.id);

      if (error) {
        console.error('Erreur lors de la mise à jour du progrès hebdomadaire:', error);
        return;
      }
    }

    await loadWeeklyProgress();
  };

  // Obtenir les badges d'un utilisateur
  const getUserBadges = (userId: string): Badge[] => {
    const userProgress = weeklyProgress.filter(p => p.userId === userId);
    const earnedBadgeIds = new Set<string>();

    userProgress.forEach(progress => {
      if (progress.badgeEarned) {
        earnedBadgeIds.add(progress.badgeEarned);
      }
    });

    return badges.filter(badge => earnedBadgeIds.has(badge.id));
  };

  const sendMessage = async (message: Omit<Message, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (!isSupabaseConfigured) {
        const newMessage: Message = {
          id: generateUUID(),
          ...message,
          status: 'new',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setMessages(prev => [newMessage, ...prev]);
        return;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          user_id: message.userId,
          user_name: message.userName,
          user_email: message.userEmail,
          subject: message.subject,
          message: message.message,
          priority: message.priority,
          status: 'new'
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const newMessage: Message = {
          id: data.id,
          userId: data.user_id,
          userName: data.user_name,
          userEmail: data.user_email,
          subject: data.subject,
          message: data.message,
          status: data.status,
          priority: data.priority,
          adminResponse: data.admin_response,
          adminId: data.admin_id,
          respondedAt: data.responded_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        setMessages(prev => [newMessage, ...prev]);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw error;
    }
  };

  const updateMessage = async (id: string, updates: Partial<Message>) => {
    try {
      if (!isSupabaseConfigured) {
        setMessages(prev => prev.map(msg =>
          msg.id === id ? { ...msg, ...updates, updatedAt: new Date().toISOString() } : msg
        ));
        return;
      }

      const updateData: any = {};
      if (updates.status) updateData.status = updates.status;
      if (updates.adminResponse !== undefined) updateData.admin_response = updates.adminResponse;
      if (updates.adminId) updateData.admin_id = updates.adminId;
      if (updates.respondedAt) updateData.responded_at = updates.respondedAt;

      const { data, error } = await supabase
        .from('messages')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedMessage: Message = {
          id: data.id,
          userId: data.user_id,
          userName: data.user_name,
          userEmail: data.user_email,
          subject: data.subject,
          message: data.message,
          status: data.status,
          priority: data.priority,
          adminResponse: data.admin_response,
          adminId: data.admin_id,
          respondedAt: data.responded_at,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        };
        setMessages(prev => prev.map(msg => msg.id === id ? updatedMessage : msg));
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du message:', error);
      throw error;
    }
  };

  return (
    <DataContext.Provider value={{
      recipes,
      podcasts,
      mealPlans,
      weightEntries,
      shoppingList,
      favorites,
      weeklyGoals,
      weeklyProgress,
      badges,
      messages,
      addRecipe,
      updateRecipe,
      deleteRecipe,
      addPodcast,
      updatePodcast,
      deletePodcast,
      addMealPlan,
      updateMealPlan,
      getMealPlanByDate,
      addWeightEntry,
      updateWeightEntry,
      deleteWeightEntry,
      toggleFavorite,
      updateShoppingList,
      generateShoppingList,
      updateWeeklyProgress,
      updateWeeklyGoal,
      getCurrentWeekProgress,
      getUserBadges,
      uploadPodcastAudio,
      uploadRecipeImage,
      uploadPodcastImage,
      uploadPodcastPdf,
      updatePodcastOrder,
      sendMessage,
      updateMessage,
      isLoading
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}