import React, { useState } from 'react';
import { X, Clock, Users, ChefHat, Heart, Calendar, Plus, Zap } from 'lucide-react';
import { Recipe } from '../types';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

interface RecipeModalProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeModal({ recipe, isOpen, onClose }: RecipeModalProps) {
  const { favorites, toggleFavorite } = useData();
  const { user } = useAuth();
  const [showVariants, setShowVariants] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  if (!isOpen) return null;

  // Utiliser la variante sélectionnée ou la recette originale
  const currentRecipe = selectedVariant 
    ? { 
        ...recipe, 
        ingredients: selectedVariant.ingredients,
        nutrition: selectedVariant.nutrition,
        prepTime: selectedVariant.prepTime || recipe.prepTime,
        servings: selectedVariant.servings || recipe.servings,
        steps: selectedVariant.steps || recipe.steps
      }
    : recipe;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return 'text-green-600 bg-green-100';
      case 'moyen': return 'text-yellow-600 bg-yellow-100';
      case 'difficile': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'petit-déjeuner': return '🌅';
      case 'déjeuner': return '🍽️';
      case 'dîner': return '🌙';
      case 'collation': return '🍎';
      default: return '🍴';
    }
  };


  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header avec image */}
          <div className="relative h-64 md:h-80">
            <img
              src={recipe.image}
              alt={recipe.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            
            {/* Boutons en overlay */}
            <div className="absolute top-4 right-4 flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(recipe.id);
                }}
                className="p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
              >
                <Heart
                  className={`w-5 h-5 ${
                    favorites.includes(recipe.id)
                      ? 'text-red-500 fill-current'
                      : 'text-gray-600'
                  }`}
                />
              </button>
              <button
                onClick={onClose}
                className="p-3 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Titre et badges en overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/30" />
              <div className="relative z-10">
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${getDifficultyColor(recipe.difficulty)}`}>
                    {recipe.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                    {getCategoryIcon(recipe.categories[0] || '')} {recipe.categories[0] || 'Général'}
                  </span>
                  {recipe.dietaryPreferences && recipe.dietaryPreferences.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.dietaryPreferences.slice(0, 2).map((pref, index) => (
                        <span key={index} className="px-2 py-1 bg-green-500/20 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                          {pref}
                        </span>
                      ))}
                      {recipe.dietaryPreferences.length > 2 && (
                        <span className="px-2 py-1 bg-green-500/20 backdrop-blur-sm text-white rounded-full text-xs font-medium">
                          +{recipe.dietaryPreferences.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">{recipe.title}</h1>
                <p className="text-white/90 text-lg">{recipe.description}</p>
              </div>
            </div>
          </div>

          {/* Contenu scrollable */}
          <div className="overflow-y-auto max-h-[calc(90vh-320px)]">
            {/* Sélecteur de variantes */}
            {recipe.variants && recipe.variants.length > 0 && (
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-yellow-50">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <Zap className="w-5 h-5 text-orange-600 mr-2" />
                    Variantes disponibles
                  </h2>
                  <p className="text-sm text-gray-600">Choisissez une version adaptée à vos besoins caloriques</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Créer un tableau avec la recette originale et les variantes, puis trier par calories */}
                  {[
                    {
                      id: 'original',
                      name: 'Version originale',
                      nutrition: recipe.nutrition,
                      adjustments: 'Recette de base',
                      isOriginal: true
                    },
                    ...recipe.variants.map(variant => ({
                      ...variant,
                      isOriginal: false
                    }))
                  ]
                  .sort((a, b) => a.nutrition.calories - b.nutrition.calories)
                  .map((variant, index) => (
                    <button
                      key={variant.id}
                      onClick={() => setSelectedVariant(variant.isOriginal ? null : variant)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        (variant.isOriginal && !selectedVariant) || selectedVariant?.id === variant.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-800 mb-1">{variant.name}</div>
                      <div className="text-lg font-bold text-orange-600">{variant.nutrition.calories} kcal</div>
                      <div className="text-xs text-gray-600 line-clamp-2">
                        {variant.isOriginal ? variant.adjustments : variant.adjustments}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Stats rapides */}
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{currentRecipe.prepTime}</div>
                  <div className="text-sm text-gray-600">minutes</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{currentRecipe.servings}</div>
                  <div className="text-sm text-gray-600">portions</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <ChefHat className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{currentRecipe.nutrition.calories}</div>
                  <div className="text-sm text-gray-600">kcal</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <div className="w-6 h-6 bg-purple-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">P</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{currentRecipe.nutrition.protein}g</div>
                  <div className="text-sm text-gray-600">protéines</div>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Ingrédients */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">🥬</span>
                  </span>
                  Ingrédients
                </h2>
                <div className="space-y-3">
                  {currentRecipe.ingredients.map((ingredient, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-800">{ingredient.name}</span>
                      </div>
                      <span className="text-gray-600 font-medium">
                        {ingredient.quantity} {ingredient.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Étapes */}
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">📝</span>
                  </span>
                  Préparation
                </h2>
                <div className="space-y-4">
                  {currentRecipe.steps.map((step, index) => (
                    <div key={index} className="flex space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-gray-700 leading-relaxed">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Valeurs nutritionnelles */}
            <div className="p-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <span className="text-purple-600 text-sm">📊</span>
                </span>
                Valeurs nutritionnelles (par portion)
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg font-bold text-gray-800">{currentRecipe.nutrition.calories}</div>
                  <div className="text-sm text-gray-600">Calories</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg font-bold text-gray-800">{currentRecipe.nutrition.protein}g</div>
                  <div className="text-sm text-gray-600">Protéines</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg font-bold text-gray-800">{currentRecipe.nutrition.carbs}g</div>
                  <div className="text-sm text-gray-600">Glucides</div>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <div className="text-lg font-bold text-gray-800">{currentRecipe.nutrition.fat}g</div>
                  <div className="text-sm text-gray-600">Lipides</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
  );
}