import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'student' | 'teacher' | 'admin';
}

export default function ProtectedRoute({ children, requireRole }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  // First check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Then check role requirements
  if (requireRole) {
    const hasAccess = 
      requireRole === user?.role || 
      (requireRole === 'teacher' && user?.role === 'admin');

    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}