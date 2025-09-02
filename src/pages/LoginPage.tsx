import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DUTLogo from '../components/DUTLogo';
import CyberButton from '../components/CyberButton';
import CyberInput from '../components/CyberInput';
import ParticleBackground from '../components/ParticleBackground';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      
      // Call real login
      await login(formData.email.toLowerCase(), formData.password);

  // Role-based redirect: admin -> admin dashboard
  const API_BASE = (import.meta.env.VITE_API_URL as string || 'http://localhost:5000') + '/api';
  const usersResp = await fetch(`${API_BASE}/users`);
      let role = '';
      if (usersResp.ok) {
        const usersList = await usersResp.json();
        const currentUser = usersList.find((u: any) => (u.email || '').toLowerCase() === formData.email.toLowerCase() || (u.student_id || '').toLowerCase() === formData.email.toLowerCase().split('@')[0]);
        role = currentUser?.role || '';
      } else {
        // If users endpoint failed, fallback to dashboard for safety
        role = '';
      }
      if (role === 'teacher' || role === 'admin') {
        navigate('/admin');
      } else {
        // After login, check how many embeddings this user has and redirect to enrollment if < 10
        try {
          const resp = await fetch(`${API_BASE}/faces`);
          if (resp.ok) {
            const all = await resp.json();
            const userEmail = formData.email.toLowerCase();
            // match by email field from joined query
            const userEmbeddings = all.filter((r: any) => (r.email || '').toLowerCase() === userEmail || (r.student_id || '').toLowerCase() === userEmail.split('@')[0]);
            if (userEmbeddings.length < 10) {
              navigate('/enroll');
            } else {
              navigate('/dashboard');
            }
          } else {
            navigate('/dashboard');
          }
        } catch (err) {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Login failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen animated-bg relative overflow-hidden">
      <ParticleBackground />
      
      {/* Floating Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          
          {/* Header */}
          <div className="text-center space-y-6">
            <DUTLogo size="xl" animated />
            
            <div>
              <h1 className="text-5xl font-bold font-heading gradient-text mb-4">
                WELCOME TO DUT
              </h1>
              <p className="text-xl text-gray-300 font-body">
                Facial Recognition Attendance System
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                  <span className="font-mono">SECURE</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-cyber-pulse"></div>
                  <span className="font-mono">AI-POWERED</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-cyber-pulse"></div>
                  <span className="font-mono">REAL-TIME</span>
                </div>
              </div>
            </div>
          </div>

          {/* Login Form */}
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

              <CyberButton
                type="submit"
                loading={loading}
                fullWidth
                size="lg"
                className="mt-8"
                glowColor="#00F5FF"
              >
                {loading ? 'AUTHENTICATING...' : 'LOGIN TO SYSTEM'}
              </CyberButton>
            </form>

            {/* Biometric Login Option */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-gray-400 font-mono">
                  OR USE BIOMETRIC LOGIN
                </span>
              </div>
            </div>

            <CyberButton
              variant="secondary"
              fullWidth
              size="lg"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                </svg>
              }
              glowColor="#BF00FF"
            >
              🔒 FACE ID LOGIN
            </CyberButton>

            {/* Register Link */}
            <div className="text-center">
              <Link 
                to="/register" 
                className="inline-flex items-center gap-2 text-cyan-400 hover:text-purple-400 transition-colors duration-300 font-mono group"
              >
                CREATE NEW ACCOUNT
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-green-400 font-mono">SYSTEM ONLINE</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-cyan-400 font-mono">AI READY</span>
              </div>
              <div className="w-px h-4 bg-white/20"></div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-cyber-pulse"></div>
                <span className="text-purple-400 font-mono">SECURE</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Corner UI Elements */}
      <div className="fixed top-4 left-4 w-12 h-12 border-l-2 border-t-2 border-cyan-400/50 pointer-events-none"></div>
      <div className="fixed top-4 right-4 w-12 h-12 border-r-2 border-t-2 border-cyan-400/50 pointer-events-none"></div>
      <div className="fixed bottom-4 left-4 w-12 h-12 border-l-2 border-b-2 border-cyan-400/50 pointer-events-none"></div>
      <div className="fixed bottom-4 right-4 w-12 h-12 border-r-2 border-b-2 border-cyan-400/50 pointer-events-none"></div>
    </div>
  );
}