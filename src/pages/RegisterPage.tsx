// 1️⃣ Import React hooks and navigation
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 2️⃣ RegisterPage component with form validation and Firebase auth
export default function RegisterPage() {
  // 3️⃣ Form refs to access input values
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const passwordConfirmRef = useRef<HTMLInputElement>(null);
  
  // 4️⃣ State for error messages and loading status
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 5️⃣ Get auth functions and navigation
  const { signup } = useAuth();
  const navigate = useNavigate();

  // 6️⃣ Handle form submission with validation
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();  // Prevent page refresh
    
    // 7️⃣ Get input values
    const email = emailRef.current?.value;
    const password = passwordRef.current?.value;
    const passwordConfirm = passwordConfirmRef.current?.value;
    
    // 8️⃣ Form validation
    if (!email || !password || !passwordConfirm) {
      return setError('Please fill in all fields');
    }

    if (password !== passwordConfirm) {
      return setError('Passwords do not match');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters long');
    }

    // 9️⃣ Email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return setError('Please enter a valid email address');
    }

    try {
      setError('');         // Clear any previous errors
      setLoading(true);     // Show loading state
      
      // 🔟 Attempt to create account with Firebase
      await signup(email, password);
      
      // 1️⃣1️⃣ Redirect to dashboard on success
      navigate('/dashboard');
    } catch (error: any) {
      // 1️⃣2️⃣ Handle registration errors with user-friendly messages
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to create account: ' + error.message);
      }
    }
    
    setLoading(false);  // Hide loading state
  }

  return (
    // 1️⃣3️⃣ Main container with centered layout
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* 1️⃣4️⃣ Register card with glassmorphism effect */}
      <div className="glass-card w-full max-w-md p-8 space-y-6">
        {/* 1️⃣5️⃣ Header section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="mt-2 text-gray-300">
            Join Facial Recognition DUT
          </p>
        </div>

        {/* 1️⃣6️⃣ Error message display */}
        {error && (
          <div className="error-message text-center">
            {error}
          </div>
        )}

        {/* 1️⃣7️⃣ Registration form */}
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
              placeholder="Enter your password (min 6 characters)"
            />
          </div>

          {/* Confirm password input */}
          <div>
            <label htmlFor="password-confirm" className="block text-sm font-medium text-gray-300 mb-2">
              Confirm Password
            </label>
            <input
              id="password-confirm"
              ref={passwordConfirmRef}
              type="password"
              required
              className="futuristic-input"
              placeholder="Confirm your password"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full neon-button ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              // 1️⃣8️⃣ Loading spinner
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Creating Account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* 1️⃣9️⃣ Login link */}
        <div className="text-center">
          <p className="text-gray-300">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-neon-blue hover:text-neon-purple transition-colors duration-300 font-semibold"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 