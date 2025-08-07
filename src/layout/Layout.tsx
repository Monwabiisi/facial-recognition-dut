// 1️⃣ Import React for component creation
import React, { ReactNode } from 'react';

// 2️⃣ Interface for Layout component props
interface LayoutProps {
  children: ReactNode;
  className?: string;
  showPadding?: boolean;
}

// 3️⃣ Layout component that provides consistent wrapper for all pages
export default function Layout({ 
  children, 
  className = '', 
  showPadding = true 
}: LayoutProps) {
  return (
    // 4️⃣ Main container with animated gradient background
    <div className="min-h-screen animated-bg relative overflow-hidden">
      {/* 5️⃣ Animated background elements for extra visual appeal */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating orbs for ambient lighting effect */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-neon-blue/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-3/4 w-48 h-48 bg-neon-pink/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>
      
      {/* 6️⃣ Content wrapper with optional padding */}
      <div className={`relative z-10 ${showPadding ? 'mobile-padding py-6' : ''} ${className}`}>
        {/* 7️⃣ Container with max width for large screens */}
        <div className="container-custom">
          {children}
        </div>
      </div>
      
      {/* 8️⃣ Subtle grid overlay for futuristic feel */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 245, 255, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 245, 255, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>
    </div>
  );
}
