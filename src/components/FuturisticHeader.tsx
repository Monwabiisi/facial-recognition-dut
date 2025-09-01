import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DUTLogo from './DUTLogo';
import CyberButton from './CyberButton';

export default function FuturisticHeader() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActiveRoute = (path: string) => location.pathname === path;

  // Don't show header on login/register pages
  if (['/login', '/register'].includes(location.pathname)) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/20 border-b border-white/10">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-cyber-grid opacity-20"></div>
      
      {/* Scan Line Effect */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
      
      <div className="container-custom">
        <nav className="flex items-center justify-between py-4">
          
          {/* Logo Section */}
          <div className="flex items-center space-x-4">
            <DUTLogo size="lg" animated />
            <div className="hidden md:block">
              <Link 
                to={user ? "/dashboard" : "/"}
                className="text-xl font-bold text-cyber gradient-text hover:scale-105 transition-transform duration-300"
              >
                DUT FACIAL RECOGNITION
              </Link>
              <div className="text-xs text-cyan-400 font-mono opacity-70">
                DURBAN UNIVERSITY OF TECHNOLOGY
              </div>
            </div>
          </div>

          {/* Center Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className={`nav-item ${isActiveRoute('/dashboard') ? 'active' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    🎯 <span>Dashboard</span>
                  </span>
                </Link>
                
                <Link
                  to="/camera"
                  className={`nav-item ${isActiveRoute('/camera') ? 'active' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    📹 <span>Camera</span>
                  </span>
                </Link>
                
                <Link
                  to="/analytics"
                  className={`nav-item ${isActiveRoute('/analytics') ? 'active' : ''}`}
                >
                  <span className="flex items-center gap-2">
                    📊 <span>Analytics</span>
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4">
            {/* Time Display */}
            <div className="hidden md:block text-right">
              <div className="text-cyan-400 font-mono text-sm">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-gray-400 font-mono text-xs">
                {currentTime.toLocaleDateString()}
              </div>
            </div>

            {user ? (
              <div className="flex items-center space-x-3">
                {/* User Avatar */}
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400 to-purple-500 p-0.5 animate-glow">
                    <div className="w-full h-full rounded-full bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </span>
                    </div>
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-black animate-cyber-pulse"></div>
                </div>

                {/* User Info */}
                <div className="hidden md:block text-right">
                  <div className="text-white font-semibold text-sm">
                    {user.name || user.email}
                  </div>
                  <div className="text-cyan-400 font-mono text-xs">
                    {user.role?.toUpperCase() || 'USER'}
                  </div>
                </div>

                {/* Logout Button */}
                <CyberButton
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                >
                  LOGOUT
                </CyberButton>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link to="/login">
                  <CyberButton variant="ghost" size="sm">
                    LOGIN
                  </CyberButton>
                </Link>
                <Link to="/register">
                  <CyberButton variant="primary" size="sm">
                    REGISTER
                  </CyberButton>
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-white/5 border border-white/20 hover:bg-white/10 transition-colors"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden border-t border-white/10 py-4 animate-slide-down">
            <div className="space-y-3">
              {user && (
                <>
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="block nav-item"
                  >
                    🎯 Dashboard
                  </Link>
                  <Link
                    to="/camera"
                    onClick={() => setIsMenuOpen(false)}
                    className="block nav-item"
                  >
                    📹 Camera
                  </Link>
                  <Link
                    to="/analytics"
                    onClick={() => setIsMenuOpen(false)}
                    className="block nav-item"
                  >
                    📊 Analytics
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Glow Effect */}
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
    </header>
  );
}