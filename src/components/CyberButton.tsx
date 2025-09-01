import React, { ReactNode, ButtonHTMLAttributes } from 'react';

interface CyberButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  loading?: boolean;
  glowColor?: string;
  children: ReactNode;
  fullWidth?: boolean;
}

export default function CyberButton({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  glowColor,
  children,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: CyberButtonProps) {
  const baseClasses = `
    relative overflow-hidden font-bold text-cyber transition-all duration-300
    focus:outline-none focus-cyber transform-gpu will-change-transform
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    ${fullWidth ? 'w-full' : ''}
  `;

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-lg rounded-2xl',
    xl: 'px-10 py-5 text-xl rounded-3xl'
  };

  const variantClasses = {
    primary: `
      bg-gradient-to-r from-cyan-500 to-purple-600
      text-white border-0
      hover:from-cyan-400 hover:to-purple-500
      hover:shadow-2xl hover:shadow-cyan-500/50
      hover:scale-105 active:scale-95
    `,
    secondary: `
      bg-transparent border-2 border-cyan-400 text-cyan-400
      hover:bg-cyan-400 hover:text-black
      hover:shadow-lg hover:shadow-cyan-400/50
      hover:scale-105 active:scale-95
    `,
    danger: `
      bg-gradient-to-r from-red-500 to-pink-500
      text-white border-0
      hover:from-red-400 hover:to-pink-400
      hover:shadow-lg hover:shadow-red-500/50
      hover:scale-105 active:scale-95
    `,
    success: `
      bg-gradient-to-r from-green-400 to-emerald-500
      text-white border-0
      hover:from-green-300 hover:to-emerald-400
      hover:shadow-lg hover:shadow-green-400/50
      hover:scale-105 active:scale-95
    `,
    ghost: `
      bg-white/5 backdrop-blur-sm border border-white/20 text-white
      hover:bg-white/10 hover:border-white/30
      hover:scale-105 active:scale-95
    `
  };

  const glowStyle = glowColor ? {
    boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}50`
  } : {};

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={glowStyle}
      disabled={disabled || loading}
      {...props}
    >
      {/* Shimmer Effect */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] skew-x-12 transition-transform duration-700 group-hover:translate-x-[100%]"></span>
      
      {/* Scan Line Effect */}
      <span className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-scan"></span>
      
      {/* Content */}
      <span className="relative flex items-center justify-center gap-2">
        {loading ? (
          <div className="loading-spinner"></div>
        ) : (
          <>
            {icon && <span className="flex-shrink-0">{icon}</span>}
            <span>{children}</span>
          </>
        )}
      </span>
      
      {/* Corner Accents */}
      <span className="absolute top-1 left-1 w-2 h-2 border-l-2 border-t-2 border-white/30"></span>
      <span className="absolute top-1 right-1 w-2 h-2 border-r-2 border-t-2 border-white/30"></span>
      <span className="absolute bottom-1 left-1 w-2 h-2 border-l-2 border-b-2 border-white/30"></span>
      <span className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-white/30"></span>
    </button>
  );
}