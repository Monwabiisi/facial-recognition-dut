import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { AdminProvider } from './contexts/AdminContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Camera from './pages/Camera';
import VerifyPage from './pages/VerifyPage';
import EnrollPage from './pages/EnrollPage';
import TeacherDashboard from './pages/TeacherDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBadge from './components/RoleBadge';
import UserMenu from './components/UserMenu';
import EvalPage from './pages/EvalPage';


export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminProvider>
          <div className="min-h-dvh bg-background-primary text-gray-900">
            {/* Top bar with role badge and navigation */}
            <div className="p-3 flex justify-between items-center bg-white shadow-sm">
              <nav className="flex space-x-4">
                <RoleBadge />
              </nav>
              <div className="flex items-center space-x-4">
                <UserMenu />
              </div>
            </div>

            {/* Main content */}
            <main className="container mx-auto px-4 py-8">
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/eval" element={<EvalPage />} />

                {/* Protected routes */}
                <Route
                  path="/camera"
                  element={
                    <ProtectedRoute>
                      <Camera />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/verify"
                  element={
                    <ProtectedRoute>
                      <VerifyPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/enroll"
                  element={
                    <ProtectedRoute requireRole="teacher">
                      <EnrollPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teacher"
                  element={
                    <ProtectedRoute requireRole="teacher">
                      <TeacherDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </main>
          </div>
        </AdminProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
