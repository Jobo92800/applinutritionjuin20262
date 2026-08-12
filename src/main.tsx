import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import InstallPrompt from './components/InstallPrompt.tsx';
import './index.css';

// Capture l'événement d'installation PWA le plus tôt possible (il peut se
// déclencher avant le montage de React). Le composant InstallPrompt le récupère.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  (window as any).__deferredInstallPrompt = e;
  window.dispatchEvent(new Event('pwa:installable'));
});
window.addEventListener('appinstalled', () => {
  (window as any).__deferredInstallPrompt = null;
  window.dispatchEvent(new Event('pwa:installed'));
});

// Gestion des erreurs globales
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('Root element not found');
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erreur: Élément root non trouvé</h1></div>';
} else {
  try {
    const root = createRoot(rootElement);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
          <InstallPrompt />
        </ErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error('Error rendering app:', error);
    rootElement.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Erreur de rendu de l\'application</h1><p>Vérifiez la console pour plus de détails</p></div>';
  }
}