// 1️⃣ Import React and navigation hooks
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 2️⃣ Header component with futuristic navigation bar
export default function Header() {
  // 3️⃣ Get current user and logout function from auth context
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // 4️⃣ Handle logout button click
  async function handleLogout() {
    try {
      await logout();           // Call Firebase logout
      navigate('/login');       // Redirect to login page
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  }

  return (
    // 5️⃣ Main header container with glassmorphism effect
    <header className="glass-card mx-4 mt-4 px-6 py-4">
      <nav className="flex items-center justify-between">
        {/* 6️⃣ Logo section with neon glow effect */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full animate-pulse"></div>
          <Link 
            to="/" 
            className="text-xl font-bold bg-gradient-to-r from-neon-blue to-neon-purple bg-clip-text text-transparent hover:animate-glow transition-all duration-300"
          >
            Facial Recognition DUT
          </Link>
        </div>

        {/* 7️⃣ Navigation links - different options based on login status */}
        <div className="flex items-center space-x-4">
          {currentUser ? (
            // 8️⃣ Logged in user navigation
            <>
              {/* Welcome message with user email */}
              <span className="text-gray-300 hidden md:inline">
                Welcome, {currentUser.email}
              </span>
              
              {/* Dashboard link */}
              <Link
                to="/dashboard"
                className="px-4 py-2 rounded-lg border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition-all duration-300 hover:shadow-lg hover:shadow-neon-blue/50"
              >
                Dashboard
              </Link>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition-all duration-300 hover:shadow-lg hover:shadow-red-400/50"
              >
                Logout
              </button>
            </>
          ) : (
            // 9️⃣ Guest user navigation
            <>
              {/* Login link */}
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg border border-neon-blue text-neon-blue hover:bg-neon-blue hover:text-black transition-all duration-300 hover:shadow-lg hover:shadow-neon-blue/50"
              >
                Login
              </Link>
              
              {/* Register button with neon effect */}
              <Link
                to="/register"
                className="neon-button"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
} 