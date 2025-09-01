import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import authService from '../services/authService';

interface User {
  id: number;
  name: string;
  email: string;
  studentId?: string;
  role: 'student' | 'teacher' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, studentId?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isTeacher: boolean;
  isStudent: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session; if none, attempt to auto-login as admin (dev mode)
    const init = async () => {
      const savedUser = localStorage.getItem('dut_user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          setLoading(false);
          return;
        } catch (error) {
          localStorage.removeItem('dut_user');
        }
      }

      // Dev mode: Always set an admin user without requiring login
      const devAdmin: User = {
        id: 1,
        name: 'Development Admin',
        email: 'admin@dut.ac.za',
        studentId: 'ADMINDUT',
        role: 'teacher' as const
      };
      setUser(devAdmin);
      try { 
        localStorage.setItem('dut_user', JSON.stringify(devAdmin)); 
      } catch (e) { /* ignore */ }
      setLoading(false);
    };

    init();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
  const resp = await authService.login({ email, password });
      if (resp && resp.user) {
        setUser(resp.user as User);
        localStorage.setItem('dut_user', JSON.stringify(resp.user));
      } else {
        throw new Error('Invalid login response');
      }
    } catch (error: any) {
      throw new Error(error?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, studentId?: string): Promise<void> => {
    setLoading(true);
    try {
      // Call backend register via authService
  const resp = await authService.register({ studentId: studentId || '', name, email, password });
      // We intentionally do NOT auto-login the user after registration. Clear any saved auth from authService.
      authService.logout();
      // Return to caller for redirect to login
      return;
    } catch (error: any) {
      throw new Error(error?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = (): void => {
    setUser(null);
    localStorage.removeItem('dut_user');
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};