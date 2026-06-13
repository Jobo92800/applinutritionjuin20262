import React, { useState, useEffect } from 'react';
import { ScanLine, History } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import ImageCapture from './food-analyzer/ImageCapture';
import FoodAnalysisResult from './food-analyzer/FoodAnalysisResult';
import FoodAnalysisHistory from './food-analyzer/FoodAnalysisHistory';

interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

interface AnalysisResult {
  foods: FoodItem[];
  mealDescription: string;
  healthScore: number;
  tips: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

interface FoodAnalysis {
  id: string;
  meal_name: string;
  foods: FoodItem[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  created_at: string;
}

type Tab = 'analyze' | 'history';

export default function FoodAnalyzer() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('analyze');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [history, setHistory] = useState<FoodAnalysis[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab]);

  const fetchHistory = async () => {
    if (!user || !isSupabaseConfigured) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('food_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setHistory(data);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleImageReady = async (base64: string, preview: string) => {
    setPreviewUrl(preview);
    setImageBase64(base64);
    setResult(null);
    setError(null);
    setIsSaved(false);
    await analyzeImage(base64);
  };

  const analyzeImage = async (base64: string) => {
    setIsAnalyzing(true);
    setError(null);

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      setError('Supabase non configuré. Impossible d\'analyser l\'image.');
      setIsAnalyzing(false);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ imageBase64: base64 }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Erreur ${response.status}`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        setError('L\'analyse a pris trop de temps. Veuillez réessayer.');
      } else {
        setError(err.message || 'Une erreur est survenue lors de l\'analyse.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSave = async () => {
    if (!result || !user || !isSupabaseConfigured) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from('food_analyses').insert({
        user_id: user.id,
        image_url: '',
        foods: result.foods,
        total_calories: result.totalCalories,
        total_protein: result.totalProtein,
        total_carbs: result.totalCarbs,
        total_fat: result.totalFat,
        meal_name: result.mealDescription,
      });
      if (!error) {
        setIsSaved(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('food_analyses').delete().eq('id', id);
    if (!error) setHistory((prev) => prev.filter((a) => a.id !== id));
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setImageBase64(null);
    setResult(null);
    setError(null);
    setIsSaved(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Analyse calorique</h1>
        </div>
        <p className="text-green-100 text-sm ml-13">
          Photographiez votre repas pour obtenir une analyse nutritionnelle complète par IA.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setTab('analyze')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'analyze' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ScanLine className="w-4 h-4" />
          Analyser
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            tab === 'history' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History className="w-4 h-4" />
          Historique {history.length > 0 && `(${history.length})`}
        </button>
      </div>

      {/* Analyze tab */}
      {tab === 'analyze' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* No image yet */}
          {!previewUrl && !isAnalyzing && (
            <ImageCapture onImageReady={handleImageReady} isAnalyzing={false} />
          )}

          {/* Analyzing state */}
          {isAnalyzing && previewUrl && (
            <div className="p-6">
              <div className="relative w-full max-w-xs mx-auto mb-6">
                <img src={previewUrl} alt="Repas en cours d'analyse" className="w-full h-48 object-cover rounded-xl" />
                <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center gap-3">
                  <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" />
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-center text-gray-600 font-medium">Analyse en cours par IA...</p>
              <p className="text-center text-gray-400 text-sm mt-1">Identification des aliments et calcul des macros</p>
            </div>
          )}

          {/* Error state */}
          {error && !isAnalyzing && (
            <div className="p-6">
              {previewUrl && (
                <img src={previewUrl} alt="Repas" className="w-full max-w-xs mx-auto h-48 object-cover rounded-xl mb-4" />
              )}
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
              <div className="flex gap-3">
                {imageBase64 && (
                  <button
                    onClick={() => analyzeImage(imageBase64)}
                    className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:shadow-md transition-all"
                  >
                    Réessayer
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="flex-1 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Nouvelle photo
                </button>
              </div>
            </div>
          )}

          {/* Result state */}
          {result && !isAnalyzing && (
            <div className="p-4">
              {previewUrl && (
                <img src={previewUrl} alt="Repas analysé" className="w-full h-48 object-cover rounded-xl mb-4" />
              )}
              <FoodAnalysisResult
                result={result}
                onSave={handleSave}
                onReset={handleReset}
                isSaving={isSaving}
                isSaved={isSaved}
              />
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <FoodAnalysisHistory analyses={history} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}
