// 1️⃣ Import React, navigation hooks, and our custom components
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import { IconButton } from './Button';

// 2️⃣ Header component with futuristic navigation bar
export default function Header() {
  // 3️⃣ State for mobile menu toggle
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // 4️⃣ Get current user, logout function, navigation, and current location
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // 5️⃣ Handle logout with loading state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // 6️⃣ Check if current route is active
  const isActiveRoute = (path: string) => location.pathname === path;

  // 7️⃣ Don't show header on login/register pages for cleaner look
  if (location.pathname === '/login' || location.pathname === '/register') {
    return null;
  }

  return (
    // 8️⃣ Main header container with glassmorphism effect
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/5 border-b border-white/10">
      <div className="container-custom">
        <nav className="flex items-center justify-between py-4">
          
          {/* 9️⃣ Logo section with animated elements */}
          <div className="flex items-center space-x-3">
            {/* Animated logo icon */}
            <div className="relative group">
              <div className="w-10 h-10 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl flex items-center justify-center animate-float group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-neon-blue to-neon-purple rounded-xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
            </div>
            
            {/* Brand name */}
            <Link 
              to={currentUser ? "/dashboard" : "/"}
              className="text-xl font-bold font-heading gradient-text hover:scale-105 transition-transform duration-300"
            >
              Facial Recognition DUT
            </Link>
          </div>

          {/* 🔟 Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {currentUser ? (
              // Authenticated user navigation
              <>
                {/* Dashboard link */}
                <Link
                  to="/dashboard"
                  className={`px-4 py-2 rounded-lg font-medium font-body transition-all duration-300 ${
                    isActiveRoute('/dashboard')
                      ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Dashboard
                </Link>
                
                {/* User info with avatar */}
                <div className="flex items-center space-x-3 px-4 py-2 bg-white/5 rounded-lg border border-white/10">
                  {/* User avatar placeholder */}
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-purple to-neon-pink rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  
                  {/* User email (truncated on smaller screens) */}
                  <span className="text-gray-300 font-body text-sm max-w-32 truncate">
                    {currentUser.email}
                  </span>
                </div>
                
                {/* Logout button */}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  loading={isLoggingOut}
                  icon={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  }
                >
                  {isLoggingOut ? 'Signing Out...' : 'Logout'}
                </Button>
              </>
            ) : (
              // Guest user navigation
              <>
                <Link
                  to="/login"
                  className={`px-4 py-2 rounded-lg font-medium font-body transition-all duration-300 ${
                    isActiveRoute('/login')
                      ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Login
                </Link>
                
                <Button
                  as={Link}
                  to="/register"
                  variant="primary"
                  size="sm"
                >
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* 1️⃣1️⃣ Mobile menu button */}
          <div className="md:hidden">
            <IconButton
              icon={
                isMobileMenuOpen ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )
              }
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
              variant="ghost"
            />
          </div>
        </nav>

        {/* 1️⃣2️⃣ Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 py-4 animate-slide-up">
            <div className="space-y-3">
              {currentUser ? (
                // Authenticated mobile menu
                <>
                  {/* User info */}
                  <div className="flex items-center space-x-3 px-4 py-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-10 h-10 bg-gradient-to-r from-neon-purple to-neon-pink rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold font-body">Welcome back!</p>
                      <p className="text-gray-400 text-sm font-body truncate">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dashboard link */}
                  <Link
                    to="/dashboard"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg font-medium font-body transition-all duration-300 ${
                      isActiveRoute('/dashboard')
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    📊 Dashboard
                  </Link>
                  
                  {/* Logout button */}
                  <Button
                    variant="danger"
                    fullWidth
                    onClick={handleLogout}
                    loading={isLoggingOut}
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                    }
                  >
                    {isLoggingOut ? 'Signing Out...' : 'Logout'}
                  </Button>
                </>
              ) : (
                // Guest mobile menu
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-4 py-3 rounded-lg font-medium font-body transition-all duration-300 ${
                      isActiveRoute('/login')
                        ? 'bg-neon-blue/20 text-neon-blue border border-neon-blue/30'
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    🔐 Login
                  </Link>
                  
                  <Button
                    as={Link}
                    to="/register"
                    variant="primary"
                    fullWidth
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    🚀 Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
