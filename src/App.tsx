import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
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

  console.log('=== APP CONTENT RENDER ===');
  console.log('User:', user);
  console.log('isLoading:', isLoading);
  console.log('showOnboarding:', showOnboarding);

  // Vérifier si nous sommes sur une page de réinitialisation de mot de passe
  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = urlParams.get('type') || hashParams.get('type');
      const accessToken = urlParams.get('access_token') || hashParams.get('access_token');

      console.log('Checking password reset:', { type, hasAccessToken: !!accessToken });

      if (type === 'recovery' && accessToken) {
        console.log('Password reset detected, showing reset page');
        setShowPasswordReset(true);
      }
    } catch (error) {
      console.warn('Error checking URL params:', error);
    }
  }, []);

  // Vérifier si l'utilisateur doit faire l'onboarding
  React.useEffect(() => {
    console.log('Checking onboarding status for user:', user);
    if (user) {
      console.log('isOnboardingComplete:', user.isOnboardingComplete);
      console.log('Type of isOnboardingComplete:', typeof user.isOnboardingComplete);
    }
    if (user && (user.isOnboardingComplete === false || user.isOnboardingComplete === undefined)) {
      console.log('Setting showOnboarding to true');
      setShowOnboarding(true);
    } else {
      console.log('Setting showOnboarding to false');
      setShowOnboarding(false);
    }
  }, [user]);

  if (isLoading) {
    console.log('Rendering loading state');
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
    console.log('No user, rendering login form');
    if (showPasswordReset) {
      return <PasswordResetPage onBackToLogin={() => setShowPasswordReset(false)} />;
    }
    return <LoginForm />;
  }

  console.log('User authenticated, rendering main app');

  const handleOnboardingComplete = async (data: any) => {
    console.log('Completing onboarding with data:', data);
    try {
      await completeOnboarding(data);
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const renderPage = () => {
    console.log('Rendering page:', currentPage);
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
  console.log('=== APP COMPONENT RENDER ===');
  
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