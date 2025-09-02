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
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session from localStorage
    const init = async () => {
      // Prefer loading user from authService (it centralizes token+user storage)
      try {
        const svcUser = authService.getCurrentUser();
        if (svcUser) {
          setUser(svcUser as User);
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('authService lookup failed', e);
      }

      // Backwards-compatible fallback to legacy localStorage key
      const savedUser = localStorage.getItem('dut_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && ['student', 'teacher', 'admin'].includes(parsed.role)) {
            setUser(parsed);
            // Mirror into authService storage if possible
            try { localStorage.setItem('user', JSON.stringify(parsed)); } catch (e) {}
          } else {
            console.warn('Invalid user role found in storage');
            localStorage.removeItem('dut_user');
          }
        } catch (error) {
          console.error('Error parsing saved user:', error);
          localStorage.removeItem('dut_user');
        }
      }
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
    isTeacher: user?.role === 'teacher' || user?.role === 'admin',
    isStudent: user?.role === 'student',
    isAdmin: user?.role === 'admin',
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