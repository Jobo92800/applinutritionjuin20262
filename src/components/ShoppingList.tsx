import React, { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Download, RefreshCw, ShoppingCart, CheckCheck, X, Calendar, ChevronDown } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingItem } from '../types';

export default function ShoppingList() {
  const { shoppingList, updateShoppingList, generateShoppingList, mealPlans } = useData();
  const { user } = useAuth();
  const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: 'pièce', category: 'autres' });
  const [showWeekSelector, setShowWeekSelector] = useState(false);
  const [selectedWeekStart, setSelectedWeekStart] = useState('');

  const categories = [
    { key: 'fruits-legumes', name: '🍎 Fruits et légumes', color: 'bg-green-100' },
    { key: 'boucherie-charcuterie', name: '🥩 Boucherie / Charcuterie', color: 'bg-red-100' },
    { key: 'poisson', name: '🐟 Poisson', color: 'bg-blue-100' },
    { key: 'produits-laitiers', name: '🥛 Produits laitiers', color: 'bg-blue-50' },
    { key: 'epicerie-salee', name: '🧂 Épicerie salée', color: 'bg-yellow-100' },
    { key: 'epicerie-sucree', name: '🍯 Épicerie sucrée', color: 'bg-pink-100' },
    { key: 'boisson', name: '🥤 Boisson', color: 'bg-cyan-100' },
    { key: 'surgeles', name: '🧊 Surgelés', color: 'bg-cyan-200' },
    { key: 'boulangerie-patisserie', name: '🥖 Boulangerie / Pâtisserie', color: 'bg-orange-100' },
    { key: 'bio-dietetique', name: '🌱 Produit Bio / Diététiques', color: 'bg-green-200' },
    { key: 'condiments-assaisonnements', name: '🧄 Condiments / Assaisonnements', color: 'bg-amber-100' },
    { key: 'complements-alimentaires', name: '💊 Compléments Alimentaires', color: 'bg-purple-100' }
  ];

  const toggleItemCheck = (itemId: string) => {
    const updatedList = shoppingList.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    updateShoppingList(updatedList);
  };

  const removeItem = (itemId: string) => {
    const updatedList = shoppingList.filter(item => item.id !== itemId);
    updateShoppingList(updatedList);
  };

  const markAllAsDone = () => {
    const updatedList = shoppingList.map(item => ({ ...item, checked: false }));
    updateShoppingList(updatedList);
  };

  const clearAllItems = () => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer tous les articles de votre liste de courses ?')) {
      updateShoppingList([]);
    }
  };

  const addItem = () => {
    if (!newItem.name.trim()) return;

    const item: ShoppingItem = {
      id: Date.now().toString(),
      name: newItem.name,
      quantity: newItem.quantity,
      unit: newItem.unit,
      category: newItem.category,
      checked: false
    };

    updateShoppingList([...shoppingList, item]);
    setNewItem({ name: '', quantity: 1, unit: 'pièce', category: 'autres' });
  };

  // Fonction pour obtenir le début de la semaine (lundi)
  const getWeekStart = (date: Date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  // Fonction pour obtenir la fin de la semaine (dimanche)
  const getWeekEnd = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd;
  };

  // Obtenir les semaines disponibles avec des repas planifiés
  const getAvailableWeeks = () => {
    if (!user) return [];
    
    const userMealPlans = mealPlans.filter(plan => plan.userId === user.id);
    const weeks = new Set<string>();
    
    userMealPlans.forEach(plan => {
      const planDate = new Date(plan.date);
      const weekStart = getWeekStart(planDate);
      weeks.add(weekStart.toISOString().split('T')[0]);
    });
    
    return Array.from(weeks)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime()) // Tri décroissant (plus récent en premier)
      .map(weekStartStr => {
        const weekStart = new Date(weekStartStr);
        const weekEnd = getWeekEnd(weekStart);
        const mealCount = userMealPlans.filter(plan => {
          const planDate = new Date(plan.date);
          return planDate >= weekStart && planDate <= weekEnd;
        }).length;
        
        return {
          weekStart: weekStartStr,
          label: `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`,
          mealCount
        };
      });
  };

  const generateFromMealPlan = (weekStart?: string) => {
    if (user) {
      generateShoppingList(user.id, weekStart);
    }
  };

  const handleQuickGenerate = () => {
    // Génération rapide pour la semaine courante
    const currentWeekStart = getWeekStart().toISOString().split('T')[0];
    generateFromMealPlan(currentWeekStart);
    setShowWeekSelector(false);
  };

  const handleWeekSelection = (weekStart: string) => {
    setSelectedWeekStart(weekStart);
    generateFromMealPlan(weekStart);
    setShowWeekSelector(false);
  };

  const exportList = () => {
    const content = shoppingList
      .map(item => `${item.checked ? '✓' : '☐'} ${item.quantity} ${item.unit} ${item.name}`)
      .join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'liste-courses.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableWeeks = getAvailableWeeks();

  const groupedItems = categories.map(category => ({
    ...category,
    items: shoppingList.filter(item => item.category === category.key)
  })).filter(category => category.items.length > 0);

  const checkedCount = shoppingList.filter(item => item.checked).length;
  const totalCount = shoppingList.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Liste de courses</h1>
          <p className="text-gray-600 mt-2">
            {checkedCount} / {totalCount} articles cochés
          </p>
        </div>

        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <div className="relative">
            <button
              onClick={() => setShowWeekSelector(!showWeekSelector)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              <span>Générer depuis les repas</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {/* Dropdown pour sélectionner la semaine */}
            {showWeekSelector && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Choisir la période</h3>
                  <p className="text-sm text-gray-600">Sélectionnez la semaine pour générer votre liste de courses</p>
                </div>
                
                <div className="p-2 max-h-64 overflow-y-auto">
                  {/* Option pour la semaine courante */}
                  <button
                    onClick={handleQuickGenerate}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 rounded-lg transition-colors border-b border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-600">📅 Semaine courante</div>
                        <div className="text-sm text-gray-600">
                          {getWeekStart().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {getWeekEnd(getWeekStart()).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        Recommandé
                      </div>
                    </div>
                  </button>
                  
                  {/* Semaines avec repas planifiés */}
                  {availableWeeks.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Semaines avec repas planifiés
                      </div>
                      {availableWeeks.map((week) => (
                        <button
                          key={week.weekStart}
                          onClick={() => handleWeekSelection(week.weekStart)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{week.label}</div>
                              <div className="text-sm text-gray-600">{week.mealCount} repas planifiés</div>
                            </div>
                            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                              {week.mealCount}
                            </div>
                          </div>
                        </button>
                      ))}
                    </>
                  ) : (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">Aucun repas planifié</p>
                      <p className="text-xs text-gray-400">Planifiez des repas pour générer une liste</p>
                    </div>
                  )}
                </div>
                
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  <button
                    onClick={() => setShowWeekSelector(false)}
                    className="w-full text-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={exportList}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
        </div>
      </div>

      {/* Fermer le dropdown si on clique ailleurs */}
      {showWeekSelector && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowWeekSelector(false)}
        />
      )}

      {/* Boutons d'actions rapides */}
      {totalCount > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Actions rapides</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={markAllAsDone}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex-1"
            >
              <CheckCheck className="w-4 h-4" />
              <span>J'ai fait mes courses</span>
            </button>
            
            <button
              onClick={clearAllItems}
              className="flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex-1"
            >
              <X className="w-4 h-4" />
              <span>Tout supprimer</span>
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progression</span>
            <span className="text-sm text-gray-500">{Math.round((checkedCount / totalCount) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(checkedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Add New Item */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Ajouter un article</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="text"
            placeholder="Nom de l'article"
            className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && addItem()}
          />
          
          <input
            type="number"
            min="1"
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            value={newItem.quantity}
            onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
          />
          
          <select
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
          >
            {categories.map(category => (
              <option key={category.key} value={category.key}>{category.name}</option>
            ))}
          </select>
          
          <button
            onClick={addItem}
            className="flex items-center justify-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Shopping List */}
      {groupedItems.length > 0 ? (
        <div className="space-y-6">
          {groupedItems.map((category) => (
            <div key={category.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`px-6 py-4 ${category.color} border-b`}>
                <h3 className="font-semibold text-gray-800">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.items.length} articles</p>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-center space-x-4 p-3 rounded-lg border ${
                        item.checked ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-300'
                      }`}
                    >
                      <button
                        onClick={() => toggleItemCheck(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          item.checked
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'border-gray-300 hover:border-green-400'
                        }`}
                      >
                        {item.checked && <Check className="w-4 h-4" />}
                      </button>
                      
                      <div className={`flex-1 ${item.checked ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          {item.quantity} {item.unit}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-orange-600" />
          </div>
          <h3 className="text-xl font-medium text-gray-500 mb-2">Liste vide</h3>
          <p className="text-gray-400">Ajoutez des articles ou générez une liste depuis vos repas planifiés</p>
        </div>
      )}
    </div>
  );
}