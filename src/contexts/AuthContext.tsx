// 1️⃣ Import React hooks and Firebase auth functions
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../firebaseConfig';

// 2️⃣ Define the shape of our Auth context
interface AuthContextType {
  currentUser: User | null;          // Currently logged in user or null
  signup: (email: string, password: string) => Promise<any>;  // Registration function
  login: (email: string, password: string) => Promise<any>;   // Login function
  logout: () => Promise<void>;       // Logout function
  loading: boolean;                  // Loading state for auth operations
}

// 3️⃣ Create the Auth context with undefined default value
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 4️⃣ Custom hook to use the Auth context with error checking
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// 5️⃣ Props interface for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// 6️⃣ AuthProvider component that wraps the app and provides auth state
export function AuthProvider({ children }: AuthProviderProps) {
  // 7️⃣ State to store current user and loading status
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 8️⃣ Function to register new user with email and password
  function signup(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  // 9️⃣ Function to login existing user with email and password
  function login(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // 🔟 Function to logout current user
  function logout() {
    return signOut(auth);
  }

  // 1️⃣1️⃣ Effect to listen for authentication state changes
  useEffect(() => {
    // This listener runs whenever user logs in/out
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);  // Update current user state
      setLoading(false);     // Auth state is now determined
    });

    // Cleanup function to unsubscribe when component unmounts
    return unsubscribe;
  }, []);

  // 1️⃣2️⃣ Context value object with all auth functions and state
  const value = {
    currentUser,
    signup,
    login,
    logout,
    loading
  };

  // 1️⃣3️⃣ Provide the auth context to all child components
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 