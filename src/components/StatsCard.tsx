import React from 'react';

type Props = {
  icon?: React.ReactNode;
  value: string | number;
  label?: string;
  color?: 'blue' | 'green' | 'purple' | 'gold';
  className?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  animated?: boolean;
};

const colorMap: Record<string, string> = {
  blue: 'from-neon-blue to-neon-purple',
  green: 'from-neon-green to-neon-blue',
  purple: 'from-neon-purple to-neon-pink',
  gold: 'from-yellow-400 to-yellow-600'
};

export default function StatsCard({ 
  icon, 
  value, 
  label, 
  color = 'blue', 
  className = '', 
  trend,
  trendValue,
  animated
}: Props) {
  const grad = colorMap[color] || colorMap.blue;
  
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  return (
    <div className={`stats-card ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-gradient-to-br ${grad} shadow-lg`}>
            <div className="text-white text-xl">{icon ?? '📊'}</div>
          </div>
          <div>
            <div className="text-sm text-white/80">{label}</div>
            <div className="text-2xl font-bold font-heading gradient-text neon-text">{value}</div>
          </div>
        </div>

        <div className="text-xs text-white/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neon-blue animate-glow" />
            <div>Live</div>
          </div>
        </div>
      </div>

      {trend && (
        <div className={`mt-2 text-xs ${
          trend === 'up' ? 'text-green-400' : 
          trend === 'down' ? 'text-red-400' : 
          'text-gray-400'
        }`}>
          {getTrendIcon()} {trendValue}
        </div>
      )}
      
      <div className="mt-4 text-xs text-white/60">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r from-neon-blue to-neon-purple ${
              animated ? 'animate-grow-bar' : ''
            }`} 
            style={{ width: '60%' }} 
          />
        </div>
      </div>
    </div>
  );
}