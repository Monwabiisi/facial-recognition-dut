import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function UserMenu() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative group">
      <button
        className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
      >
        <span className="text-sm font-medium">{currentUser.email}</span>
      </button>
      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none hidden group-hover:block">
        <button
          onClick={handleLogout}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
