import React from 'react';
import { format } from 'date-fns';
import { attendanceService } from '../services/attendanceService';

interface ExportButtonProps {
  classId: string;
  sessionId?: string;
  label?: string;
}

export default function ExportAttendanceButton({ 
  classId, 
  sessionId,
  label = 'Export CSV'
}: ExportButtonProps) {
  const [loading, setLoading] = React.useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);
      const csv = await attendanceService.exportAttendanceCSV(classId, sessionId);
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', 
        `attendance_${sessionId || 'all'}_${format(new Date(), 'yyyy-MM-dd')}.csv`
      );
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
    >
      {loading ? 'Exporting...' : label}
    </button>
  );
}
