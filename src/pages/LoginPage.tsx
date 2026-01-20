// 1️⃣ Import React hooks, navigation, and our custom components
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../layout/Layout';
import Button from '../components/Button';
import FormInput from '../components/FormInput';

// 2️⃣ LoginPage component with enhanced UI and form validation
export default function LoginPage() {
  // 3️⃣ State for form data and validation
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  
  // 4️⃣ Get auth functions and navigation
  const { login } = useAuth();
  const navigate = useNavigate();

  // 5️⃣ Handle input changes with real-time validation
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 6️⃣ Validate form fields
  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Username validation
    if (!formData.username) {
      newErrors.username = 'Username is required';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 7️⃣ Handle form submission with enhanced error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      // 8️⃣ Attempt to login with our backend
      await login(formData.username, formData.password);
      
      // 9️⃣ Redirect to dashboard on success
      navigate('/dashboard');
    } catch (error: any) {
      // 🔟 Handle login errors with user-friendly messages
      setErrors({ general: error.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      {/* 1️⃣1️⃣ Main container with centered layout */}
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          
          {/* 1️⃣2️⃣ Header section with animated logo */}
          <div className="text-center space-y-4">
            {/* Animated logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center animate-float">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple rounded-2xl blur-lg opacity-50 animate-pulse"></div>
              </div>
            </div>
            
            {/* Welcome text */}
            <div>
              <h1 className="text-4xl font-bold font-heading gradient-text mb-2">
                Welcome Back
              </h1>
              <p className="text-gray-300 font-body">
                Sign in to access your Facial Recognition DUT dashboard
              </p>
            </div>
          </div>

          {/* 1️⃣3️⃣ Login form card */}
          <div className="glass-card p-8 space-y-6">
            {/* General error message */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 animate-slide-up">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-400 font-body">{errors.general}</p>
                </div>
              </div>
            )}

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username input */}
              <FormInput
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                error={errors.username}
                variant={errors.username ? 'error' : 'default'}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                required
              />

              {/* Password input */}
              <FormInput
                label="Password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={errors.password}
                variant={errors.password ? 'error' : 'default'}
                showPasswordToggle
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
                required
              />

              {/* Submit button */}
              <Button
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                className="mt-8"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-400 font-body">
                  Don't have an account?
                </span>
              </div>
            </div>

            {/* Register link */}
            <div className="text-center">
              <Link 
                to="/register" 
                className="inline-flex items-center gap-2 text-neon-blue hover:text-neon-purple transition-colors duration-300 font-semibold font-body group"
              >
                Create your account
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* 1️⃣4️⃣ Additional features section */}
          <div className="text-center space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                  <span>Secure Login</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></div>
                  <span>Face Recognition</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
                  <span>DUT Integration</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
