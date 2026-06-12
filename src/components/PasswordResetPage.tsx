import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface PasswordResetPageProps {
  onBackToLogin: () => void;
}

export default function PasswordResetPage({ onBackToLogin }: PasswordResetPageProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    // Vérifier si nous avons un token de récupération valide
    const checkRecoveryToken = async () => {
      if (!isSupabaseConfigured) {
        // Mode démo - simuler un token valide
        setValidToken(true);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la vérification du token:', error);
          setValidToken(false);
          return;
        }

        // Vérifier si nous avons une session de récupération
        if (session && session.user) {
          setValidToken(true);
        } else {
          // Vérifier les paramètres URL pour le token de récupération (dans query et hash)
          const urlParams = new URLSearchParams(window.location.search);
          const hashParams = new URLSearchParams(window.location.hash.substring(1));

          const accessToken = urlParams.get('access_token') || hashParams.get('access_token');
          const refreshToken = urlParams.get('refresh_token') || hashParams.get('refresh_token');
          const type = urlParams.get('type') || hashParams.get('type');

          if (accessToken && type === 'recovery') {
            // Échanger le token de récupération contre une session
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });

            if (sessionError) {
              console.error('Erreur lors de l\'échange du token:', sessionError);
              setValidToken(false);
            } else {
              setValidToken(true);
            }
          } else {
            setValidToken(false);
          }
        }
      } catch (err) {
        console.error('Erreur lors de la vérification du token:', err);
        setValidToken(false);
      }
    };

    checkRecoveryToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setLoading(false);
      return;
    }

    try {
      if (!isSupabaseConfigured) {
        // Mode démo - simuler la réinitialisation
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
        setError('Erreur lors de la mise à jour du mot de passe. Veuillez réessayer.');
      } else {
        setSuccess(true);
        // Nettoyer l'URL des paramètres de récupération
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du mot de passe:', err);
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Affichage pendant la vérification du token
  if (validToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Vérification en cours...</h2>
            <p className="text-gray-600">Validation de votre lien de réinitialisation</p>
          </div>
        </div>
      </div>
    );
  }

  // Affichage si le token n'est pas valide
  if (validToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Lien invalide ou expiré</h2>
            <p className="text-gray-600 mb-6">
              Ce lien de réinitialisation n'est plus valide. Il a peut-être expiré ou a déjà été utilisé.
            </p>
            <button
              onClick={onBackToLogin}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Retour à la connexion
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Affichage de succès
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Mot de passe mis à jour !</h2>
            <p className="text-gray-600 mb-6">
              Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
            </p>
            <button
              onClick={onBackToLogin}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulaire de réinitialisation
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Nouveau mot de passe</h1>
            <p className="text-gray-600 mt-2">
              Choisissez un nouveau mot de passe sécurisé pour votre compte
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimum 6 caractères</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={onBackToLogin}
              className="flex items-center justify-center space-x-2 text-green-600 hover:text-green-700 font-medium mx-auto"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour à la connexion</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}