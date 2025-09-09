import React, { useState } from 'react';
import CyberButton from './CyberButton';
import CyberInput from './CyberInput';
import { useAuth } from '../contexts/AuthContext';

interface AdminKeyLoginProps {
  onSuccess: (user: any) => void;
  onError: (error: string) => void;
  onClose: () => void;
}

export default function AdminKeyLogin({ onSuccess, onError, onClose }: AdminKeyLoginProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { loginWithAdminKey } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginWithAdminKey(pin);
      onSuccess({ role: 'admin' }); // Pass a user object indicating success
    } catch (err: any) {
      const errorMessage = err.message || '❌ Invalid Admin Key.';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePinChange = (value: string) => {
    // Only allow digits and limit to 6 characters
    const numericValue = value.replace(/\D/g, '').slice(0, 6);
    setPin(numericValue);
    if (error) setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-8 max-w-md w-full space-y-6 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold gradient-text mb-2">
              ADMIN ACCESS
            </h2>
            <p className="text-gray-300 font-mono text-sm">
              Enter 6-digit admin PIN
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-slide-up">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-400 font-mono text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* PIN Input Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <CyberInput
            label="Admin PIN"
            type="password"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            error={error && !error.includes('❌') ? error : ''}
            variant={error && !error.includes('❌') ? 'error' : 'default'}
            placeholder="000000"
            maxLength={6}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            required
          />

          <div className="flex gap-4">
            <CyberButton
              type="button"
              variant="secondary"
              fullWidth
              onClick={onClose}
              className="flex-1"
            >
              CANCEL
            </CyberButton>
            
            <CyberButton
              type="submit"
              loading={loading}
              fullWidth
              className="flex-1"
              glowColor="#FF0000"
              disabled={pin.length !== 6}
            >
              {loading ? 'AUTHENTICATING...' : 'ACCESS ADMIN'}
            </CyberButton>
          </div>
        </form>

        {/* Security Notice */}
        <div className="text-center">
          <p className="text-xs text-gray-400 font-mono">
            🔒 RESTRICTED ACCESS - ADMIN ONLY
          </p>
        </div>
      </div>
    </div>
  );
}