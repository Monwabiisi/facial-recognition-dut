import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import { AuthContext } from './contexts/AuthContext';

test('renders login page', () => {
    const mockAuthContext = {
    currentUser: null,
    loading: false,
    login: async () => {},
    logout: async () => {},
    register: async () => {},
    userRole: null,
  };

  render(
    <AuthContext.Provider value={mockAuthContext}>
        <MemoryRouter>
            <LoginPage />
        </MemoryRouter>
    </AuthContext.Provider>
  );
  const headingElement = screen.getByRole('heading', { name: /welcome back/i });
  expect(headingElement).toBeInTheDocument();
});
