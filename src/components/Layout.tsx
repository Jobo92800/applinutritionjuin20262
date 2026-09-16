import React, { useState } from 'react';
import { Home, Book, Calendar, ShoppingCart, TrendingUp, Headphones, Settings, LogOut, Menu, X, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FloatingMessageButton from './FloatingMessageButton';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Layout({ children, currentPage, onPageChange }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', name: 'Accueil', icon: Home },
    { id: 'recipes', name: 'Recettes', icon: Book },
    { id: 'podcasts', name: 'Mon parcours', icon: Headphones },
    { id: 'calendar', name: 'Calendrier', icon: Calendar },
    { id: 'shopping', name: 'Courses', icon: ShoppingCart },
    { id: 'progress', name: 'Suivi', icon: TrendingUp },
    { id: 'food-analysis', name: 'Analyse photo', icon: Camera },
    { id: 'account', name: 'Compte', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navigationItems.push({ id: 'admin', name: 'Administration', icon: Settings });
  }

  return (
    <div className="min-h-screen">
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm border-b px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="w-6 h-6 text-gray-600" />
        </button>
        <img src="/logo.svg" alt="MAbeautyplus" className="h-8" />
        <div className="w-10" />
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div className="flex items-center justify-between px-6 pt-7 pb-5 border-b border-ardoise-200">
          <img src="/logo.svg" alt="MAbeautyplus" className="h-12 w-auto" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-marine-500 to-rose-500 shadow-carte">
              <span className="text-white font-semibold text-sm">
                {user?.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-medium text-gray-800">{user?.name}</p>
              <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      onPageChange(item.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-full text-left transition-colors ${
                      currentPage === item.id
                        ? 'bg-marine-100 text-marine-800'
                        : 'text-ardoise-600 hover:bg-marine-50 hover:text-marine-800'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-ardoise-500 hover:bg-rose-50 hover:text-rose-700 rounded-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Déconnexion</span>
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:ml-64">
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>

      {/* Floating message button */}
      <FloatingMessageButton />
    </div>
  );
}
