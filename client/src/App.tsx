import { Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AdminPage } from './pages/AdminPage';
import { BookingPage } from './pages/BookingPage';
import { NotFound } from './pages/NotFound';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { useAuth } from './context/AuthContext';
import { AdminApprovalsPage } from './pages/AdminApprovalsPage';

import type { ReactNode } from 'react';

function App() {
  const { user } = useAuth();
  const isAuthed = user.isAuthenticated;

  const RequireAuth = ({ children }: { children: ReactNode }) => {
    if (!isAuthed) return <Navigate to="/login" replace />;
    return <>{children}</>;
  };

  const RequireAdmin = ({ children }: { children: ReactNode }) => {
    if (!isAuthed) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/" replace />;
    return <>{children}</>;
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="layout">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <HomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminPage />
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
          <Route
            path="/booking/:id"
            element={
              <RequireAuth>
                <BookingPage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
