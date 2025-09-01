import React, { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireRole?: 'student' | 'teacher' | 'admin';
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Development mode: Skip all authentication checks and directly render children
  return <>{children}</>;
}