// 1️⃣ Import React and auth context
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

// 2️⃣ Define admin interface
interface AdminContextType {
  isAdmin: boolean;
  adminEmail: string;
  canApproveUsers: boolean;
  canManageSystem: boolean;
}

// 3️⃣ Create admin context
const AdminContext = createContext<AdminContextType | undefined>(undefined);

// 4️⃣ Admin provider component
interface AdminProviderProps {
  children: ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const { currentUser } = useAuth();
  
  // 5️⃣ Define admin email (your email)
  const adminEmail = 'monwabisiblue333@gmail.com';
  
  // 6️⃣ Check if current user is admin
  const isAdmin = currentUser?.email === adminEmail;
  
  // 7️⃣ Admin permissions
  const canApproveUsers = isAdmin;
  const canManageSystem = isAdmin;

  const value: AdminContextType = {
    isAdmin,
    adminEmail,
    canApproveUsers,
    canManageSystem,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

// 8️⃣ Custom hook to use admin context
export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
