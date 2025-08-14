import React from 'react';
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
  ChartData,
  ChartOptions
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { startOfWeek, eachDayOfInterval, format, subWeeks } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface AttendanceRecord {
  date: Date;
  present: boolean;
  sessionId?: string;
}

interface Props {
  records: AttendanceRecord[];
  title?: string;
  type?: 'line' | 'bar';
  period?: 'week' | 'month';
}

export const AttendanceStats: React.FC<Props> = ({
  records,
  title = 'Attendance Overview',
  type = 'line',
  period = 'week'
}) => {
  // Process attendance data
  const processAttendanceData = () => {
    const startDate = startOfWeek(subWeeks(new Date(), period === 'week' ? 1 : 4));
    const dates = eachDayOfInterval({
      start: startDate,
      end: new Date()
    });

    const labels = dates.map(date => format(date, 'MMM dd'));
    const data = dates.map(date => {
      const dayRecords = records.filter(record => 
        format(record.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      );
      return dayRecords.filter(r => r.present).length;
    });

    return { labels, data };
  };

  const { labels, data } = processAttendanceData();

  const chartData: ChartData<'line' | 'bar'> = {
    labels,
    datasets: [
      {
        label: 'Attendance',
        data,
        borderColor: 'rgb(0, 102, 204)',
        backgroundColor: 'rgba(0, 102, 204, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const options: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: title,
        color: 'rgb(55, 65, 81)',
        font: {
          size: 16,
          weight: '600',
          family: 'Inter var, system-ui, sans-serif'
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeOutQuart'
    }
  };

  const ChartComponent = type === 'line' ? Line : Bar;

  return (
    <div className="p-6 bg-white rounded-xl shadow-sm">
      <ChartComponent data={chartData} options={options} />
      
      {/* Summary statistics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-sm text-gray-500">Total Sessions</div>
          <div className="text-2xl font-semibold text-primary">
            {records.length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Present</div>
          <div className="text-2xl font-semibold text-interface-success">
            {records.filter(r => r.present).length}
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-500">Attendance Rate</div>
          <div className="text-2xl font-semibold text-primary">
            {((records.filter(r => r.present).length / records.length) * 100).toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
};
