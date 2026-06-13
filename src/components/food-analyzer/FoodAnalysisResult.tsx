import React, { useState } from 'react';
import { Flame, Beef, Wheat, Droplets, ChevronDown, ChevronUp, Lightbulb, Save, RefreshCw } from 'lucide-react';

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

interface FoodAnalysisResultProps {
  result: AnalysisResult;
  onSave: () => void;
  onReset: () => void;
  isSaving: boolean;
  isSaved: boolean;
}

function HealthScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 10) * circumference;
  const offset = circumference - progress;

  const color =
    score >= 8 ? '#16a34a' :
    score >= 6 ? '#65a30d' :
    score >= 4 ? '#d97706' : '#dc2626';

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>{score}</span>
          <span className="text-xs text-gray-500">/10</span>
        </div>
      </div>
      <span className="text-sm font-medium text-gray-600 mt-1">Score santé</span>
    </div>
  );
}

export default function FoodAnalysisResult({ result, onSave, onReset, isSaving, isSaved }: FoodAnalysisResultProps) {
  const [expandedFood, setExpandedFood] = useState<number | null>(null);

  const macros = [
    { label: 'Calories', value: result.totalCalories, unit: 'kcal', icon: Flame, bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    { label: 'Protéines', value: result.totalProtein, unit: 'g', icon: Beef, bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', iconBg: 'bg-red-100' },
    { label: 'Glucides', value: result.totalCarbs, unit: 'g', icon: Wheat, bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', iconBg: 'bg-amber-100' },
    { label: 'Lipides', value: result.totalFat, unit: 'g', icon: Droplets, bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', iconBg: 'bg-blue-100' },
  ];

  return (
    <div className="space-y-5">
      {/* Meal description + health score */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-5">
        <HealthScoreRing score={result.healthScore} />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">Repas identifié</p>
          <p className="text-gray-800 font-semibold leading-snug">{result.mealDescription}</p>
        </div>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-2 gap-3">
        {macros.map(({ label, value, unit, icon: Icon, bg, border, text, iconBg }) => (
          <div key={label} className={`${bg} border ${border} rounded-xl p-4 flex items-center gap-3`}>
            <div className={`${iconBg} w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${text}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-xl font-bold ${text}`}>{value}<span className="text-sm font-normal ml-0.5">{unit}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Tips */}
      {result.tips && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Lightbulb className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800 leading-relaxed">{result.tips}</p>
        </div>
      )}

      {/* Food detail */}
      {result.foods.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Détail des aliments ({result.foods.length})</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {result.foods.map((food, i) => (
              <div key={i}>
                <button
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => setExpandedFood(expandedFood === i ? null : i)}
                >
                  <div>
                    <span className="font-medium text-gray-800">{food.name}</span>
                    <span className="ml-2 text-sm text-gray-400">{food.quantity}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-orange-600">{food.calories} kcal</span>
                    {expandedFood === i ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {expandedFood === i && (
                  <div className="px-5 py-3 bg-gray-50 grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Protéines</p>
                      <p className="font-semibold text-red-600">{food.protein}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Glucides</p>
                      <p className="font-semibold text-amber-600">{food.carbs}g</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">Lipides</p>
                      <p className="font-semibold text-blue-600">{food.fat}g</p>
                    </div>
                    {food.fiber > 0 && (
                      <div className="text-center col-span-3">
                        <p className="text-xs text-gray-500">Fibres</p>
                        <p className="font-semibold text-green-600">{food.fiber}g</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onSave}
          disabled={isSaving || isSaved}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-200 ${
            isSaved
              ? 'bg-green-100 text-green-700 border border-green-300'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50'
          }`}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Enregistrement...' : isSaved ? 'Enregistré !' : 'Enregistrer l\'analyse'}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
        >
          <RefreshCw className="w-4 h-4" />
          Nouvelle
        </button>
      </div>
    </div>
  );
}
