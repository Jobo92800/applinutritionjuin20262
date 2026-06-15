import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { isSupabaseConfigured, isProduction } from './lib/supabase';
import LoginForm from './components/LoginForm';
import PasswordResetPage from './components/PasswordResetPage';
import OnboardingModal from './components/OnboardingModal';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import RecipeList from './components/RecipeList';
import PodcastList from './components/PodcastList';
import MealCalendar from './components/MealCalendar';
import ShoppingList from './components/ShoppingList';
import ProgressTracking from './components/ProgressTracking';
import AdminPanel from './components/AdminPanel';
import AccountProfile from './components/AccountProfile';
import FoodAnalysis from './components/FoodAnalysis';

function AppContent() {
  const { user, isLoading, completeOnboarding } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Vérifier si nous sommes sur une page de réinitialisation de mot de passe
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = urlParams.get('type') || hashParams.get('type');
      const accessToken = urlParams.get('access_token') || hashParams.get('access_token');

      if (type === 'recovery' && accessToken) {
        setShowPasswordReset(true);
      }
    } catch (error) {
      console.error('Error checking URL params:', error);
    }
  }, []);

  // Vérifier si l'utilisateur doit faire l'onboarding
  React.useEffect(() => {
    if (user && (user.isOnboardingComplete === false || user.isOnboardingComplete === undefined)) {
      setShowOnboarding(true);
    } else {
      setShowOnboarding(false);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showPasswordReset) {
      return <PasswordResetPage onBackToLogin={() => setShowPasswordReset(false)} />;
    }
    return <LoginForm />;
  }

  const handleOnboardingComplete = async (data: any) => {
    try {
      await completeOnboarding(data);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onPageChange={setCurrentPage} />;
      case 'recipes':
        return <RecipeList />;
      case 'podcasts':
        return <PodcastList />;
      case 'calendar':
        return <MealCalendar />;
      case 'shopping':
        return <ShoppingList />;
      case 'progress':
        return <ProgressTracking />;
      case 'food-analysis':
        return <FoodAnalysis />;
      case 'account':
        return <AccountProfile />;
      case 'admin':
        return user.role === 'admin' ? <AdminPanel /> : <Dashboard onPageChange={setCurrentPage} />;
      default:
        return <Dashboard onPageChange={setCurrentPage} />;
    }
  };

  return (
    <>
      <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
        {renderPage()}
      </Layout>

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </>
  );
}

function App() {

  if (isProduction && !isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Configuration manquante</h1>
          <p className="text-gray-500 text-sm">
            La base de donnees n'est pas configuree. Verifiez que les variables{' '}
            <code className="bg-gray-100 px-1 rounded text-xs font-mono">VITE_SUPABASE_URL</code> et{' '}
            <code className="bg-gray-100 px-1 rounded text-xs font-mono">VITE_SUPABASE_ANON_KEY</code>{' '}
            sont bien definies dans votre environnement de deploiement.
          </p>
        </div>
      </div>
    );
  }

  // Gestion d'erreur pour le rendu
  try {
  return (
    <AuthProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </AuthProvider>
  );
  } catch (error) {
    console.error('Error in App component:', error);
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Erreur de l'application</h1>
          <p className="text-gray-600 mb-4">Une erreur est survenue lors du chargement de l'application.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Recharger la page
          </button>
        </div>
      </div>
    );
  }
}

export default App;