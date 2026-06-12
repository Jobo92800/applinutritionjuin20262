import React, { useState } from 'react';
import { Heart, Clock, Users, ChefHat, Search, Filter } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Recipe } from '../types';
import RecipeModal from './RecipeModal';

interface RecipeListProps {
  onRecipeSelect?: (recipe: Recipe) => void;
}

export default function RecipeList({ onRecipeSelect }: RecipeListProps) {
  const { recipes, favorites, toggleFavorite } = useData();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [selectedDietaryPreference, setSelectedDietaryPreference] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const categories = [...new Set(recipes.flatMap(recipe => recipe.categories || (recipe.category ? [recipe.category] : [])))];
  const difficulties = ['facile', 'moyen', 'difficile'];
  const dietaryPreferences = [
    'Végétarien',
    'Végan',
    'Sans gluten',
    'Sans lactose',
    'Sans féculent',
    'Super-aliments',
    'Robot de cuisine',
    'Air Fryer'
  ];

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = (recipe.title ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (recipe.description ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || (recipe.categories || []).includes(selectedCategory);
    const matchesDifficulty = !selectedDifficulty || recipe.difficulty === selectedDifficulty;
    const matchesDietaryPreference = !selectedDietaryPreference ||
                                   (recipe.dietaryPreferences && recipe.dietaryPreferences.includes(selectedDietaryPreference));

    return matchesSearch && matchesCategory && matchesDifficulty && matchesDietaryPreference;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'facile': return 'text-green-600 bg-green-100';
      case 'moyen': return 'text-yellow-600 bg-yellow-100';
      case 'difficile': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Petit-déjeuner': return 'text-yellow-700 bg-yellow-100';
      case 'Déjeuner': return 'text-blue-700 bg-blue-100';
      case 'Dîner': return 'text-purple-700 bg-purple-100';
      case 'Collation': return 'text-green-700 bg-green-100';
      default: return 'text-gray-700 bg-gray-100';
    }
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    onRecipeSelect?.(recipe);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Recettes</h1>
          <p className="text-gray-600 mt-2">{filteredRecipes.length} recettes disponibles</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="hidden md:block bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une recette..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Toutes les catégories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
          >
            <option value="">Toutes les difficultés</option>
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty} className="capitalize">{difficulty}</option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={selectedDietaryPreference}
            onChange={(e) => setSelectedDietaryPreference(e.target.value)}
          >
            <option value="">Toutes les préférences</option>
            {dietaryPreferences.map(preference => (
              <option key={preference} value={preference}>{preference}</option>
            ))}
          </select>
          <button className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtres</span>
          </button>
        </div>
      </div>

      {/* Mobile Search Only */}
      <div className="md:hidden bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une recette..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map((recipe) => (
          <div
            key={recipe.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleRecipeClick(recipe)}
          >
            <div className="relative">
              <img
                src={recipe.image}
                alt={recipe.title}
                className="w-full h-48 object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(recipe.id);
                }}
                className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-colors shadow-lg"
              >
                <Heart
                  className={`w-5 h-5 ${
                    favorites.includes(recipe.id)
                      ? 'text-red-500 fill-current'
                      : 'text-gray-600'
                  }`}
                />
              </button>
              <div className="absolute bottom-4 left-4 flex flex-wrap gap-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getDifficultyColor(recipe.difficulty)}`}>
                  {recipe.difficulty}
                </span>
                {(recipe.categories || []).map((category, index) => (
                  <span key={index} className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
                    {category}
                  </span>
                ))}
                {recipe.dietaryPreferences && recipe.dietaryPreferences.length > 0 && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    🌱 {recipe.dietaryPreferences.length} pref.
                  </span>
                )}
              </div>
            </div>

            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2 line-clamp-1">{recipe.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">{recipe.description ?? ''}</p>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.prepTime} min</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings} portions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ChefHat className="w-4 h-4" />
                  <span>{recipe.nutrition.calories} kcal</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-12">
          <ChefHat className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-500 mb-2">Aucune recette trouvée</h3>
          <p className="text-gray-400">Essayez de modifier vos critères de recherche</p>
        </div>
      )}

      {/* Recipe Modal */}
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
