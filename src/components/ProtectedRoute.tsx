// 1️⃣ Import React and navigation components
import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 2️⃣ Interface for ProtectedRoute props
interface ProtectedRouteProps {
  children: ReactNode;
}

// 3️⃣ ProtectedRoute component that checks authentication
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // 4️⃣ Get current user from auth context
  const { currentUser } = useAuth();

  // 5️⃣ If user is not authenticated, redirect to login page
  // If user is authenticated, render the protected content
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
} 