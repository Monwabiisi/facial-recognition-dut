// 1️⃣ Import React hooks, navigation, and our custom components
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../layout/Layout';
import Button from '../components/Button';
import FormInput from '../components/FormInput';

// 2️⃣ RegisterPage component with enhanced UI and comprehensive validation
export default function RegisterPage() {
  // 3️⃣ State for form data and validation
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  // 4️⃣ Get auth functions and navigation
  const { signup } = useAuth();
  const navigate = useNavigate();

  // 5️⃣ Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  // 6️⃣ Handle input changes with real-time validation
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Calculate password strength for password field
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // 7️⃣ Comprehensive form validation
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
      newErrors.password = 'Password must be at least 6 characters long';
    } else if (passwordStrength < 3) {
      newErrors.password = 'Password is too weak. Include uppercase, lowercase, numbers, and symbols.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 8️⃣ Handle form submission with enhanced error handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form before submission
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setErrors({});
      
      // 9️⃣ Attempt to create account with our backend
      await signup(formData.username, formData.password);
      
      // 🔟 Redirect to dashboard on success
      navigate('/dashboard');
    } catch (error: any) {
      // 1️⃣1️⃣ Handle registration errors with user-friendly messages
      setErrors({ general: error.message || 'An unexpected error occurred' });
    } finally {
      setLoading(false);
    }
  };

  // 1️⃣2️⃣ Get password strength color and text
  const getPasswordStrengthInfo = () => {
    switch (passwordStrength) {
      case 0:
      case 1:
        return { color: 'bg-red-500', text: 'Very Weak', textColor: 'text-red-400' };
      case 2:
        return { color: 'bg-orange-500', text: 'Weak', textColor: 'text-orange-400' };
      case 3:
        return { color: 'bg-yellow-500', text: 'Fair', textColor: 'text-yellow-400' };
      case 4:
        return { color: 'bg-neon-blue', text: 'Good', textColor: 'text-neon-blue' };
      case 5:
        return { color: 'bg-neon-green', text: 'Strong', textColor: 'text-neon-green' };
      default:
        return { color: 'bg-gray-500', text: '', textColor: 'text-gray-400' };
    }
  };

  const strengthInfo = getPasswordStrengthInfo();

  return (
    <Layout>
      {/* 1️⃣3️⃣ Main container with centered layout */}
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          
          {/* 1️⃣4️⃣ Header section with animated logo */}
          <div className="text-center space-y-4">
            {/* Animated logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-neon-purple to-neon-pink rounded-2xl flex items-center justify-center animate-float">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-pink rounded-2xl blur-lg opacity-50 animate-pulse"></div>
              </div>
            </div>
            
            {/* Welcome text */}
            <div>
              <h1 className="text-4xl font-bold font-heading gradient-text mb-2">
                Join DUT
              </h1>
              <p className="text-gray-300 font-body">
                Create your account for Facial Recognition DUT
              </p>
            </div>
          </div>

          {/* 1️⃣5️⃣ Registration form card */}
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

            {/* Registration form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username input */}
              <FormInput
                label="Username"
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                error={errors.username}
                variant={errors.username ? 'error' : 'default'}
                helperText="This will be your public username."
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                required
              />

              {/* Password input with strength indicator */}
              <div className="space-y-2">
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
                
                {/* Password strength indicator */}
                {formData.password && (
                  <div className="px-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-body text-gray-400">Password Strength:</span>
                      <span className={`text-sm font-semibold ${strengthInfo.textColor}`}>
                        {strengthInfo.text}
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${strengthInfo.color}`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password input */}
              <FormInput
                label="Confirm Password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                error={errors.confirmPassword}
                variant={errors.confirmPassword ? 'error' : 'default'}
                showPasswordToggle
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-400 font-body">
                  Already have an account?
                </span>
              </div>
            </div>

            {/* Login link */}
            <div className="text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-neon-blue hover:text-neon-purple transition-colors duration-300 font-semibold font-body group"
              >
                Sign in instead
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* 1️⃣6️⃣ Security features section */}
          <div className="text-center space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse"></div>
                  <span>Encrypted</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse"></div>
                  <span>Secure</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-neon-purple rounded-full animate-pulse"></div>
                  <span>Private</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
