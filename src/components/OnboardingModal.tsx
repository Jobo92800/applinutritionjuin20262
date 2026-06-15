import React, { useState } from 'react';
import { Target, User, Activity, Utensils, Save } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (data: OnboardingData) => void;
}

export interface OnboardingData {
  weightGoal: number;
  currentWeight: number;
  heightCm: number;
  gender: 'homme' | 'femme';
  age: '18-30' | '31-70' | '71+';
  activityLevel: 'faible' | 'moderee' | 'elevee';
  metabolism: 'normal' | 'ralentissement';
}

export default function OnboardingModal({ isOpen, onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    currentWeight: 70,
    weightGoal: 70,
    heightCm: 170,
    gender: 'homme',
    age: '18-30',
    activityLevel: 'moderee',
    metabolism: 'normal'
  });

  const ageRanges = [
    { value: '18-30', label: '18-30 ans', description: 'Jeune adulte' },
    { value: '31-70', label: '31-70 ans', description: 'Adulte' },
    { value: '71+', label: '71 ans et plus', description: 'Sénior' }
  ];

  const activityLevels = [
    { value: 'faible', label: 'Faible', description: 'Assis(e) ou très peu actif(ve)' },
    { value: 'moderee', label: 'Modérée', description: 'Alternance assis/debout ou activité légère régulière' },
    { value: 'elevee', label: 'Élevée', description: 'Travail physique OU sport modéré/intense régulier' }
  ];

  const metabolismTypes = [
    { value: 'normal', label: 'Normal', description: 'Métabolisme normal' },
    { value: 'ralentissement', label: 'Ralentissement', description: 'Ménopause, SOPK, hypothyroïdie, diabète T2, perte musculaire...' }
  ];

  const nextStep = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    onComplete(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Bienvenue, {user?.name} ! 👋</h1>
            <div className="text-sm bg-white/20 px-3 py-1 rounded-full">
              Étape {currentStep} sur 5
            </div>
          </div>
          <p className="text-green-100">
            Configurons votre profil pour personnaliser votre expérience
          </p>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Informations personnelles</h2>
                <p className="text-gray-600">Commençons par quelques informations de base</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Votre prénom
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    value={user?.name || ''}
                    disabled
                    placeholder="Votre prénom"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nous utiliserons ce nom pour personnaliser votre expérience</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vous êtes
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'homme' })}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        formData.gender === 'homme'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-3xl mb-2">👨</div>
                      <div className="font-medium">Homme</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: 'femme' })}
                      className={`p-4 rounded-lg border-2 transition-all text-center ${
                        formData.gender === 'femme'
                          ? 'border-pink-500 bg-pink-50 text-pink-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <div className="text-3xl mb-2">👩</div>
                      <div className="font-medium">Femme</div>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cela nous aide à personnaliser vos recommandations nutritionnelles</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Votre poids actuel (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="200"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    value={formData.currentWeight}
                    onChange={(e) => setFormData({ ...formData, currentWeight: parseFloat(e.target.value) || 70 })}
                    placeholder="70"
                  />
                  <p className="text-xs text-gray-500 mt-1">Cette information nous aide à personnaliser vos recommandations</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Votre taille (cm)
                  </label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: parseInt(e.target.value) || 170 })}
                    placeholder="170"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nécessaire pour calculer votre IMC</p>
                </div>
              </div>

              {/* Preview IMC */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800">Votre IMC actuel :</span>
                  <span className="text-lg font-bold text-blue-600">
                    {((formData.currentWeight / ((formData.heightCm / 100) ** 2))).toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Votre âge</h2>
                <p className="text-gray-600">Dans quelle tranche d'âge vous situez-vous ?</p>
              </div>

              <div className="space-y-3">
                {ageRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setFormData({ ...formData, age: range.value as any })}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData.age === range.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">{range.label}</h3>
                        <p className="text-sm text-gray-600">{range.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        formData.age === range.value
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.age === range.value && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Votre objectif de poids</h2>
                <p className="text-gray-600">Quel poids souhaitez-vous atteindre ?</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objectif de poids (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="30"
                    max="200"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg text-center"
                    value={formData.weightGoal}
                    onChange={(e) => setFormData({ ...formData, weightGoal: parseFloat(e.target.value) || 70 })}
                    placeholder="70"
                  />
                  <p className="text-xs text-gray-500 mt-1">Le poids que vous souhaitez atteindre</p>
                </div>

                {/* Comparaison poids actuel vs objectif */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">{formData.currentWeight} kg</div>
                      <div className="text-sm text-gray-600">Poids actuel</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">{formData.weightGoal} kg</div>
                      <div className="text-sm text-gray-600">Objectif</div>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <div className="text-sm font-medium text-green-800">
                      {formData.weightGoal > formData.currentWeight 
                        ? `+${(formData.weightGoal - formData.currentWeight).toFixed(1)} kg à prendre`
                        : formData.weightGoal < formData.currentWeight
                        ? `${(formData.currentWeight - formData.weightGoal).toFixed(1)} kg à perdre`
                        : 'Maintenir le poids actuel'
                      }
                    </div>
                  </div>
                </div>

                {/* Preview IMC objectif */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">IMC avec votre objectif :</span>
                    <span className="text-lg font-bold text-gray-800">
                      {((formData.weightGoal / ((formData.heightCm / 100) ** 2))).toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-orange-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Votre niveau d'activité</h2>
                <p className="text-gray-600">Cela nous aide à personnaliser vos recommandations</p>
              </div>

              <div className="space-y-3">
                {activityLevels.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setFormData({ ...formData, activityLevel: level.value })}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData.activityLevel === level.value
                        ? 'border-orange-500 bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">{level.label}</h3>
                        <p className="text-sm text-gray-600">{level.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        formData.activityLevel === level.value
                          ? 'border-orange-500 bg-orange-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.activityLevel === level.value && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Votre métabolisme</h2>
                <p className="text-gray-600">Comment décririez-vous votre métabolisme ?</p>
              </div>

              <div className="space-y-3">
                {metabolismTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, metabolism: type.value as any })}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      formData.metabolism === type.value
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-800">{type.label}</h3>
                        <p className="text-sm text-gray-600">{type.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 ${
                        formData.metabolism === type.value
                          ? 'border-red-500 bg-red-500'
                          : 'border-gray-300'
                      }`}>
                        {formData.metabolism === type.value && (
                          <div className="w-full h-full rounded-full bg-white scale-50"></div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>

            {currentStep < 5 ? (
              <button
                onClick={nextStep}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Suivant
              </button>
            ) : (
              <button
                onClick={handleComplete}
                className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Terminer</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}