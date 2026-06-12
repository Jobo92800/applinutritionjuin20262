import React from 'react';
import { Book, Headphones, Calendar, ShoppingCart, TrendingUp, Plus, Weight, Target } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import RecipeModal from './RecipeModal';
import { Recipe } from '../types';

interface DashboardProps {
  onPageChange: (page: string) => void;
}

export default function Dashboard({ onPageChange }: DashboardProps) {
  const { user } = useAuth();
  const { recipes, podcasts, mealPlans, weightEntries, addWeightEntry } = useData();
  const [selectedRecipe, setSelectedRecipe] = React.useState<Recipe | null>(null);
  const [showWeightModal, setShowWeightModal] = React.useState(false);
  const [newWeight, setNewWeight] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const currentWeekMealPlans = mealPlans.filter(plan => {
    const planDate = new Date(plan.date);
    const today = new Date();
    const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return planDate >= weekStart && planDate <= weekEnd && plan.userId === user?.id;
  });

  const userEntries = weightEntries
    .filter(entry => entry.userId === user?.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const recentWeightEntry = userEntries[userEntries.length - 1];
  const previousWeightEntry = userEntries[userEntries.length - 2];
  const weightChange = recentWeightEntry && previousWeightEntry ? recentWeightEntry.weight - previousWeightEntry.weight : 0;

  const weightGoal = user?.profile?.weightGoal || 70;
  const heightCm = user?.profile?.heightCm;
  const currentWeight = recentWeightEntry?.weight || user?.profile?.currentWeight || weightGoal;

  const hasProfileData = user?.profile?.weightGoal || user?.profile?.heightCm;

  const calculateIMC = (weight: number, heightCm?: number) => {
    const height = heightCm ? heightCm / 100 : 1.70;
    return (weight / (height * height)).toFixed(1);
  };

  const getIMCCategory = (imc: number) => {
    if (imc < 18.5) return { text: 'Insuffisance pondérale', color: 'text-blue-600' };
    if (imc < 25) return { text: 'Poids normal', color: 'text-green-600' };
    if (imc < 30) return { text: 'Surpoids', color: 'text-yellow-600' };
    return { text: 'Obésité', color: 'text-red-600' };
  };

  const handleAddWeight = async () => {
    if (!user || !newWeight || isSubmitting) return;

    const weight = parseFloat(newWeight);
    if (isNaN(weight) || weight <= 0 || weight > 500) {
      alert('Veuillez entrer un poids valide');
      return;
    }

    setIsSubmitting(true);
    try {
      await addWeightEntry({
        userId: user.id,
        weight: weight,
        date: new Date().toISOString().split('T')[0],
        measurements: {}
      });
      setNewWeight('');
      setShowWeightModal(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du poids:', error);
      alert('Une erreur s\'est produite lors de l\'ajout du poids');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickActions = [
    {
      title: 'Parcourir les recettes',
      description: `${recipes.length} recettes disponibles`,
      icon: Book,
      color: 'bg-blue-500',
      action: () => onPageChange('recipes')
    },
    {
      title: 'Écouter un podcast',
      description: `${podcasts.length} épisodes disponibles`,
      icon: Headphones,
      color: 'bg-purple-500',
      action: () => onPageChange('podcasts')
    },
    {
      title: 'Planifier mes repas',
      description: `${currentWeekMealPlans.length} repas planifiés cette semaine`,
      icon: Calendar,
      color: 'bg-green-500',
      action: () => onPageChange('calendar')
    },
    {
      title: 'Liste de courses',
      description: 'Gérer ma liste',
      icon: ShoppingCart,
      color: 'bg-orange-500',
      action: () => onPageChange('shopping')
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-2xl p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            Bonjour, {user?.name} ! 👋
          </h1>
          <p className="text-green-100 text-lg">
            Prêt à maintenir vos bonnes habitudes alimentaires ?
          </p>
          {user?.subscription_tier && user.subscription_tier !== 'user' && (
            <div className="mt-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
                ⭐ Abonnement {
                  user.subscription_tier === 'admin' ? 'Admin' :
                  user.subscription_tier === '1_month' ? '1 mois' :
                  user.subscription_tier === '3_month' ? '3 mois' :
                  user.subscription_tier === '6_month' ? '6 mois' : user.subscription_tier
                }
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Tracking Cards */}
      {hasProfileData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Suivi des progrès</h2>
            <button
              onClick={() => onPageChange('progress')}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              {recentWeightEntry ? 'Voir détails' : 'Nouvelle entrée'}
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 relative">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-600">Poids actuel</p>
                  <p className="text-2xl font-bold text-gray-800">{currentWeight} kg</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Weight className="w-6 h-6 text-green-600" />
                </div>
              </div>
              {weightChange !== 0 && recentWeightEntry && (
                <div className={`flex items-center space-x-1 mb-2 ${weightChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <TrendingUp className={`w-4 h-4 ${weightChange < 0 ? 'rotate-180 scale-x-[-1]' : ''}`} />
                  <span className="text-sm font-medium">
                    {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                  </span>
                </div>
              )}
              {!recentWeightEntry && (
                <p className="text-sm text-gray-400 mb-2">Poids initial</p>
              )}
              <button
                onClick={() => setShowWeightModal(true)}
                className="w-full flex items-center justify-center space-x-1 text-green-600 hover:text-green-700 hover:bg-green-50 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium border border-green-200"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter</span>
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">IMC</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {calculateIMC(currentWeight, heightCm)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className={`text-sm font-medium mt-2 ${getIMCCategory(parseFloat(calculateIMC(currentWeight, heightCm))).color}`}>
                {getIMCCategory(parseFloat(calculateIMC(currentWeight, heightCm))).text}
              </p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Objectif</p>
                  <p className="text-2xl font-bold text-gray-800">{weightGoal} kg</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">À atteindre</p>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Dernière entrée</p>
                  <p className="text-2xl font-bold text-gray-800">
                    {recentWeightEntry
                      ? new Date(recentWeightEntry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
                      : 'Aucune'
                    }
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {recentWeightEntry
                  ? `Il y a ${Math.floor((Date.now() - new Date(recentWeightEntry.date).getTime()) / (1000 * 60 * 60 * 24))} jours`
                  : 'Commencez votre suivi'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.action}
              className="bg-white rounded-xl p-4 md:p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 text-left group"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 ${action.color} rounded-lg flex items-center justify-center mb-3 md:mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-1 md:mb-2 text-sm md:text-base">{action.title}</h3>
              <p className="text-xs md:text-sm text-gray-600">{action.description}</p>
            </button>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Recipes */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Recettes populaires</h2>
            <button
              onClick={() => onPageChange('recipes')}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Voir tout
            </button>
          </div>
          <div className="space-y-4">
            {recipes.slice(0, 3).map((recipe) => (
              <div
                key={recipe.id}
                className="flex items-center space-x-4 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                onClick={() => setSelectedRecipe(recipe)}
              >
                <img
                  src={recipe.image}
                  alt={recipe.title}
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{recipe.title}</h3>
                  <p className="text-sm text-gray-600">{recipe.prepTime} min • {recipe.servings} portions</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Résumé des progrès</h2>
            <button
              onClick={() => onPageChange('progress')}
              className="text-green-600 hover:text-green-700 font-medium text-sm"
            >
              Voir détails
            </button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Entrées cette semaine</span>
              <span className="font-semibold">{weightEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return entryDate >= weekAgo && entry.userId === user?.id;
              }).length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Repas planifiés</span>
              <span className="font-semibold">{currentWeekMealPlans.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Recettes favorites</span>
              <span className="font-semibold">-</span>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Quick Access */}
      {user?.role === 'admin' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-amber-800">Administration</h2>
            <button
              onClick={() => onPageChange('admin')}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Gérer le contenu</span>
            </button>
          </div>
          <p className="text-amber-700">
            Vous avez accès aux fonctionnalités d'administration pour gérer les recettes et podcasts.
          </p>
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

      {/* Quick Weight Entry Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Ajouter une pesée</h3>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Poids actuel (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="Ex: 75.5"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">Date: {new Date().toLocaleDateString('fr-FR')}</p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowWeightModal(false);
                  setNewWeight('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                Annuler
              </button>
              <button
                onClick={handleAddWeight}
                disabled={!newWeight || isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
