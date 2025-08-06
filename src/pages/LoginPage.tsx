// 1️⃣ Import React hooks and navigation
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 2️⃣ LoginPage component with form validation and Firebase auth
export default function LoginPage() {
  // 3️⃣ Form refs to access input values
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  
  // 4️⃣ State for error messages and loading status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 5️⃣ Get auth functions and navigation
  const { login } = useAuth();
  const navigate = useNavigate();

  // 6️⃣ Handle form submission
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();  // Prevent page refresh
    
    // 7️⃣ Get input values
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    
    // 8️⃣ Basic validation
    if (!email || !password) {
      return setError('Please fill in all fields');
    }

    try {
      setError('');         // Clear any previous errors
      setLoading(true);     // Show loading state
      
      // 9️⃣ Attempt to login with Firebase
      await login(email, password);
      
      // 🔟 Redirect to dashboard on success
      navigate('/dashboard');
    } catch (error: any) {
      // 1️⃣1️⃣ Handle login errors with user-friendly messages
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to log in: ' + error.message);
      }
    }
    
    setLoading(false);  // Hide loading state
  }

  return (
    // 1️⃣2️⃣ Main container with centered layout
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* 1️⃣3️⃣ Login card with glassmorphism effect */}
      <div className="glass-card w-full max-w-md p-8 space-y-6">
        {/* 1️⃣4️⃣ Header section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            Welcome Back
          </h2>
          <p className="mt-2 text-gray-300">
            Sign in to your account
          </p>
        </div>

        {/* 1️⃣5️⃣ Error message display */}
        {error && (
          <div className="error-message text-center">
            {error}
          </div>
        )}

        {/* 1️⃣6️⃣ Login form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              ref={emailRef}
              type="email"
              required
              className="futuristic-input"
              placeholder="Enter your email"
            />
          </div>

          {/* Password input */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              id="password"
              ref={passwordRef}
              type="password"
              required
              className="futuristic-input"
              placeholder="Enter your password"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full neon-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              // 1️⃣7️⃣ Loading spinner
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* 1️⃣8️⃣ Register link */}
        <div className="text-center">
          <p className="text-gray-300">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-neon-blue hover:text-neon-purple transition-colors duration-300 font-semibold"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 