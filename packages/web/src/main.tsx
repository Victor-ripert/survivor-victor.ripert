import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App.js';
import { ErrorBoundary } from './components/ErrorBoundary.js';
import { AuthProvider } from './context/AuthContext.js';
import './styles/global.css';

const container = document.getElementById('root');

// index.html always carries #root, so this only fires if the served HTML is
// not ours. Saying it in the page beats a blank screen with a console line.
if (!container) {
  document.body.textContent =
    "L'application n'a pas pu démarrer : élément #root introuvable dans la page.";
  throw new Error('Élément #root introuvable dans index.html');
}

createRoot(container).render(
  <StrictMode>
    {/* Outside the router on purpose: a failure in the router, the layout or
        the auth provider still has somewhere to land. */}
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
