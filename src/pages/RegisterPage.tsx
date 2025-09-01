import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DUTLogo from '../components/DUTLogo';
import CyberButton from '../components/CyberButton';
import CyberInput from '../components/CyberInput';
import ParticleBackground from '../components/ParticleBackground';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength += 1;
    if (/[a-z]/.test(password)) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    return strength;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'password') {
      setPasswordStrength(calculatePasswordStrength(value));
    }
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name) {
      newErrors.name = 'Full name is required';
    }

    if (!formData.studentId) {
      newErrors.studentId = 'Student ID is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength < 3) {
      newErrors.password = 'Password is too weak';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      setErrors({});
      
      // Simulate registration
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      navigate('/dashboard');
    } catch (error: any) {
      setErrors({ general: error.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

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
        return { color: 'bg-cyan-400', text: 'Good', textColor: 'text-cyan-400' };
      case 5:
        return { color: 'bg-green-400', text: 'Strong', textColor: 'text-green-400' };
      default:
        return { color: 'bg-gray-500', text: '', textColor: 'text-gray-400' };
    }
  };

  const strengthInfo = getPasswordStrengthInfo();

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      <ParticleBackground />
      
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-green-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="text-center space-y-6">
            <DUTLogo size="xl" animated />
            
            <div>
              <h1 className="text-4xl font-bold font-heading gradient-text mb-4">
                JOIN DUT SYSTEM
              </h1>
              <p className="text-lg text-gray-300 font-body">
                Create your account for advanced facial recognition
              </p>
            </div>
          </div>

          {/* Registration Form */}
          <div className="glass-card p-8 space-y-6">
            {/* Error Message */}
            {errors.general && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-slide-up">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-400 font-mono">{errors.general}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <CyberInput
                label="Full Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={errors.name}
                variant={errors.name ? 'error' : 'default'}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                required
              />

              <CyberInput
                label="Student ID"
                value={formData.studentId}
                onChange={(e) => handleInputChange('studentId', e.target.value)}
                error={errors.studentId}
                variant={errors.studentId ? 'error' : 'default'}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                }
                required
              />

              <CyberInput
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={errors.email}
                variant={errors.email ? 'error' : 'default'}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
                required
              />

              <div className="space-y-2">
                <CyberInput
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
                
                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="px-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-gray-400">SECURITY LEVEL:</span>
                      <span className={`text-sm font-bold ${strengthInfo.textColor}`}>
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

              <CyberInput
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

              <CyberButton
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                className="mt-8"
                glowColor="#BF00FF"
              >
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </CyberButton>
            </form>

            {/* Login Link */}
            <div className="text-center">
              <Link 
                to="/login" 
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-purple-400 transition-colors duration-300 font-mono group"
              >
                ALREADY HAVE ACCOUNT?
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Security Features */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold font-heading text-center text-green-400 mb-4">
              🔒 SECURITY FEATURES
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-gray-300 font-mono">256-BIT ENCRYPTION</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-gray-300 font-mono">BIOMETRIC AUTH</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-gray-300 font-mono">GDPR COMPLIANT</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-pink-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-gray-300 font-mono">ZERO TRUST</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corner UI Elements */}
      <div className="fixed top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-purple-400/50 pointer-events-none"></div>
      <div className="fixed top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-purple-400/50 pointer-events-none"></div>
      <div className="fixed bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-purple-400/50 pointer-events-none"></div>
      <div className="fixed bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-purple-400/50 pointer-events-none"></div>
    </div>
  );
}