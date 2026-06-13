import React from 'react';
import { Clock, Trash2, Flame, Beef, Wheat, Droplets } from 'lucide-react';

interface FoodItem {
  name: string;
  quantity: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
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

interface FoodAnalysisHistoryProps {
  analyses: FoodAnalysis[];
  onDelete: (id: string) => void;
}

function groupByDate(analyses: FoodAnalysis[]): Record<string, FoodAnalysis[]> {
  return analyses.reduce((groups, analysis) => {
    const date = new Date(analysis.created_at).toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(analysis);
    return groups;
  }, {} as Record<string, FoodAnalysis[]>);
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function FoodAnalysisHistory({ analyses, onDelete }: FoodAnalysisHistoryProps) {
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-600 mb-2">Aucune analyse enregistrée</h3>
        <p className="text-gray-400 text-sm max-w-xs">
          Analysez votre premier repas et enregistrez les résultats pour les retrouver ici.
        </p>
      </div>
    );
  }

  const grouped = groupByDate(analyses);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, dayAnalyses]) => {
        const dayTotal = dayAnalyses.reduce((sum, a) => sum + a.total_calories, 0);
        return (
          <div key={date}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 capitalize">{date}</h3>
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {dayTotal} kcal / jour
              </span>
            </div>

            <div className="space-y-3">
              {dayAnalyses.map((analysis) => (
                <div key={analysis.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="flex items-start justify-between px-4 py-3 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-xs text-gray-400">{formatTime(analysis.created_at)}</span>
                      </div>
                      <p className="font-semibold text-gray-800">{analysis.meal_name || 'Repas analysé'}</p>
                    </div>

                    {confirmDelete === analysis.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { onDelete(analysis.id); setConfirmDelete(null); }}
                          className="text-xs text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(analysis.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Aliments */}
                  <div className="px-4 py-2">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {analysis.foods.map((food, i) => (
                        <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {food.name} ({food.quantity})
                        </span>
                      ))}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      <div className="text-center bg-orange-50 rounded-lg py-1.5">
                        <Flame className="w-3.5 h-3.5 text-orange-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-orange-600">{analysis.total_calories}</p>
                        <p className="text-xs text-gray-400">kcal</p>
                      </div>
                      <div className="text-center bg-red-50 rounded-lg py-1.5">
                        <Beef className="w-3.5 h-3.5 text-red-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-red-600">{analysis.total_protein}g</p>
                        <p className="text-xs text-gray-400">prot.</p>
                      </div>
                      <div className="text-center bg-amber-50 rounded-lg py-1.5">
                        <Wheat className="w-3.5 h-3.5 text-amber-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-amber-600">{analysis.total_carbs}g</p>
                        <p className="text-xs text-gray-400">gluc.</p>
                      </div>
                      <div className="text-center bg-blue-50 rounded-lg py-1.5">
                        <Droplets className="w-3.5 h-3.5 text-blue-500 mx-auto mb-0.5" />
                        <p className="text-xs font-bold text-blue-600">{analysis.total_fat}g</p>
                        <p className="text-xs text-gray-400">lip.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
