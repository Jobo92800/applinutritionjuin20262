import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Zap, Target, Upload } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { Recipe, Ingredient, RecipeVariant } from '../types';

interface RecipeFormModalProps {
  recipe?: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RecipeFormModal({ recipe, isOpen, onClose }: RecipeFormModalProps) {
  const { addRecipe, updateRecipe, uploadRecipeImage } = useData();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    difficulty: 'facile' as 'facile' | 'moyen' | 'difficile',
    prepTime: 30,
    servings: 4,
    categories: [] as string[],
    dietaryPreferences: [] as string[],
    ingredients: [] as Ingredient[],
    steps: [''],
    nutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    },
    variants: [] as RecipeVariant[]
  });

  const categories = [
    'Petit-déjeuner',
    'Déjeuner', 
    'Dîner',
    'Collation',
    'Entrée',
    'Plat principal',
    'Dessert',
    'Boisson'
  ];

  const dietaryOptions = [
    'Végétarien',
    'Végan',
    'Sans gluten',
    'Sans lactose',
    'Sans féculent',
    'Super-aliments',
    'Robot de cuisine',
    'Air Fryer'
  ];

  const ingredientCategories = [
    { key: 'fruits-legumes', name: 'Fruits et légumes' },
    { key: 'boucherie-charcuterie', name: 'Boucherie / Charcuterie' },
    { key: 'poisson', name: 'Poisson' },
    { key: 'produits-laitiers', name: 'Produits laitiers' },
    { key: 'epicerie-salee', name: 'Épicerie salée' },
    { key: 'epicerie-sucree', name: 'Épicerie sucrée' },
    { key: 'boisson', name: 'Boisson' },
    { key: 'surgeles', name: 'Surgelés' },
    { key: 'boulangerie-patisserie', name: 'Boulangerie / Pâtisserie' },
    { key: 'bio-dietetique', name: 'Bio / Diététique' },
    { key: 'condiments-assaisonnements', name: 'Condiments / Assaisonnements' },
    { key: 'complements-alimentaires', name: 'Compléments Alimentaires' }
  ];

  useEffect(() => {
    if (recipe) {
      console.log('Loading recipe data:', recipe);
      setFormData({
        title: recipe.title,
        description: recipe.description || '',
        image: recipe.image,
        difficulty: recipe.difficulty,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        categories: recipe.categories || [],
        dietaryPreferences: recipe.dietaryPreferences || [],
        ingredients: recipe.ingredients || [],
        steps: recipe.steps.length > 0 ? recipe.steps : [''],
        nutrition: recipe.nutrition,
        variants: recipe.variants || []
      });
    } else {
      // Reset form for new recipe
      setFormData({
        title: '',
        description: '',
        image: '',
        difficulty: 'facile',
        prepTime: 30,
        servings: 4,
        categories: [],
        dietaryPreferences: [],
        ingredients: [],
        steps: [''],
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        },
        variants: []
      });
    }
  }, [recipe]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted with data:', formData);
    setLoading(true);

    try {
      const recipeData = {
        ...formData,
        steps: formData.steps.filter(step => step.trim() !== ''),
        ingredients: formData.ingredients.filter(ing => ing.name.trim() !== ''),
        variants: formData.variants.filter(variant => variant.name.trim() !== '')
      };

      console.log('Processed recipe data:', recipeData);

      if (recipe) {
        console.log('Updating recipe with ID:', recipe.id);
        await updateRecipe(recipe.id, recipeData);
      } else {
        console.log('Adding new recipe');
        await addRecipe(recipeData);
      }

      onClose();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde de la recette');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est une image
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner un fichier image');
      e.target.value = '';
      return;
    }

    // Vérifier la taille du fichier (limite à 5MB)
    const maxSizeInMB = 5;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      alert(`L'image est trop volumineuse. Taille maximale autorisée : ${maxSizeInMB}MB. Taille du fichier : ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      e.target.value = '';
      return;
    }

    setUploadingImage(true);
    try {
      const imageUrl = await uploadRecipeImage(file);
      setFormData({ ...formData, image: imageUrl });
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert('Erreur lors du téléchargement de l\'image. Veuillez réessayer.');
      e.target.value = '';
    } finally {
      setUploadingImage(false);
    }
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [
        ...formData.ingredients,
        {
          id: Date.now().toString(),
          name: '',
          quantity: 1,
          unit: 'pièce',
          category: 'epicerie-salee'
        }
      ]
    });
  };

  const removeIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: any) => {
    const updatedIngredients = [...formData.ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setFormData({ ...formData, ingredients: updatedIngredients });
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, '']
    });
  };

  const removeStep = (index: number) => {
    setFormData({
      ...formData,
      steps: formData.steps.filter((_, i) => i !== index)
    });
  };

  const updateStep = (index: number, value: string) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = value;
    setFormData({ ...formData, steps: updatedSteps });
  };

  const toggleCategory = (category: string) => {
    setFormData({
      ...formData,
      categories: formData.categories.includes(category)
        ? formData.categories.filter(c => c !== category)
        : [...formData.categories, category]
    });
  };

  const toggleDietaryPreference = (preference: string) => {
    setFormData({
      ...formData,
      dietaryPreferences: formData.dietaryPreferences.includes(preference)
        ? formData.dietaryPreferences.filter(p => p !== preference)
        : [...formData.dietaryPreferences, preference]
    });
  };

  const addVariant = () => {
    const newVariant: RecipeVariant = {
      id: Date.now().toString(),
      name: '',
      targetCalories: formData.nutrition.calories,
      ingredients: [...formData.ingredients],
      nutrition: { ...formData.nutrition },
      adjustments: ''
    };
    
    setFormData({
      ...formData,
      variants: [...formData.variants, newVariant]
    });
  };

  const removeVariant = (index: number) => {
    setFormData({
      ...formData,
      variants: formData.variants.filter((_, i) => i !== index)
    });
  };

  const updateVariant = (index: number, field: keyof RecipeVariant, value: any) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index] = { ...updatedVariants[index], [field]: value };
    setFormData({ ...formData, variants: updatedVariants });
  };

  const updateVariantIngredient = (variantIndex: number, ingredientIndex: number, field: keyof Ingredient, value: any) => {
    const updatedVariants = [...formData.variants];
    const updatedIngredients = [...updatedVariants[variantIndex].ingredients];
    updatedIngredients[ingredientIndex] = { ...updatedIngredients[ingredientIndex], [field]: value };
    updatedVariants[variantIndex] = { ...updatedVariants[variantIndex], ingredients: updatedIngredients };
    setFormData({ ...formData, variants: updatedVariants });
  };

  const addVariantIngredient = (variantIndex: number) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[variantIndex].ingredients.push({
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unit: 'pièce',
      category: 'epicerie-salee'
    });
    setFormData({ ...formData, variants: updatedVariants });
  };

  const removeVariantIngredient = (variantIndex: number, ingredientIndex: number) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[variantIndex].ingredients = updatedVariants[variantIndex].ingredients.filter((_, i) => i !== ingredientIndex);
    setFormData({ ...formData, variants: updatedVariants });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              {recipe ? 'Modifier la recette' : 'Nouvelle recette'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la recette *
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Salade de quinoa aux légumes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image de la recette
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="URL de l'image"
                  />
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">ou</span>
                    <label className="flex items-center space-x-2 cursor-pointer bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm">
                        {uploadingImage ? 'Téléchargement...' : 'Télécharger une image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                    </label>
                  </div>
                  {formData.image && (
                    <div className="mt-2">
                      <img
                        src={formData.image}
                        alt="Aperçu"
                        className="w-full h-40 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description de la recette..."
              />
            </div>

            {/* Détails de la recette */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulté
                </label>
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as any })}
                >
                  <option value="facile">Facile</option>
                  <option value="moyen">Moyen</option>
                  <option value="difficile">Difficile</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temps de préparation (min)
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.prepTime}
                  onChange={(e) => setFormData({ ...formData, prepTime: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de portions
                </label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Catégories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Catégories
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <label key={category} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={formData.categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Préférences alimentaires */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Préférences alimentaires
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {dietaryOptions.map((option) => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      checked={formData.dietaryPreferences.includes(option)}
                      onChange={() => toggleDietaryPreference(option)}
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ingrédients */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Ingrédients
                </label>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <input
                        type="text"
                        placeholder="Nom de l'ingrédient"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Qté"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        value={ingredient.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Unité"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        value={ingredient.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                        value={ingredient.category}
                        onChange={(e) => updateIngredient(index, 'category', e.target.value)}
                      >
                        {ingredientCategories.map((cat) => (
                          <option key={cat.key} value={cat.key}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Étapes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Étapes de préparation
                </label>
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center space-x-1 text-green-600 hover:text-green-700"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Ajouter</span>
                </button>
              </div>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                      <span className="text-sm font-medium text-green-600">{index + 1}</span>
                    </div>
                    <textarea
                      rows={2}
                      placeholder={`Étape ${index + 1}...`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="p-2 text-red-500 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Informations nutritionnelles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Informations nutritionnelles (par portion)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Calories</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    value={formData.nutrition.calories}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, calories: parseInt(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Protéines (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    value={formData.nutrition.protein}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, protein: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Glucides (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    value={formData.nutrition.carbs}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, carbs: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Lipides (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                    value={formData.nutrition.fat}
                    onChange={(e) => setFormData({
                      ...formData,
                      nutrition: { ...formData.nutrition, fat: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
            </div>

            {/* Variantes de la recette */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <Zap className="w-4 h-4 text-orange-600 mr-2" />
                    Variantes de la recette
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    Créez des versions adaptées à différents besoins caloriques
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 bg-orange-50 px-3 py-2 rounded-lg hover:bg-orange-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">Ajouter une variante</span>
                </button>
              </div>

              {formData.variants.length > 0 ? (
                <div className="space-y-6">
                  {formData.variants.map((variant, variantIndex) => (
                    <div key={variantIndex} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-orange-800 flex items-center">
                          <Target className="w-4 h-4 mr-2" />
                          Variante {variantIndex + 1}
                        </h4>
                        <button
                          type="button"
                          onClick={() => removeVariant(variantIndex)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Nom de la variante</label>
                          <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            value={variant.name}
                            onChange={(e) => updateVariant(variantIndex, 'name', e.target.value)}
                            placeholder="Ex: Version allégée"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 mb-1">Calories cibles</label>
                          <input
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            value={variant.targetCalories}
                            onChange={(e) => updateVariant(variantIndex, 'targetCalories', parseInt(e.target.value) || 0)}
                            placeholder="300"
                          />
                        </div>
                      </div>

                      <div className="mb-4">
                        <label className="block text-xs text-gray-700 mb-1">Description des ajustements</label>
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          value={variant.adjustments}
                          onChange={(e) => updateVariant(variantIndex, 'adjustments', e.target.value)}
                          placeholder="Ex: Réduction des portions de féculents, ajout de légumes..."
                        />
                      </div>

                      {/* Valeurs nutritionnelles de la variante */}
                      <div className="mb-4">
                        <label className="block text-xs text-gray-700 mb-2">Valeurs nutritionnelles (par portion)</label>
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Calories</label>
                            <input
                              type="number"
                              min="0"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value={variant.nutrition.calories}
                              onChange={(e) => updateVariant(variantIndex, 'nutrition', {
                                ...variant.nutrition,
                                calories: parseInt(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Protéines (g)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value={variant.nutrition.protein}
                              onChange={(e) => updateVariant(variantIndex, 'nutrition', {
                                ...variant.nutrition,
                                protein: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Glucides (g)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value={variant.nutrition.carbs}
                              onChange={(e) => updateVariant(variantIndex, 'nutrition', {
                                ...variant.nutrition,
                                carbs: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Lipides (g)</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              value={variant.nutrition.fat}
                              onChange={(e) => updateVariant(variantIndex, 'nutrition', {
                                ...variant.nutrition,
                                fat: parseFloat(e.target.value) || 0
                              })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Ingrédients de la variante */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs text-gray-700">Ingrédients modifiés</label>
                          <button
                            type="button"
                            onClick={() => addVariantIngredient(variantIndex)}
                            className="flex items-center space-x-1 text-orange-600 hover:text-orange-700 text-xs"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Ajouter</span>
                          </button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {variant.ingredients.map((ingredient, ingredientIndex) => (
                            <div key={ingredientIndex} className="grid grid-cols-12 gap-1 items-end">
                              <div className="col-span-5">
                                <input
                                  type="text"
                                  placeholder="Nom"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  value={ingredient.name}
                                  onChange={(e) => updateVariantIngredient(variantIndex, ingredientIndex, 'name', e.target.value)}
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  placeholder="Qté"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  value={ingredient.quantity}
                                  onChange={(e) => updateVariantIngredient(variantIndex, ingredientIndex, 'quantity', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div className="col-span-2">
                                <input
                                  type="text"
                                  placeholder="Unité"
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  value={ingredient.unit}
                                  onChange={(e) => updateVariantIngredient(variantIndex, ingredientIndex, 'unit', e.target.value)}
                                />
                              </div>
                              <div className="col-span-2">
                                <select
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                  value={ingredient.category}
                                  onChange={(e) => updateVariantIngredient(variantIndex, ingredientIndex, 'category', e.target.value)}
                                >
                                  {ingredientCategories.map((cat) => (
                                    <option key={cat.key} value={cat.key}>{cat.name}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-1">
                                <button
                                  type="button"
                                  onClick={() => removeVariantIngredient(variantIndex, ingredientIndex)}
                                  className="p-1 text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        {variant.ingredients.length === 0 && (
                          <p className="text-xs text-gray-500 italic text-center py-2">
                            Aucun ingrédient modifié - utilisera les ingrédients de base
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <Zap className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-2">Aucune variante créée</p>
                  <p className="text-xs text-gray-400">
                    Les variantes permettent d'adapter la recette à différents besoins caloriques
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer avec boutons */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !formData.title.trim()}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Sauvegarde...' : (recipe ? 'Mettre à jour' : 'Créer')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}