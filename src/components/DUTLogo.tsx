import React from 'react';

interface DUTLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  animated?: boolean;
  className?: string;
}

export default function DUTLogo({ size = 'md', animated = true, className = '' }: DUTLogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      {/* Main Logo Container */}
      <div className={`relative ${sizeClasses[size]} ${animated ? 'animate-float' : ''}`}>
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-spin" style={{ animationDuration: '8s' }}>
          <div className="absolute top-0 left-1/2 w-1 h-1 bg-cyan-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-purple-400 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        {/* Inner Ring */}
        <div className="absolute inset-1 rounded-full border border-purple-400 animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }}>
          <div className="absolute top-1/2 right-0 w-1 h-1 bg-green-400 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-0 w-1 h-1 bg-pink-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        {/* Center Core */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 flex items-center justify-center">
          <div className="text-white font-bold text-cyber" style={{ fontSize: size === 'xl' ? '12px' : size === 'lg' ? '8px' : '6px' }}>
            DUT
          </div>
        </div>
        
        {/* Glow Effect */}
        {animated && (
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 opacity-30 blur-md animate-cyber-pulse"></div>
        )}
      </div>
      
      {/* Holographic Overlay */}
      {animated && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-holographic opacity-50"></div>
      )}
    </div>
  );
}