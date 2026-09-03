import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { EmptyState, LoadingRow } from './components/StatusMessages.js';
import { LoginPage } from './pages/Auth/LoginPage.js';
import { RegisterPage } from './pages/Auth/RegisterPage.js';

// One bundle per route: opening the catalogue does not download the
// dashboards, and a recruiter never downloads the administration screen.
const AdminDashboardPage = lazy(() =>
  import('./pages/Admin/AdminDashboardPage.js').then((module) => ({
    default: module.AdminDashboardPage,
  })),
);
const CataloguePage = lazy(() =>
  import('./pages/Recruiter/CataloguePage.js').then((module) => ({
    default: module.CataloguePage,
  })),
);
const ContactsPage = lazy(() =>
  import('./pages/Recruiter/ContactsPage.js').then((module) => ({
    default: module.ContactsPage,
  })),
);
const FavoritesPage = lazy(() =>
  import('./pages/Recruiter/FavoritesPage.js').then((module) => ({
    default: module.FavoritesPage,
  })),
);
const RecruiterDashboardPage = lazy(() =>
  import('./pages/Recruiter/RecruiterDashboardPage.js').then((module) => ({
    default: module.RecruiterDashboardPage,
  })),
);

const RECRUITER_ROLES = ['RECRUITER', 'ADMIN'] as const;

export const App = () => (
  <Suspense fallback={<LoadingRow />}>
    <Routes>
      <Route path="/connexion" element={<LoginPage />} />
      <Route path="/inscription" element={<RegisterPage />} />

      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/recruteur" replace />} />

        <Route
          path="/recruteur"
          element={
            <ProtectedRoute roles={[...RECRUITER_ROLES]}>
              <RecruiterDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/catalogue"
          element={
            <ProtectedRoute roles={[...RECRUITER_ROLES]}>
              <CataloguePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/favoris"
          element={
            <ProtectedRoute roles={[...RECRUITER_ROLES]}>
              <FavoritesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruteur/interactions"
          element={
            <ProtectedRoute roles={[...RECRUITER_ROLES]}>
              <ContactsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['ADMIN']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={
            <EmptyState title="Page introuvable" description="Ce lien ne mène nulle part." />
          }
        />
      </Route>
    </Routes>
  </Suspense>
);
