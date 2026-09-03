import { lazy, Suspense, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import type { UserRole } from '@profils-actifs/shared';
import { AppLayout } from './components/AppLayout.js';
import { ProtectedRoute } from './components/ProtectedRoute.js';
import { EmptyState, LoadingRow } from './components/StatusMessages.js';
import { FeedPage } from './pages/Profile/FeedPage.js';

// One bundle per route: opening the feed does not download the dashboards,
// and a recruiter never downloads the administration screens.
const lazyPage = <Key extends string>(
  loader: () => Promise<Record<Key, ComponentType>>,
  key: Key,
) => lazy(() => loader().then((module) => ({ default: module[key] })));

const LoginPage = lazyPage(() => import('./pages/Auth/LoginPage.js'), 'LoginPage');
const RegisterPage = lazyPage(() => import('./pages/Auth/RegisterPage.js'), 'RegisterPage');
const ProfilePage = lazyPage(() => import('./pages/Profile/ProfilePage.js'), 'ProfilePage');
const MyProfilePage = lazyPage(() => import('./pages/Profile/MyProfilePage.js'), 'MyProfilePage');
const CertificationPage = lazyPage(
  () => import('./pages/Certification/CertificationPage.js'),
  'CertificationPage',
);
const NotificationsPage = lazyPage(
  () => import('./pages/Notifications/NotificationsPage.js'),
  'NotificationsPage',
);
const RecruiterDashboardPage = lazyPage(
  () => import('./pages/Recruiter/RecruiterDashboardPage.js'),
  'RecruiterDashboardPage',
);
const CataloguePage = lazyPage(() => import('./pages/Recruiter/CataloguePage.js'), 'CataloguePage');
const FavoritesPage = lazyPage(() => import('./pages/Recruiter/FavoritesPage.js'), 'FavoritesPage');
const ContactsPage = lazyPage(() => import('./pages/Recruiter/ContactsPage.js'), 'ContactsPage');
const AdminDashboardPage = lazyPage(
  () => import('./pages/Admin/AdminDashboardPage.js'),
  'AdminDashboardPage',
);
const ProfileModerationPage = lazyPage(
  () => import('./pages/Admin/ProfileModerationPage.js'),
  'ProfileModerationPage',
);
const VideoModerationPage = lazyPage(
  () => import('./pages/Admin/VideoModerationPage.js'),
  'VideoModerationPage',
);
const QuestionnaireAdminPage = lazyPage(
  () => import('./pages/Admin/QuestionnaireAdminPage.js'),
  'QuestionnaireAdminPage',
);

const APPLICANT: UserRole[] = ['APPLICANT'];
const RECRUITERS: UserRole[] = ['RECRUITER', 'ADMIN'];
const ADMIN: UserRole[] = ['ADMIN'];
const EVERYONE: UserRole[] = ['APPLICANT', 'RECRUITER', 'ADMIN'];

interface GuardedProps {
  roles: UserRole[];
  page: ComponentType;
}

const Guarded = ({ roles, page: Page }: GuardedProps) => (
  <ProtectedRoute roles={roles}>
    <Page />
  </ProtectedRoute>
);

export const App = () => (
  <Suspense fallback={<LoadingRow />}>
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<FeedPage />} />
        <Route path="/profils/:id" element={<ProfilePage />} />
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />

        <Route path="/mon-profil" element={<Guarded roles={APPLICANT} page={MyProfilePage} />} />
        <Route
          path="/certification"
          element={<Guarded roles={APPLICANT} page={CertificationPage} />}
        />
        <Route
          path="/notifications"
          element={<Guarded roles={EVERYONE} page={NotificationsPage} />}
        />

        <Route
          path="/recruteur"
          element={<Guarded roles={RECRUITERS} page={RecruiterDashboardPage} />}
        />
        <Route
          path="/recruteur/catalogue"
          element={<Guarded roles={RECRUITERS} page={CataloguePage} />}
        />
        <Route
          path="/recruteur/favoris"
          element={<Guarded roles={RECRUITERS} page={FavoritesPage} />}
        />
        <Route
          path="/recruteur/interactions"
          element={<Guarded roles={RECRUITERS} page={ContactsPage} />}
        />

        <Route path="/admin" element={<Guarded roles={ADMIN} page={AdminDashboardPage} />} />
        <Route
          path="/admin/moderation-profils"
          element={<Guarded roles={ADMIN} page={ProfileModerationPage} />}
        />
        <Route
          path="/admin/moderation-videos"
          element={<Guarded roles={ADMIN} page={VideoModerationPage} />}
        />
        <Route
          path="/admin/questionnaire"
          element={<Guarded roles={ADMIN} page={QuestionnaireAdminPage} />}
        />

        {/* Older links from the first frontend iteration. */}
        <Route path="/profiles" element={<Navigate to="/" replace />} />
        <Route path="/profiles/:id" element={<ProfilePage />} />

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
