// 1️⃣ Import React Router and our components
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';

// 2️⃣ Main App component with routing and authentication
function App() {
  return (
    // 3️⃣ Wrap entire app with Router for navigation
    <Router>
      {/* 4️⃣ Wrap with AuthProvider to provide auth context to all components */}
      <AuthProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900">
          {/* 5️⃣ Header component shows on all pages */}
          <Header />
          
          {/* 6️⃣ Define all application routes */}
          <Routes>
            {/* 7️⃣ Default route redirects to login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* 8️⃣ Public routes - accessible without authentication */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* 9️⃣ Protected routes - require authentication */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* 🔟 Catch-all route for undefined paths */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

// 1️⃣1️⃣ Export App component as default
export default App;
