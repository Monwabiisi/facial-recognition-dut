import React, { ReactNode } from 'react';
import ParticleBackground from './ParticleBackground';
import FuturisticHeader from './FuturisticHeader';

interface FuturisticLayoutProps {
  children: ReactNode;
  className?: string;
  showParticles?: boolean;
}

export default function FuturisticLayout({ 
  children, 
  className = '', 
  showParticles = true 
}: FuturisticLayoutProps) {
  return (
    <div className="min-h-screen bg-animated relative overflow-hidden">
      {/* Particle Background */}
      {showParticles && <ParticleBackground />}
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl floating-delayed"></div>
        <div className="absolute top-1/2 left-3/4 w-48 h-48 bg-green-400/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        
        {/* Matrix Rain Effect */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-cyan-400 font-mono text-xs animate-matrix"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${10 + Math.random() * 10}s`
              }}
            >
              {Array.from({ length: 20 }).map((_, j) => (
                <div key={j} className="opacity-70">
                  {Math.random() > 0.5 ? '1' : '0'}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {/* Header */}
      <FuturisticHeader />
      
      {/* Main Content */}
      <main className={`relative z-10 pt-20 ${className}`}>
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      
      {/* Cyber Grid Overlay */}
      <div className="fixed inset-0 cyber-grid opacity-5 pointer-events-none z-0"></div>
      
      {/* Corner UI Elements */}
      <div className="fixed top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-cyan-400/50 pointer-events-none z-40"></div>
      <div className="fixed top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-cyan-400/50 pointer-events-none z-40"></div>
      <div className="fixed bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-cyan-400/50 pointer-events-none z-40"></div>
      <div className="fixed bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-cyan-400/50 pointer-events-none z-40"></div>
    </div>
  );
}