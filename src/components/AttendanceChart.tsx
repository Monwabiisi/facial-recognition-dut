import React, { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AttendanceChartProps {
  data: {
    labels: string[];
    attendance: number[];
    total: number[];
  };
  className?: string;
}

export default function AttendanceChart({ data, className = '' }: AttendanceChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        label: 'Attendance Rate',
        data: data.attendance.map((att, i) => (att / data.total[i]) * 100),
        borderColor: '#00F5FF',
        backgroundColor: 'rgba(0,245,255,0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#00F5FF',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#BF00FF',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 3,
      },
      {
        label: 'Target (85%)',
        data: Array(data.labels.length).fill(85),
        borderColor: '#39FF14',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#ffffff',
          font: {
            family: 'Orbitron, monospace',
            size: 12,
          },
          usePointStyle: true,
          pointStyle: 'circle',
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        titleColor: '#00F5FF',
        bodyColor: '#ffffff',
        borderColor: '#00F5FF',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        titleFont: {
          family: 'Orbitron, monospace',
          size: 14,
          weight: 'bold',
        },
        bodyFont: {
          family: 'Exo 2, sans-serif',
          size: 12,
        },
        callbacks: {
          title: (context: any) => {
            return `📅 ${context[0].label}`;
          },
          label: (context: any) => {
            if (context.datasetIndex === 0) {
              return `📊 Attendance: ${context.parsed.y.toFixed(1)}%`;
            }
            return `🎯 Target: ${context.parsed.y}%`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(0,245,255,0.1)',
          lineWidth: 1,
        },
        ticks: {
          color: '#ffffff',
          font: {
            family: 'Orbitron, monospace',
            size: 10,
          }
        },
        border: {
          color: 'rgba(0,245,255,0.3)',
        }
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(0,245,255,0.1)',
          lineWidth: 1,
        },
        ticks: {
          color: '#ffffff',
          font: {
            family: 'Orbitron, monospace',
            size: 10,
          },
          callback: (value: any) => `${value}%`
        },
        border: {
          color: 'rgba(0,245,255,0.3)',
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart',
      delay: (context: any) => context.dataIndex * 100,
    },
    elements: {
      point: {
        hoverBorderWidth: 3,
      },
      line: {
        borderJoinStyle: 'round' as const,
        borderCapStyle: 'round' as const,
      }
    }
  };

  return (
    <div className={`glass-card p-6 hover-lift ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-cyber gradient-text">
          📈 ATTENDANCE ANALYTICS
        </h3>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-cyber-pulse"></div>
          <span className="text-green-400 font-mono text-sm">LIVE DATA</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="relative h-64 mb-4">
        <Line ref={chartRef} data={chartData} options={options} />
        
        {/* Holographic Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-holographic pointer-events-none rounded-lg"></div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {data.attendance.reduce((a, b) => a + b, 0)}
          </div>
          <div className="text-xs text-gray-400 font-mono uppercase">Total Present</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400 font-mono">
            {Math.round((data.attendance.reduce((a, b) => a + b, 0) / data.total.reduce((a, b) => a + b, 0)) * 100)}%
          </div>
          <div className="text-xs text-gray-400 font-mono uppercase">Average Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400 font-mono">
            {data.labels.length}
          </div>
          <div className="text-xs text-gray-400 font-mono uppercase">Sessions</div>
        </div>
      </div>

      {/* Scan Line Effect */}
      <div className="absolute top-0 left-0 w-full h-full scan-line opacity-20 pointer-events-none rounded-2xl"></div>
    </div>
  );
}