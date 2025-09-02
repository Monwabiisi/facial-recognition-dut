

const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000') + '/api';

export interface User {
  id: number;
  student_id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  created_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface RegisterData {
  studentId: string;
  name: string;
  email: string;
  password: string;
  role?: 'student' | 'teacher';
}

export interface LoginData {
  email?: string;
  studentId?: string;
  password?: string;
}

class AuthService {
  private currentUser: User | null = null;
  private token: string | null = null;

  constructor() {
    // Load user from localStorage on initialization
    this.loadUserFromStorage();
  }

  private loadUserFromStorage() {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      
      if (storedUser && storedToken) {
        this.currentUser = JSON.parse(storedUser);
        this.token = storedToken;
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
      this.clearStorage();
    }
  }

  private saveUserToStorage(user: User, token: string) {
    try {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
    } catch (error) {
      console.error('Error saving user to storage:', error);
    }
  }

  private clearStorage() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
  body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const authData = await response.json();
      
      // Convert the response format to match our interface
      const user: User = {
        id: authData.id,
        student_id: authData.studentId,
        name: authData.name,
        email: authData.email,
        role: authData.role,
        created_at: new Date().toISOString(),
      };

      const authResponse: AuthResponse = {
        user,
        token: authData.token,
      };

      this.currentUser = user;
      this.token = authData.token;
      this.saveUserToStorage(user, authData.token);

      return authResponse;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  async login(data: LoginData): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
  body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const authData = await response.json();
      
      this.currentUser = authData.user;
      this.token = authData.token;
      this.saveUserToStorage(authData.user, authData.token);

      return authData;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  logout() {
    this.currentUser = null;
    this.token = null;
    this.clearStorage();
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!(this.currentUser && this.token);
  }

  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher';
  }

  isStudent(): boolean {
    return this.currentUser?.role === 'student';
  }

  // Helper method to get authorization headers
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }
}

export const authService = new AuthService();
export default authService;