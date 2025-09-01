import React, { ReactNode, useEffect, useState } from 'react';

interface StatsCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  color?: 'blue' | 'green' | 'purple' | 'pink' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  animated?: boolean;
  className?: string;
}

export default function StatsCard({
  icon,
  value,
  label,
  color = 'blue',
  trend,
  trendValue,
  animated = true,
  className = ''
}: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const colorClasses = {
    blue: 'from-cyan-400 to-blue-500',
    green: 'from-green-400 to-emerald-500',
    purple: 'from-purple-400 to-violet-500',
    pink: 'from-pink-400 to-rose-500',
    orange: 'from-orange-400 to-red-500'
  };

  const glowColors = {
    blue: 'rgba(0,245,255,0.5)',
    green: 'rgba(57,255,20,0.5)',
    purple: 'rgba(191,0,255,0.5)',
    pink: 'rgba(255,20,147,0.5)',
    orange: 'rgba(255,69,0,0.5)'
  };

  // Animate number counting
  useEffect(() => {
    if (!animated || typeof value !== 'number') {
      setDisplayValue(value as number);
      return;
    }

    const timer = setTimeout(() => setIsVisible(true), 100);
    
    if (isVisible) {
      const duration = 2000;
      const steps = 60;
      const increment = value / steps;
      let current = 0;
      
      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(counter);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(counter);
    }

    return () => clearTimeout(timer);
  }, [value, animated, isVisible]);

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <span className="text-green-400">↗️</span>;
      case 'down':
        return <span className="text-red-400">↘️</span>;
      default:
        return <span className="text-gray-400">→</span>;
    }
  };

  return (
    <div className={`stats-card hover-lift hover-glow group cursor-pointer ${className}`}>
      {/* Background Gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${colorClasses[color]} opacity-10 rounded-2xl`}></div>
      
      {/* Scan Line */}
      <div className="absolute top-0 left-0 w-full h-full rounded-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-scan"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} bg-opacity-20 group-hover:scale-110 transition-transform duration-300`}>
            <div className="text-2xl">{icon}</div>
          </div>
          
          {trend && trendValue && (
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                {getTrendIcon()}
                <span className="font-mono">{trendValue}</span>
              </div>
              <div className="text-xs text-gray-400 font-mono">vs last week</div>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          <div className={`text-4xl font-bold text-cyber bg-gradient-to-r ${colorClasses[color]} bg-clip-text text-transparent`}>
            {typeof value === 'number' ? displayValue : value}
          </div>
        </div>

        {/* Label */}
        <div className="text-gray-300 font-mono text-sm uppercase tracking-wider">
          {label}
        </div>

        {/* Holographic Overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-holographic"></div>
      </div>

      {/* Corner Indicators */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors"></div>
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors"></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-cyan-400/50 group-hover:border-cyan-400 transition-colors"></div>
    </div>
  );
});

CyberInput.displayName = 'CyberInput';

export default CyberInput;