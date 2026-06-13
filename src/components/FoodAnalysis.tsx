import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera, Upload, Zap, Save, Trash2, ChevronDown, ChevronUp,
  Flame, Beef, Wheat, Droplets, Clock, CheckCircle, AlertCircle,
  Image, History, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface FoodItem {
  name: string;
  portionGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AnalysisResult {
  mealName: string;
  foods: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  notes?: string;
}

interface SavedAnalysis {
  id: string;
  meal_name: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  image_url: string;
  created_at: string;
}

type Tab = 'analyze' | 'history';

export default function FoodAnalysis() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('analyze');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [history, setHistory] = useState<SavedAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error: err } = await supabase
        .from('food_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!err && data) setHistory(data as SavedAnalysis[]);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'history') loadHistory();
  }, [tab, loadHistory]);

  const handleFileSelect = (file: File) => {
    setImageFile(file);
    setResult(null);
    setError(null);
    setSavedSuccess(false);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!imageFile || !imagePreview) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setSavedSuccess(false);

    try {
      // Extract base64 from data URL
      const base64 = imagePreview.split(',')[1];
      const mimeType = imageFile.type || 'image/jpeg';

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'analyse');
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResult(data as AnalysisResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user) return;
    setIsSaving(true);
    try {
      const { error: err } = await supabase.from('food_analyses').insert({
        user_id: user.id,
        image_url: imagePreview || '',
        foods: result.foods,
        total_calories: Math.round(result.totalCalories),
        total_protein: result.totalProtein,
        total_carbs: result.totalCarbs,
        total_fat: result.totalFat,
        meal_name: result.mealName,
      });
      if (err) throw err;
      setSavedSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await supabase.from('food_analyses').delete().eq('id', id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const reset = () => {
    setImageFile(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    setSavedSuccess(false);
  };

  const macroBarWidth = (value: number, max: number) =>
    `${Math.min(100, Math.round((value / max) * 100))}%`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analyse calorique par photo</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Photographiez votre repas pour obtenir une estimation nutritionnelle instantanee par IA.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {([['analyze', Camera, 'Analyser'], ['history', History, 'Historique']] as const).map(
          ([id, Icon, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === id
                  ? 'bg-white text-green-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          )
        )}
      </div>

      {/* Analyze Tab */}
      {tab === 'analyze' && (
        <div className="space-y-5">
          {/* Image upload zone */}
          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-all group"
            >
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <Image className="w-8 h-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-gray-700">Importer une photo de repas</p>
                <p className="text-sm text-gray-400 mt-1">Cliquez pour choisir depuis votre galerie</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); cameraInputRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                  Prendre une photo
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Galerie
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Repas a analyser"
                  className="w-full max-h-72 object-cover"
                />
                <button
                  onClick={reset}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {!result && (
                <div className="p-4">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold transition-colors"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Analyse en cours...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Analyser avec l'IA
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {isAnalyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded-lg w-2/3" />
              <div className="grid grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-xl" />
                ))}
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 rounded-xl" />
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {result && !isAnalyzing && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Meal name header */}
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 px-6 py-4">
                <p className="text-green-100 text-xs font-medium uppercase tracking-wide">Analyse du repas</p>
                <h2 className="text-white text-xl font-bold mt-0.5">{result.mealName}</h2>
              </div>

              {/* Macro totals */}
              <div className="grid grid-cols-4 gap-3 p-5 border-b border-gray-100">
                <MacroCard icon={Flame} label="Calories" value={Math.round(result.totalCalories)} unit="kcal" color="orange" />
                <MacroCard icon={Beef} label="Proteines" value={result.totalProtein} unit="g" color="red" />
                <MacroCard icon={Wheat} label="Glucides" value={result.totalCarbs} unit="g" color="amber" />
                <MacroCard icon={Droplets} label="Lipides" value={result.totalFat} unit="g" color="blue" />
              </div>

              {/* Food items */}
              <div className="p-5 space-y-3">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Aliments identifies ({result.foods.length})
                </h3>
                {result.foods.map((food, i) => (
                  <FoodItemRow key={i} food={food} totalCalories={result.totalCalories} />
                ))}
              </div>

              {/* Notes */}
              {result.notes && (
                <div className="mx-5 mb-5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-sm text-blue-700">{result.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={handleAnalyze}
                  className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Relancer
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving || savedSuccess}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    savedSuccess
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : savedSuccess ? (
                    <><CheckCircle className="w-4 h-4" /> Sauvegarde!</>
                  ) : (
                    <><Save className="w-4 h-4" /> Sauvegarder dans l'historique</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div className="space-y-4">
          {loadingHistory ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-2xl border border-gray-200 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Aucune analyse sauvegardee</p>
              <p className="text-sm mt-1">Analysez un repas et sauvegardez-le pour le retrouver ici.</p>
              <button
                onClick={() => setTab('analyze')}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
              >
                Analyser un repas
              </button>
            </div>
          ) : (
            history.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                expanded={expandedHistory === item.id}
                onToggle={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                onDelete={() => handleDelete(item.id)}
                isDeleting={deletingId === item.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function MacroCard({
  icon: Icon, label, value, unit, color,
}: {
  icon: React.ElementType; label: string; value: number; unit: string; color: string;
}) {
  const colors: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
  };
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-xs text-gray-500 font-medium">{label}</span>
      <span className="text-sm font-bold text-gray-800">
        {typeof value === 'number' ? (Number.isInteger(value) ? value : value.toFixed(1)) : value}
        <span className="text-xs font-normal text-gray-400 ml-0.5">{unit}</span>
      </span>
    </div>
  );
}

function FoodItemRow({ food, totalCalories }: { food: FoodItem; totalCalories: number }) {
  const pct = totalCalories > 0 ? Math.round((food.calories / totalCalories) * 100) : 0;
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-medium text-gray-800 text-sm">{food.name}</span>
          <span className="text-xs text-gray-400 ml-2">~{food.portionGrams}g</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-orange-600">{Math.round(food.calories)} kcal</span>
          <span className="text-xs text-gray-400 bg-gray-200 rounded-full px-2 py-0.5">{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex gap-4 mt-2 text-xs text-gray-500">
        <span><span className="font-medium text-red-600">{food.protein.toFixed(1)}g</span> prot.</span>
        <span><span className="font-medium text-amber-600">{food.carbs.toFixed(1)}g</span> gluc.</span>
        <span><span className="font-medium text-blue-600">{food.fat.toFixed(1)}g</span> lip.</span>
      </div>
    </div>
  );
}

function HistoryCard({
  item, expanded, onToggle, onDelete, isDeleting,
}: {
  item: SavedAnalysis;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const date = new Date(item.created_at);
  const dateStr = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.meal_name}
            className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{item.meal_name}</p>
          <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
            <Clock className="w-3 h-3" />
            {dateStr} a {timeStr}
          </div>
          <div className="flex gap-3 mt-2">
            <span className="text-xs font-bold text-orange-600">{item.total_calories} kcal</span>
            <span className="text-xs text-gray-400">P: {Number(item.total_protein).toFixed(1)}g</span>
            <span className="text-xs text-gray-400">G: {Number(item.total_carbs).toFixed(1)}g</span>
            <span className="text-xs text-gray-400">L: {Number(item.total_fat).toFixed(1)}g</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            {isDeleting ? (
              <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={onToggle}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {expanded && Array.isArray(item.foods) && item.foods.length > 0 && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Aliments</p>
          {(item.foods as FoodItem[]).map((food, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <div>
                <span className="text-sm text-gray-700">{food.name}</span>
                <span className="text-xs text-gray-400 ml-1.5">~{food.portionGrams}g</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="font-semibold text-orange-600">{Math.round(food.calories)} kcal</span>
                <span className="text-gray-400">P {food.protein.toFixed(1)}g</span>
                <span className="text-gray-400">G {food.carbs.toFixed(1)}g</span>
                <span className="text-gray-400">L {food.fat.toFixed(1)}g</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
