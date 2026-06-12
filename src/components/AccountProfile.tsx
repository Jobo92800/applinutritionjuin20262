import React, { useState } from 'react';
import { User, Mail, Lock, Target, Calendar, Shield, Save, CreditCard as Edit, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { supabase } from '../lib/supabase';

export default function AccountProfile() {
  const { user, logout, refreshProfile } = useAuth();
  const { weightEntries } = useData();
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    weightGoal: user?.profile?.weightGoal?.toString() || '70',
    heightCm: user?.profile?.heightCm?.toString() || '170',
    gender: user?.profile?.gender || 'homme',
    age: user?.profile?.age || '18-30',
    activityLevel: user?.profile?.activityLevel || 'moderee',
    metabolism: user?.profile?.metabolism || 'normal',
    dietaryPreferences: user?.profile?.dietaryPreferences || [] as string[],
    notifications: {
      email: true,
      weeklyProgress: true,
      mealReminders: false
    }
  });

  // Update formData when user changes
  React.useEffect(() => {
    console.log('AccountProfile: user changed', user);
    console.log('User profile data:', user?.profile);
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || '',
        weightGoal: user.profile?.weightGoal?.toString() || '70',
        heightCm: user.profile?.heightCm?.toString() || '170',
        gender: user.profile?.gender || 'homme',
        age: user.profile?.age || '18-30',
        activityLevel: user.profile?.activityLevel || 'moderee',
        metabolism: user.profile?.metabolism || 'normal',
        dietaryPreferences: user.profile?.dietaryPreferences || []
      }));
    }
  }, [user]);

  const userWeightEntries = weightEntries.filter(entry => entry.userId === user?.id);
  const latestWeight = userWeightEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const ageRanges = [
    { value: '18-30', label: '18-30 ans' },
    { value: '31-70', label: '31-70 ans' },
    { value: '71+', label: '71 ans et plus' }
  ];

  const activityLevels = [
    { value: 'faible', label: 'Faible (assis(e) ou très peu actif(ve))' },
    { value: 'moderee', label: 'Modérée (alternance assis/debout ou activité légère régulière)' },
    { value: 'elevee', label: 'Élevée (travail physique OU sport modéré/intense régulier)' }
  ];

  const metabolismTypes = [
    { value: 'normal', label: 'Normal' },
    { value: 'ralentissement', label: 'Ralentissement (ménopause, SOPK, hypothyroïdie, diabète T2, perte musculaire...)' }
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

  const handleSave = async () => {
    if (!user) return;

    console.log('Sauvegarde des modifications:', formData);

    try {
      // Save to Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          weight_goal: parseFloat(formData.weightGoal),
          height_cm: parseInt(formData.heightCm),
          gender: formData.gender,
          age: formData.age,
          activity_level: formData.activityLevel,
          metabolism: formData.metabolism,
          dietary_preferences: formData.dietaryPreferences
        })
        .eq('id', user.id);

      if (error) {
        console.error('Erreur lors de la sauvegarde du profil:', error);
        alert('Erreur lors de la sauvegarde du profil');
        return;
      }

      console.log('Profile saved successfully to Supabase');

      await refreshProfile();
      console.log('Profile refreshed in context');

      alert('Profil mis à jour avec succès!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la sauvegarde du profil');
    }
  };

  const handleDietaryPreferenceToggle = (preference: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(preference)
        ? prev.dietaryPreferences.filter(p => p !== preference)
        : [...prev.dietaryPreferences, preference]
    }));
  };

  const calculateBMI = () => {
    if (latestWeight && formData.heightCm) {
      const heightM = parseInt(formData.heightCm) / 100;
      return (latestWeight.weight / (heightM * heightM)).toFixed(1);
    }
    return 'N/A';
  };

  const getSubscriptionBadge = () => {
    if (!user?.subscription_tier) return null;
    
    const badges = {
      'admin': { text: 'Admin', color: 'bg-purple-100 text-purple-800', icon: '👑' },
      '6_month': { text: '6 mois', color: 'bg-gold-100 text-gold-800', icon: '⭐' },
      '3_month': { text: '3 mois', color: 'bg-blue-100 text-blue-800', icon: '💎' },
      '1_month': { text: '1 mois', color: 'bg-green-100 text-green-800', icon: '🌟' },
      'user': { text: 'Gratuit', color: 'bg-gray-100 text-gray-800', icon: '👤' }
    };

    const badge = badges[user.subscription_tier as keyof typeof badges];
    if (!badge) return null;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <span className="mr-1">{badge.icon}</span>
        {badge.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Mon compte</h1>
          <p className="text-gray-600 mt-2">Gérez vos informations personnelles et préférences</p>
        </div>
        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>Modifier</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Sauvegarder</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Informations générales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className="text-sm text-gray-500">Membre depuis {new Date(user?.createdAt || '').toLocaleDateString('fr-FR')}</span>
                {getSubscriptionBadge()}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations personnelles */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-blue-600" />
                Informations personnelles
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nom complet</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{user?.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adresse email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  ) : (
                    <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-500" />
                      {user?.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
                  <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="capitalize">{user?.role}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Statistiques */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-600" />
                Mes statistiques
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {latestWeight ? `${latestWeight.weight} kg` : 'N/A'}
                    </div>
                    <div className="text-sm text-green-700">Poids actuel</div>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{calculateBMI()}</div>
                    <div className="text-sm text-blue-700">IMC</div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{userWeightEntries.length}</div>
                  <div className="text-sm text-purple-700">Entrées de poids enregistrées</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Objectifs et préférences */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2 text-orange-600" />
          Objectifs et préférences
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Objectif de poids (kg)</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={formData.weightGoal}
                  onChange={(e) => setFormData({ ...formData, weightGoal: e.target.value })}
                />
              ) : (
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{formData.weightGoal} kg</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Taille (cm)</label>
              {isEditing ? (
                <input
                  type="number"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={formData.heightCm}
                  onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                />
              ) : (
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">{formData.heightCm} cm</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
              {isEditing ? (
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'homme' })}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      formData.gender === 'homme'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">👨</div>
                    <div className="font-medium text-sm">Homme</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'femme' })}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      formData.gender === 'femme'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">👩</div>
                    <div className="font-medium text-sm">Femme</div>
                  </button>
                </div>
              ) : (
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg flex items-center">
                  <span className="text-2xl mr-2">{formData.gender === 'homme' ? '👨' : '👩'}</span>
                  <span className="capitalize">{formData.gender}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tranche d'âge</label>
              {isEditing ? (
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value as any })}
                >
                  {ageRanges.map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">
                  {ageRanges.find(range => range.value === formData.age)?.label}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Niveau d'activité</label>
              {isEditing ? (
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={formData.activityLevel}
                  onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
                >
                  {activityLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">
                  {activityLevels.find(level => level.value === formData.activityLevel)?.label || 'Non défini'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Métabolisme</label>
              {isEditing ? (
                <select
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  value={formData.metabolism}
                  onChange={(e) => setFormData({ ...formData, metabolism: e.target.value as any })}
                >
                  {metabolismTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              ) : (
                <p className="text-gray-800 bg-gray-50 px-4 py-2 rounded-lg">
                  {metabolismTypes.find(type => type.value === formData.metabolism)?.label || 'Non défini'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Préférences alimentaires</label>
            {isEditing ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {dietaryOptions.map(option => (
                  <label key={option} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                      checked={formData.dietaryPreferences.includes(option)}
                      onChange={() => handleDietaryPreferenceToggle(option)}
                    />
                    <span className="text-sm text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 px-4 py-2 rounded-lg">
                {formData.dietaryPreferences.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.dietaryPreferences.map(pref => (
                      <span key={pref} className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                        {pref}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">Aucune préférence sélectionnée</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sécurité */}
      {isEditing && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
            <Lock className="w-5 h-5 mr-2 text-red-600" />
            Sécurité
          </h3>
          
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12"
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  placeholder="Entrez votre mot de passe actuel"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau mot de passe</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                placeholder="Nouveau mot de passe (optionnel)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Confirmer le nouveau mot de passe"
              />
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
          Notifications
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800">Notifications par email</h4>
              <p className="text-sm text-gray-600">Recevoir des emails pour les mises à jour importantes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.notifications.email}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, email: e.target.checked }
                })}
                disabled={!isEditing}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800">Rapport hebdomadaire</h4>
              <p className="text-sm text-gray-600">Recevoir un résumé de vos progrès chaque semaine</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.notifications.weeklyProgress}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, weeklyProgress: e.target.checked }
                })}
                disabled={!isEditing}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-800">Rappels de repas</h4>
              <p className="text-sm text-gray-600">Recevoir des rappels pour planifier vos repas</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={formData.notifications.mealReminders}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, mealReminders: e.target.checked }
                })}
                disabled={!isEditing}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Actions dangereuses */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-4">Zone de danger</h3>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h4 className="font-medium text-red-800">Déconnexion</h4>
            <p className="text-sm text-red-600">Se déconnecter de votre compte sur cet appareil</p>
          </div>
          <button
            onClick={logout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}