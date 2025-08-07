// 1️⃣ Import React, routing, and our components
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
      {/* 4️⃣ Provide authentication context to all components */}
      <AuthProvider>
        <div className="App">
          {/* 5️⃣ Header component (conditionally rendered based on route) */}
          <Header />
          
          {/* 6️⃣ Main content area with route definitions */}
          <main>
            <Routes>
              {/* 7️⃣ Public routes - accessible without authentication */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              
              {/* 8️⃣ Protected routes - require authentication */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              
              {/* 9️⃣ Default route - redirect to appropriate page */}
              <Route 
                path="/" 
                element={<Navigate to="/dashboard" replace />} 
              />
              
              {/* 🔟 Catch-all route - redirect unknown paths */}
              <Route 
                path="*" 
                element={<Navigate to="/dashboard" replace />} 
              />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
