import React, { useState } from 'react';
import { Plus, Edit, Trash2, Upload, Clock, Users, ChefHat, GripVertical, MessageCircle } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Recipe, Podcast } from '../types';
import RecipeFormModal from './RecipeFormModal';
import PodcastFormModal from './PodcastFormModal';
import MessagesPanel from './MessagesPanel';

export default function AdminPanel() {
  const {
    recipes,
    podcasts,
    messages,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    addPodcast,
    updatePodcast,
    deletePodcast,
    updatePodcastOrder
  } = useData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'recipes' | 'podcasts' | 'messages'>('recipes');
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingPodcast, setEditingPodcast] = useState<Podcast | null>(null);
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [showPodcastForm, setShowPodcastForm] = useState(false);
  const [draggedPodcast, setDraggedPodcast] = useState<string | null>(null);

  const newMessagesCount = messages.filter(msg => msg.status === 'new').length;

  // Vérifier que l'utilisateur est admin
  if (user?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">🚫</span>
        </div>
        <h3 className="text-xl font-medium text-gray-500 mb-2">Accès refusé</h3>
        <p className="text-gray-400">Vous n'avez pas les permissions pour accéder à cette page</p>
      </div>
    );
  }

  const handleEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowRecipeForm(true);
  };

  const handleEditPodcast = (podcast: Podcast) => {
    setEditingPodcast(podcast);
    setShowPodcastForm(true);
  };

  const handleCloseRecipeForm = () => {
    setEditingRecipe(null);
    setShowRecipeForm(false);
  };

  const handleClosePodcastForm = () => {
    setEditingPodcast(null);
    setShowPodcastForm(false);
  };

  const handleNewRecipe = () => {
    setEditingRecipe(null);
    setShowRecipeForm(true);
  };

  const handleNewPodcast = () => {
    setEditingPodcast(null);
    setShowPodcastForm(true);
  };

  const handleDragStart = (e: React.DragEvent, podcastId: string) => {
    setDraggedPodcast(podcastId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedPodcast(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetPodcastId: string) => {
    e.preventDefault();

    if (!draggedPodcast || draggedPodcast === targetPodcastId) {
      return;
    }

    const sortedPodcasts = [...podcasts].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
    const draggedIndex = sortedPodcasts.findIndex(p => p.id === draggedPodcast);
    const targetIndex = sortedPodcasts.findIndex(p => p.id === targetPodcastId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...sortedPodcasts];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    try {
      await updatePodcastOrder(reordered);
    } catch (error) {
      console.error('Erreur lors de la réorganisation:', error);
    }

    setDraggedPodcast(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Administration</h1>
          <p className="text-gray-600 mt-2">Gérer le contenu de l'application</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-6 py-4 font-medium text-sm ${
                activeTab === 'recipes'
                  ? 'border-b-2 border-green-500 text-green-600 bg-green-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Recettes ({recipes.length})
            </button>
            <button
              onClick={() => setActiveTab('podcasts')}
              className={`px-6 py-4 font-medium text-sm ${
                activeTab === 'podcasts'
                  ? 'border-b-2 border-purple-500 text-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Podcasts ({podcasts.length})
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-6 py-4 font-medium text-sm flex items-center space-x-2 relative ${
                activeTab === 'messages'
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Messages</span>
              {newMessagesCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {newMessagesCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'recipes' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Gestion des recettes</h2>
                <button 
                  onClick={handleNewRecipe}
                  className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouvelle recette</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recipes.map((recipe) => (
                  <div key={recipe.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                    <h3 className="font-semibold text-gray-800 mb-2">{recipe.title}</h3>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{recipe.prepTime} min</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{recipe.servings}</span>
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditRecipe(recipe)}
                        className="flex-1 flex items-center justify-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Modifier</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Êtes-vous sûr de vouloir supprimer cette recette ?')) {
                            deleteRecipe(recipe.id);
                          }
                        }}
                        className="flex items-center justify-center bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'podcasts' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Gestion des podcasts</h2>
                <button
                  onClick={handleNewPodcast}
                  className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Nouveau podcast</span>
                </button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <GripVertical className="w-4 h-4 inline mr-2" />
                  Glissez-déposez les podcasts pour changer leur ordre d'affichage dans la liste publique
                </p>
              </div>

              <div className="space-y-4">
                {[...podcasts].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0)).map((podcast) => (
                  <div
                    key={podcast.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, podcast.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, podcast.id)}
                    className={`bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-move transition-all ${
                      draggedPodcast === podcast.id ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 pt-1">
                        <GripVertical className="w-5 h-5 text-gray-400" />
                      </div>
                      <img
                        src={podcast.thumbnail}
                        alt={podcast.title}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-2">{podcast.title}</h3>
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{podcast.description}</p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>{Math.floor(podcast.duration / 60)} min</span>
                          <span className="capitalize">{podcast.access_tier}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditPodcast(podcast)}
                          className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          <Edit className="w-3 h-3" />
                          <span>Modifier</span>
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Êtes-vous sûr de vouloir supprimer ce podcast ?')) {
                              deletePodcast(podcast.id);
                            }
                          }}
                          className="flex items-center justify-center bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <MessagesPanel />
          )}
        </div>
      </div>

      {/* Modals */}
      {showRecipeForm && (
        <RecipeFormModal
          recipe={editingRecipe}
          isOpen={showRecipeForm}
          onClose={handleCloseRecipeForm}
        />
      )}

      {showPodcastForm && (
        <PodcastFormModal
          podcast={editingPodcast}
          isOpen={showPodcastForm}
          onClose={handleClosePodcastForm}
        />
      )}
    </div>
  );
}