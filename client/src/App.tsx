import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { NotFound } from './pages/NotFound';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { AdminApprovalsPage } from './pages/AdminApprovalsPage';
import { AdminShowsPage } from './pages/AdminShowsPage';
import { AdminShowDetailsPage } from './pages/AdminShowDetailsPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { useAuth } from './context/AuthContext';
import type { ReactNode } from 'react';

function App() {
  const { user } = useAuth();
  const isAuthed = user.isAuthenticated;

  // Protected Route Wrapper
  const RequireAuth = ({ children }: { children: ReactNode }) => {
    if (!isAuthed) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  // Admin Route Wrapper
  const RequireAdmin = ({ children }: { children: ReactNode }) => {
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
  };

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Public Routes (Auth pages are handled by Layout logic) */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected User Routes */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <HomePage />
            </RequireAuth>
          }
        />
        <Route
          path="/booking/:id"
          element={
            <RequireAuth>
              <BookingPage />
            </RequireAuth>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <RequireAuth>
              <MyBookingsPage />
            </RequireAuth>
          }
        />

        {/* Protected Admin Routes */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/shows"
          element={
            <RequireAdmin>
              <AdminShowsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/shows/:id"
          element={
            <RequireAdmin>
              <AdminShowDetailsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/approvals"
          element={
            <RequireAdmin>
              <AdminApprovalsPage />
            </RequireAdmin>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
