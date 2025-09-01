import React, { InputHTMLAttributes, useState, useEffect, forwardRef } from 'react';

interface CyberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  type?: 'text' | 'email' | 'password' | 'number';
  icon?: React.ReactNode;
  error?: string;
  success?: string;
  helperText?: string;
  variant?: 'default' | 'error' | 'success';
  showPasswordToggle?: boolean;
  glowColor?: string;
}

const CyberInput = forwardRef<HTMLInputElement, CyberInputProps>(({
  label,
  type = 'text',
  icon,
  error,
  success,
  helperText,
  variant = 'default',
  showPasswordToggle = false,
  glowColor,
  className = '',
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [hasValue, setHasValue] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;

  useEffect(() => {
    setHasValue(Boolean(value && String(value).length > 0));
  }, [value]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const shouldFloat = isFocused || hasValue;

  const getVariantClasses = () => {
    switch (variant) {
      case 'error':
        return 'border-red-400 focus:border-red-400';
      case 'success':
        return 'border-green-400 focus:border-green-400';
      default:
        return 'border-white/20 focus:border-cyan-400 hover:border-white/30';
    }
  };

  const inputClasses = `
    w-full px-4 py-4 rounded-xl
    bg-white/5 backdrop-blur-sm
    border text-white placeholder-transparent
    font-mono text-base
    transition-all duration-300 ease-out
    focus:outline-none focus:bg-white/10
    ${getVariantClasses()}
    ${icon ? 'pl-12' : ''}
    ${showPasswordToggle && type === 'password' ? 'pr-12' : ''}
    ${className}
  `;

  const labelClasses = `
    absolute left-4 font-mono pointer-events-none
    transition-all duration-300 ease-out origin-left
    ${shouldFloat 
      ? '-translate-y-6 translate-x-0 scale-75 text-cyan-400 neon-text' 
      : 'top-4 text-gray-400'
    }
    ${icon && !shouldFloat ? 'left-12' : shouldFloat ? 'left-4' : ''}
  `;

  const glowStyle = glowColor && isFocused ? {
    boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}30`
  } : {};

  return (
    <div className="w-full space-y-2">
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-4 text-gray-400 z-10">
            {icon}
          </div>
        )}

        {/* Input Field */}
        <input
          ref={ref}
          type={inputType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={inputClasses}
          style={glowStyle}
          placeholder=" "
          {...props}
        />

        {/* Floating Label */}
        <label className={labelClasses}>
          {label}
        </label>

        {/* Password Toggle */}
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Focus Ring */}
        {isFocused && (
          <div className="absolute inset-0 rounded-xl border-2 border-cyan-400/50 pointer-events-none animate-cyber-pulse"></div>
        )}

        {/* Scan Line */}
        {isFocused && (
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan"></div>
        )}
      </div>

      {/* Helper Text */}
      {(error || success || helperText) && (
        <div className="px-1">
          {error && (
            <p className="text-red-400 text-sm font-mono flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          
          {success && !error && (
            <p className="text-green-400 text-sm font-mono flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {success}
            </p>
          )}
          
          {helperText && !error && !success && (
            <p className="text-gray-400 text-sm font-mono">
              {helperText}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

CyberInput.displayName = 'CyberInput';

export default CyberInput;