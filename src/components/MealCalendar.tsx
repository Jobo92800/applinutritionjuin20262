import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Filter, Zap } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import RecipeModal from './RecipeModal';
import { calculateNutritionTargets, getNutritionRecommendations } from '../utils/nutritionCalculator';

export default function MealCalendar() {
  const { recipes, mealPlans, addMealPlan, updateMealPlan } = useData();
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedMeal, setSelectedMeal] = useState<{ date: string; meal: string; subMeal: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<any>(null);
  const [selectedRecipeForPlanning, setSelectedRecipeForPlanning] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Calculer les recommandations nutritionnelles personnalisées
  const userNutritionTargets = React.useMemo(() => {
    if (!user) {
      return null;
    }
    
    // Utiliser des valeurs par défaut si le profil n'existe pas encore
    const profile = user.profile || {};
    
    const targets = getNutritionRecommendations({
      gender: profile.gender || 'homme',
      age: profile.age || '18-30',
      activityLevel: profile.activityLevel || 'moderee',
      metabolism: profile.metabolism || 'normal'
    });
    
    return targets;
  }, [user]);

  // Forcer le rafraîchissement quand les meal plans changent
  React.useEffect(() => {
    setRefreshKey(prev => prev + 1);
  }, [mealPlans]);

  // Recharger les données quand l'utilisateur change
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        setCurrentWeek(prev => new Date(prev));
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const mealTypes = [
    { 
      key: 'petit-déjeuner', 
      name: 'Petit-déjeuner', 
      color: 'bg-yellow-100 text-yellow-800', 
      shortName: 'P-déj', 
      emoji: '🌅',
      subMeals: [
        { key: 'principal', name: 'Principal', shortName: 'Princ.' },
        { key: 'complement', name: 'Complément', shortName: 'Compl.' }
      ]
    },
    { 
      key: 'déjeuner', 
      name: 'Déjeuner', 
      color: 'bg-blue-100 text-blue-800', 
      shortName: 'Déj', 
      emoji: '🍽️',
      subMeals: [
        { key: 'entree', name: 'Entrée', shortName: 'Ent.' },
        { key: 'plat', name: 'Plat', shortName: 'Plat' },
        { key: 'dessert', name: 'Dessert', shortName: 'Dess.' }
      ]
    },
    { 
      key: 'dîner', 
      name: 'Dîner', 
      color: 'bg-purple-100 text-purple-800', 
      shortName: 'Dîner', 
      emoji: '🌙',
      subMeals: [
        { key: 'entree', name: 'Entrée', shortName: 'Ent.' },
        { key: 'plat', name: 'Plat', shortName: 'Plat' },
        { key: 'dessert', name: 'Dessert', shortName: 'Dess.' }
      ]
    },
    { 
      key: 'collation', 
      name: 'Collation', 
      color: 'bg-green-100 text-green-800', 
      shortName: 'Coll', 
      emoji: '🍎',
      subMeals: [
        { key: 'matin', name: 'Matin', shortName: 'Mat.' },
        { key: 'apres-midi', name: 'Après-midi', shortName: 'A-M' }
      ]
    }
  ];

  // Catégories de repas disponibles
  const categories = [
    { key: 'Petit-déjeuner', name: '🌅 Petit-déjeuner', icon: '🌅' },
    { key: 'Déjeuner', name: '🍽️ Déjeuner', icon: '🍽️' },
    { key: 'Dîner', name: '🌙 Dîner', icon: '🌙' },
    { key: 'Collation', name: '🍎 Collation', icon: '🍎' },
    { key: 'Entrée', name: '🥗 Entrée', icon: '🥗' },
    { key: 'Plat principal', name: '🍖 Plat principal', icon: '🍖' },
    { key: 'Dessert', name: '🍰 Dessert', icon: '🍰' }
  ];

  const getWeekDays = (date: Date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Start on Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const weekDays = getWeekDays(currentWeek);

  const getMealForDay = (date: string, mealType: string, subMeal: string) => {
    const plan = mealPlans.find(
      plan => plan.date === date && plan.userId === user?.id
    );
    const mealKey = `${mealType}_${subMeal}`;
    return plan?.meals[mealKey as keyof typeof plan.meals];
  };

  const getMealPlanForDate = useCallback((date: string): MealPlan | null => {
    const plan = mealPlans.find(plan =>
      plan.userId === user?.id && plan.date === date
    );
    return plan || null;
  }, [mealPlans, user?.id]);

  const getRecipeById = (id: string) => {
    if (id.includes('_variant_')) {
      const [recipeId, , variantId] = id.split('_');
      const recipe = recipes.find(r => r.id === recipeId);

      if (recipe) {
        if (recipe.variants) {
          let variant = recipe.variants.find(v => v.id === variantId);

          if (!variant) {
            const variantIndex = parseInt(variantId);
            if (!isNaN(variantIndex) && variantIndex < recipe.variants.length) {
              variant = recipe.variants[variantIndex];
            }
          }

          if (variant) {
            return {
              ...recipe,
              id: id,
              title: `${recipe.title} (${variant.name})`,
              ingredients: variant.ingredients || recipe.ingredients,
              steps: variant.steps || recipe.steps,
              nutrition: {
                calories: variant.targetCalories || variant.nutrition?.calories || recipe.nutrition.calories,
                protein: variant.nutrition?.protein || recipe.nutrition.protein,
                carbs: variant.nutrition?.carbs || recipe.nutrition.carbs,
                fat: variant.nutrition?.fat || recipe.nutrition.fat
              }
            };
          }
        }
      }
    }

    return recipes.find(recipe => recipe.id === id);
  };

  // Filtrer les recettes selon la catégorie sélectionnée et le terme de recherche
  const filteredRecipes = recipes.filter(recipe => {
    const matchesCategory = !selectedCategory || (recipe.categories && recipe.categories.includes(selectedCategory));
    const matchesSearch = !searchTerm || 
      (recipe.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (recipe.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  // Réinitialiser les filtres quand on ferme le modal
  const resetFilters = () => {
    setSelectedCategory('');
    setSearchTerm('');
  };

  // Fonction pour calculer les valeurs nutritionnelles d'une journée
  const calculateDayNutrition = (dateStr: string) => {
    const dayNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    mealTypes.forEach(mealType => {
      mealType.subMeals.forEach(subMeal => {
        const recipeId = getMealForDay(dateStr, mealType.key, subMeal.key);
        if (recipeId) {
          const recipe = getRecipeById(recipeId);
          if (recipe && recipe.nutrition) {
            dayNutrition.calories += recipe.nutrition.calories || 0;
            dayNutrition.protein += recipe.nutrition.protein || 0;
            dayNutrition.carbs += recipe.nutrition.carbs || 0;
            dayNutrition.fat += recipe.nutrition.fat || 0;
          }
        }
      });
    });

    return dayNutrition;
  };

  // Fonction pour calculer les valeurs nutritionnelles d'un repas complet
  const calculateMealNutrition = (dateStr: string, mealType: string) => {
    const mealNutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    const meal = mealTypes.find(m => m.key === mealType);
    if (meal) {
      meal.subMeals.forEach(subMeal => {
        const recipeId = getMealForDay(dateStr, mealType, subMeal.key);
        if (recipeId) {
          const recipe = getRecipeById(recipeId);
          if (recipe && recipe.nutrition) {
            mealNutrition.calories += recipe.nutrition.calories || 0;
            mealNutrition.protein += recipe.nutrition.protein || 0;
            mealNutrition.carbs += recipe.nutrition.carbs || 0;
            mealNutrition.fat += recipe.nutrition.fat || 0;
          }
        }
      });
    }

    return mealNutrition;
  };

  const assignRecipeToMeal = (recipeId: string) => {
    if (!selectedMeal || !user) return;

    const finalRecipeId = selectedVariant ? `${recipeId}_variant_${selectedVariant.id || selectedVariant.name || '0'}` : recipeId;

    const existingPlan = mealPlans.find(
      plan => plan.date === selectedMeal.date && plan.userId === user.id
    );

    const mealKey = `${selectedMeal.meal}_${selectedMeal.subMeal}`;

    if (existingPlan) {
      updateMealPlan(existingPlan.id, {
        meals: {
          ...existingPlan.meals,
          [mealKey]: finalRecipeId
        }
      });
    } else {
      addMealPlan({
        userId: user.id,
        date: selectedMeal.date,
        meals: {
          [mealKey]: finalRecipeId
        }
      });
    }

    setSelectedMeal(null);
    setSelectedRecipeForPlanning(null);
    setSelectedVariant(null);
    resetFilters();
    
    // Forcer un rafraîchissement
    setRefreshKey(prev => prev + 1);
  };

  // Nouvelle fonction pour assigner une recette avec une variante spécifique
  const assignRecipeToMealWithVariant = (recipeId: string, variant?: any) => {
    if (!selectedMeal || !user) return;

    const finalRecipeId = variant ? `${recipeId}_variant_${variant.id || variant.name || '0'}` : recipeId;

    const existingPlan = mealPlans.find(
      plan => plan.date === selectedMeal.date && plan.userId === user.id
    );

    const mealKey = `${selectedMeal.meal}_${selectedMeal.subMeal}`;

    if (existingPlan) {
      updateMealPlan(existingPlan.id, {
        meals: {
          ...existingPlan.meals,
          [mealKey]: finalRecipeId
        }
      });
    } else {
      addMealPlan({
        userId: user.id,
        date: selectedMeal.date,
        meals: {
          [mealKey]: finalRecipeId
        }
      });
    }

    setSelectedMeal(null);
    setSelectedRecipeForPlanning(null);
    setSelectedVariant(null);
    resetFilters();
    
    // Forcer un rafraîchissement
    setRefreshKey(prev => prev + 1);
  };

  const removeRecipeFromMeal = (date: string, mealType: string, subMeal: string) => {
    if (!user) return;

    const existingPlan = mealPlans.find(
      plan => plan.date === date && plan.userId === user.id
    );

    if (existingPlan) {
      const mealKey = `${mealType}_${subMeal}`;
      const updatedMeals = { ...existingPlan.meals };
      delete updatedMeals[mealKey as keyof typeof updatedMeals];
      
      updateMealPlan(existingPlan.id, {
        meals: updatedMeals
      });
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  };

  const closeModal = () => {
    setSelectedMeal(null);
    setSelectedRecipeForPlanning(null);
    setSelectedVariant(null);
    resetFilters();
  };

  const handleRecipeClick = (recipeId: string) => {
    const recipe = getRecipeById(recipeId);
    if (recipe) {
      setSelectedRecipe(recipe);
    }
  };

  // Suggérer automatiquement la catégorie appropriée selon le type de repas
  useEffect(() => {
    if (selectedMeal) {
      const mealTypeToCategory: { [key: string]: string } = {
        'petit-déjeuner': 'Petit-déjeuner',
        'déjeuner': 'Déjeuner',
        'dîner': 'Dîner',
        'collation': 'Collation'
      };
      
      const suggestedCategory = mealTypeToCategory[selectedMeal.meal];
      if (suggestedCategory) {
        setSelectedCategory(suggestedCategory);
      }
    }
  }, [selectedMeal]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Calendrier des repas</h1>
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-medium text-gray-700 text-sm sm:text-base text-center min-w-[140px]">
            Semaine du {weekDays[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
          </span>
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Modal de sélection de recette */}
      {selectedMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Choisir une recette pour {mealTypes.find(m => m.key === selectedMeal.meal)?.name} - {mealTypes.find(m => m.key === selectedMeal.meal)?.subMeals.find(s => s.key === selectedMeal.subMeal)?.name}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Filtres */}
              <div className="mt-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Rechercher une recette..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex-1">
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Toutes les catégories</option>
                      {categories.map(category => (
                        <option key={category.key} value={category.key}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    onClick={() => {
                      if (recipe.variants && recipe.variants.length > 0) {
                        setSelectedRecipeForPlanning(recipe);
                      } else {
                        assignRecipeToMeal(recipe.id);
                      }
                    }}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-32 object-cover"
                    />
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-800 mb-2">{recipe.title}</h3>
                        {recipe.variants && recipe.variants.length > 0 && (
                          <div className="flex items-center space-x-1 text-orange-600">
                            <Zap className="w-4 h-4" />
                            <span className="text-xs font-medium">{recipe.variants.length}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{recipe.description}</p>
                      {recipe.nutrition && (
                        <div className="mt-2 flex justify-between text-xs text-gray-500">
                          <span>{recipe.nutrition.calories} kcal</span>
                          <span>{recipe.prepTime} min</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {filteredRecipes.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune recette trouvée avec ces critères.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de sélection de variante */}
      {selectedRecipeForPlanning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">
                  Choisir une variante - {selectedRecipeForPlanning.title}
                </h2>
                <button
                  onClick={() => {
                    setSelectedRecipeForPlanning(null);
                    setSelectedVariant(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Créer un tableau avec la recette originale et les variantes, puis trier par calories */}
                {[
                  {
                    id: 'original',
                    name: 'Version originale',
                    nutrition: selectedRecipeForPlanning.nutrition,
                    adjustments: 'Recette de base',
                    isOriginal: true
                  },
                  ...(selectedRecipeForPlanning.variants || []).map((variant: any) => ({
                    ...variant,
                    isOriginal: false
                  }))
                ]
                .sort((a, b) => a.nutrition.calories - b.nutrition.calories)
                .map((variant, index) => (
                  <button
                    key={variant.id}
                    onClick={() => {
                      if (variant.isOriginal) {
                        assignRecipeToMeal(selectedRecipeForPlanning.id);
                      } else {
                        assignRecipeToMealWithVariant(selectedRecipeForPlanning.id, variant);
                      }
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      variant.isOriginal 
                        ? 'hover:border-green-300 hover:bg-green-50' 
                        : 'hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <img
                        src={selectedRecipeForPlanning.image}
                        alt={selectedRecipeForPlanning.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div>
                        <h3 className="font-medium text-gray-800">{variant.name}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {variant.isOriginal ? variant.adjustments : variant.adjustments}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-orange-600">{variant.nutrition.calories}</div>
                        <div className="text-xs text-gray-600">kcal</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-bold text-blue-600">{variant.nutrition.protein}g</div>
                        <div className="text-xs text-gray-600">protéines</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-8 border-b border-gray-200">
          <div className="p-4 bg-gray-50 font-medium text-gray-700">Repas</div>
          {weekDays.map((day, index) => (
            <div key={index} className="p-4 bg-gray-50 text-center">
              <div className="font-medium text-gray-700">
                {day.toLocaleDateString('fr-FR', { weekday: 'short' })}
              </div>
              <div className="text-sm text-gray-500">
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        {mealTypes.map((mealType) => (
          <div key={mealType.key} className="border-b border-gray-200 last:border-b-0">
            {/* En-tête du repas avec total des calories */}
            <div className="grid grid-cols-8 border-b border-gray-100">
              <div className={`p-3 font-medium ${mealType.color} flex items-center justify-between`}>
                <span className="flex items-center">
                  <span className="mr-2">{mealType.emoji}</span>
                  {mealType.name}
                </span>
              </div>
              {weekDays.map((day, dayIndex) => {
                const dateStr = formatDate(day);
                const mealNutrition = calculateMealNutrition(dateStr, mealType.key);
                
                return (
                  <div key={dayIndex} className="p-2 text-center border-l border-gray-200">
                    {mealNutrition.calories > 0 && (
                      <div className="text-xs font-bold text-orange-600">
                        {Math.round(mealNutrition.calories)} kcal
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sous-repas */}
            {mealType.subMeals.map((subMeal, subIndex) => (
              <div key={subMeal.key} className="grid grid-cols-8">
                <div className={`p-2 text-sm font-medium bg-gray-50 border-l-4 ${
                  subIndex === 0 ? 'border-blue-400' : subIndex === 1 ? 'border-green-400' : 'border-purple-400'
                } flex items-center`}>
                  <span className="ml-4">{subMeal.name}</span>
                </div>
                {weekDays.map((day, dayIndex) => {
                  const dateStr = formatDate(day);
                  const recipeId = getMealForDay(dateStr, mealType.key, subMeal.key);
                  const recipe = recipeId ? getRecipeById(recipeId) : null;

                  return (
                    <div key={dayIndex} className="p-2 min-h-[60px] border-l border-gray-200">
                      {recipe ? (
                        <div className="bg-gray-50 rounded-lg p-2 h-full group relative">
                          <button
                            onClick={() => removeRecipeFromMeal(dateStr, mealType.key, subMeal.key)}
                            className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div 
                            className="cursor-pointer"
                            onClick={() => handleRecipeClick(recipe.id)}
                          >
                            <img
                              src={recipe.image}
                              alt={recipe.title}
                              className="w-full h-6 object-cover rounded mb-1 hover:scale-105 transition-transform"
                            />
                            <p className="text-xs font-medium text-gray-800 line-clamp-2 hover:text-green-600 transition-colors">
                              {recipe.title}
                            </p>
                            {recipe.nutrition && (
                              <div className="text-xs text-gray-500 mt-1">
                                {recipe.nutrition.calories} kcal
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setSelectedMeal({ date: dateStr, meal: mealType.key, subMeal: subMeal.key })}
                          className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-green-400 hover:bg-green-50 transition-colors group"
                        >
                          <Plus className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        ))}

        {/* Ligne résumé nutritionnel */}
        <div className="grid grid-cols-8 border-t-2 border-gray-300 bg-gradient-to-r from-blue-50 to-green-50">
          <div className="p-4 font-semibold text-gray-800 flex items-center bg-gradient-to-r from-blue-100 to-green-100">
            <span className="text-lg mr-2">📊</span>
            Résumé nutritionnel
          </div>
          {weekDays.map((day, dayIndex) => {
            const dateStr = formatDate(day);
            const isToday = new Date().toDateString() === day.toDateString();
            const dayNutrition = calculateDayNutrition(dateStr);
            
            return (
              <div key={dayIndex} className={`p-2 border-l border-gray-200 ${isToday ? 'bg-green-100' : ''}`}>
                <div className="space-y-1">
                  {/* Calories */}
                  <div className="text-center bg-white rounded p-1">
                    <div className="text-sm font-bold text-orange-600">
                      {dayNutrition.calories > 0 ? Math.round(dayNutrition.calories) : '-'}
                    </div>
                    <div className="text-xs text-gray-500">🔥 kcal</div>
                  </div>
                  
                  {/* Macronutriments en grille */}
                  <div className="grid grid-cols-3 gap-1 text-xs">
                    <div className="text-center bg-white rounded p-1">
                      <div className="font-bold text-blue-600">
                        {dayNutrition.protein > 0 ? Math.round(dayNutrition.protein) : '-'}
                      </div>
                      <div className="text-xs text-gray-500">P</div>
                    </div>
                    <div className="text-center bg-white rounded p-1">
                      <div className="font-bold text-green-600">
                        {dayNutrition.carbs > 0 ? Math.round(dayNutrition.carbs) : '-'}
                      </div>
                      <div className="text-xs text-gray-500">G</div>
                    </div>
                    <div className="text-center bg-white rounded p-1">
                      <div className="font-bold text-purple-600">
                        {dayNutrition.fat > 0 ? Math.round(dayNutrition.fat) : '-'}
                      </div>
                      <div className="text-xs text-gray-500">L</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid - Mobile */}
      <div className="lg:hidden space-y-4">
        {weekDays.map((day, dayIndex) => {
          const dateStr = formatDate(day);
          const isToday = new Date().toDateString() === day.toDateString();
          const dayNutrition = calculateDayNutrition(dateStr);
          
          return (
            <div key={dayIndex} className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${isToday ? 'ring-2 ring-green-500' : ''}`}>
              {/* En-tête du jour */}
              <div className={`p-4 border-b border-gray-200 ${isToday ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {day.toLocaleDateString('fr-FR', { weekday: 'long' })}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  {isToday && (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      Aujourd'hui
                    </span>
                  )}
                </div>
              </div>

              {/* Repas du jour */}
              <div className="p-4">
                <div className="space-y-4">
                  {mealTypes.map((mealType) => {
                    const mealNutrition = calculateMealNutrition(dateStr, mealType.key);

                    return (
                      <div key={mealType.key} className="space-y-2">
                        {/* En-tête du repas avec calories totales */}
                        <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${mealType.color}`}>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{mealType.emoji}</span>
                            <span className="text-sm font-medium">{mealType.name}</span>
                          </div>
                          {mealNutrition.calories > 0 && (
                            <span className="text-xs font-bold text-orange-600">
                              {Math.round(mealNutrition.calories)} kcal
                            </span>
                          )}
                        </div>
                        
                        {/* Sous-repas en grille */}
                        <div className={`grid gap-2 ${mealType.key === 'déjeuner' || mealType.key === 'dîner' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                          {mealType.subMeals.map((subMeal) => {
                            const recipeId = getMealForDay(dateStr, mealType.key, subMeal.key);
                            const recipe = recipeId ? getRecipeById(recipeId) : null;

                            return (
                              <div key={subMeal.key} className="space-y-1">
                                <div className="text-xs font-medium text-gray-600 text-center">
                                  {subMeal.name}
                                </div>
                                
                                {recipe ? (
                                  <div className="bg-gray-50 rounded-lg p-2 group relative">
                                    <button
                                      onClick={() => removeRecipeFromMeal(dateStr, mealType.key, subMeal.key)}
                                      className="absolute top-1 right-1 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                    >
                                      <X className="w-2 h-2" />
                                    </button>
                                    <div 
                                      className="cursor-pointer"
                                      onClick={() => handleRecipeClick(recipe.id)}
                                    >
                                      <img
                                        src={recipe.image}
                                        alt={recipe.title}
                                        className="w-full h-12 object-cover rounded mb-1 hover:scale-105 transition-transform"
                                      />
                                      <p className="text-xs font-medium text-gray-800 line-clamp-2 hover:text-green-600 transition-colors">
                                        {recipe.title}
                                      </p>
                                      {recipe.nutrition && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          {recipe.nutrition.calories} kcal
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setSelectedMeal({ date: dateStr, meal: mealType.key, subMeal: subMeal.key })}
                                    className="w-full h-16 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-green-400 hover:bg-green-50 transition-colors group"
                                  >
                                    <Plus className="w-3 h-3 text-gray-400 group-hover:text-green-500 mb-1" />
                                    <span className="text-xs text-gray-500 group-hover:text-green-600">Ajouter</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Résumé nutritionnel du jour */}
              {dayNutrition.calories > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-green-50">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <span className="text-lg mr-2">📊</span>
                    Résumé nutritionnel
                  </h4>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-sm font-bold text-orange-600">{Math.round(dayNutrition.calories)}</div>
                      <div className="text-xs text-gray-500">kcal</div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-sm font-bold text-blue-600">{Math.round(dayNutrition.protein)}</div>
                      <div className="text-xs text-gray-500">P</div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-sm font-bold text-green-600">{Math.round(dayNutrition.carbs)}</div>
                      <div className="text-xs text-gray-500">G</div>
                    </div>
                    <div className="text-center bg-white rounded p-2">
                      <div className="text-sm font-bold text-purple-600">{Math.round(dayNutrition.fat)}</div>
                      <div className="text-xs text-gray-500">L</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Objectifs nutritionnels personnalisés */}
      {userNutritionTargets && user && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="text-xl mr-3">🎯</span>
              Vos objectifs nutritionnels personnalisés
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Basés sur votre profil : {(user.profile?.gender || 'homme') === 'homme' ? 'Homme' : 'Femme'}, {
                (user.profile?.age || '18-30') === '18-30' ? '18-30 ans' :
                (user.profile?.age || '18-30') === '31-50' ? '31-50 ans' :
                (user.profile?.age || '18-30') === '51+' ? '51+ ans' : (user.profile?.age || '18-30')
              }, activité {
                (user.profile?.activityLevel || 'moderee') === 'faible' ? 'faible' :
                (user.profile?.activityLevel || 'moderee') === 'moderee' ? 'modérée' :
                (user.profile?.activityLevel || 'moderee') === 'elevee' ? 'élevée' : (user.profile?.activityLevel || 'moderee')
              }, métabolisme {(user.profile?.metabolism || 'normal') === 'normal' ? 'normal' : 'ralenti'}
            </p>
          </div>
          
          <div className="p-4 lg:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {/* Calories cibles */}
              <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 lg:p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-xl lg:text-2xl">🔥</span>
                  </div>
                  <h4 className="text-sm lg:text-base font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">Calories</h4>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-orange-600">
                      {userNutritionTargets.dailyTargets.calories}
                    </div>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Fourchette:</span>
                    <span className="font-medium">{userNutritionTargets.ranges.calories.min}-{userNutritionTargets.ranges.calories.max}</span>
                  </div>
                </div>
              </div>

              {/* Protéines cibles */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 lg:p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xl lg:text-2xl">💪</span>
                  </div>
                  <h4 className="text-sm lg:text-base font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Protéines</h4>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-blue-600">
                      {userNutritionTargets.dailyTargets.protein}
                    </div>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Fourchette:</span>
                    <span className="font-medium">{userNutritionTargets.ranges.protein.min}-{userNutritionTargets.ranges.protein.max}g</span>
                  </div>
                </div>
              </div>

              {/* Glucides cibles */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 lg:p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-xl lg:text-2xl">🌾</span>
                  </div>
                  <h4 className="text-sm lg:text-base font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Glucides</h4>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-green-600">
                      {userNutritionTargets.dailyTargets.carbs}
                    </div>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Fourchette:</span>
                    <span className="font-medium">{userNutritionTargets.ranges.carbs.min}-{userNutritionTargets.ranges.carbs.max}g</span>
                  </div>
                </div>
              </div>

              {/* Lipides cibles */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 lg:p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-xl lg:text-2xl">🥑</span>
                  </div>
                  <h4 className="text-sm lg:text-base font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">Lipides</h4>
                  <div className="text-right">
                    <div className="text-xl lg:text-2xl font-bold text-purple-600">
                      {userNutritionTargets.dailyTargets.fat}
                    </div>
                  </div>
                </div>
                <div className="text-xs lg:text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Fourchette:</span>
                    <span className="font-medium">{userNutritionTargets.ranges.fat.min}-{userNutritionTargets.ranges.fat.max}g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tableau des moyennes nutritionnelles hebdomadaires - Desktop */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center">
            <span className="text-xl mr-3">📈</span>
            Moyennes nutritionnelles hebdomadaires
          </h3>
          <p className="text-sm text-gray-600 mt-1">Apports moyens par jour sur la semaine</p>
        </div>
        
        <div className="p-6">
          {(() => {
            // Calculer les totaux de la semaine
            let totalCalories = 0;
            let totalProtein = 0;
            let totalCarbs = 0;
            let totalFat = 0;
            let daysWithMeals = 0;

            weekDays.forEach(day => {
              const dateStr = formatDate(day);
              const dayNutrition = calculateDayNutrition(dateStr);
              
              if (dayNutrition.calories > 0) {
                totalCalories += dayNutrition.calories;
                totalProtein += dayNutrition.protein;
                totalCarbs += dayNutrition.carbs;
                totalFat += dayNutrition.fat;
                daysWithMeals++;
              }
            });

            const avgCalories = daysWithMeals > 0 ? totalCalories / daysWithMeals : 0;
            const avgProtein = daysWithMeals > 0 ? totalProtein / daysWithMeals : 0;
            const avgCarbs = daysWithMeals > 0 ? totalCarbs / daysWithMeals : 0;
            const avgFat = daysWithMeals > 0 ? totalFat / daysWithMeals : 0;

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Calories moyennes */}
                <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🔥</span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-700">Calories</h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600">
                        {avgCalories > 0 ? Math.round(avgCalories) : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total semaine:</span>
                      <span className="font-medium">{Math.round(totalCalories)} kcal</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Jours planifiés:</span>
                      <span className="font-medium">{daysWithMeals}/7</span>
                    </div>
                  </div>
                </div>
                {/* Protéines moyennes */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">💪</span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-700">Protéines</h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">
                        {avgProtein > 0 ? Math.round(avgProtein) : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total semaine:</span>
                      <span className="font-medium">{Math.round(totalProtein)} g</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Jours planifiés:</span>
                      <span className="font-medium">{daysWithMeals}/7</span>
                    </div>
                  </div>
                </div>

                {/* Glucides moyens */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🌾</span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-700">Glucides</h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">
                        {avgCarbs > 0 ? Math.round(avgCarbs) : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total semaine:</span>
                      <span className="font-medium">{Math.round(totalCarbs)} g</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Jours planifiés:</span>
                      <span className="font-medium">{daysWithMeals}/7</span>
                    </div>
                  </div>
                </div>

                {/* Lipides moyens */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🥑</span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-700">Lipides</h4>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-600">
                        {avgFat > 0 ? Math.round(avgFat) : '-'}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total semaine:</span>
                      <span className="font-medium">{Math.round(totalFat)} g</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span>Jours planifiés:</span>
                      <span className="font-medium">{daysWithMeals}/7</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          isOpen={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}