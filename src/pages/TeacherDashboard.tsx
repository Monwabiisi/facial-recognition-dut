// src/pages/TeacherDashboard.tsx
import React, { useState, useEffect } from 'react';

type Record = {
  userId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  notes?: string;
};

type Grade = {
  userId: string;
  presentCount: number;
};

const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'records' | 'grades'>('records');
  const [records, setRecords] = useState<Record[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load initial data
    fetchRecords();
    fetchGrades();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      // Fetch attendance records from your service
      // const data = await attendanceService.getRecords();
      // setRecords(data);
    } catch (error) {
      console.error('Failed to fetch records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGrades = async () => {
    setLoading(true);
    try {
      // Fetch grades from your service
      // const data = await attendanceService.getGrades();
      // setGrades(data);
    } catch (error) {
      console.error('Failed to fetch grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, status: 'present' | 'absent' | 'late') => {
    try {
      // Update status in your service
      // await attendanceService.updateStatus(userId, status);
      // Refresh records
      await fetchRecords();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleNotesChange = async (userId: string, notes: string) => {
    try {
      // Update notes in your service
      // await attendanceService.updateNotes(userId, notes);
      // Refresh records
      await fetchRecords();
    } catch (error) {
      console.error('Failed to update notes:', error);
    }
  };

  const handleRecomputeGrades = async () => {
    setLoading(true);
    try {
      // Call your Cloud Function to recompute grades
      // await attendanceService.recomputeGrades();
      // Refresh grades
      await fetchGrades();
    } catch (error) {
      console.error('Failed to recompute grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = (data: any[], filename: string) => {
    // Implement CSV export
    const csvContent = "data:text/csv;charset=utf-8," + data.map(row => 
      Object.values(row).join(",")
    ).join("\n");
    
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Teacher Dashboard</h1>

      {/* Tab Navigation */}
      <div className="flex border-b mb-6">
        <button
          className={`py-2 px-4 ${
            activeTab === 'records'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('records')}
        >
          Records
        </button>
        <button
          className={`py-2 px-4 ${
            activeTab === 'grades'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500'
          }`}
          onClick={() => setActiveTab('grades')}
        >
          Grades
        </button>
      </div>

      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : activeTab === 'records' ? (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="flex justify-end p-4">
            <button
              onClick={() => exportToCSV(records, 'attendance-records.csv')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={`${record.userId}-${record.timestamp}`}>
                  <td className="px-6 py-4">{record.userId}</td>
                  <td className="px-6 py-4">{record.timestamp}</td>
                  <td className="px-6 py-4">
                    <select
                      value={record.status}
                      onChange={(e) => 
                        handleStatusChange(
                          record.userId, 
                          e.target.value as 'present' | 'absent' | 'late'
                        )
                      }
                      className="border rounded p-1"
                    >
                      <option value="present">Present</option>
                      <option value="absent">Absent</option>
                      <option value="late">Late</option>
                    </select>
                  </td>
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={record.notes || ''}
                      onChange={(e) => 
                        handleNotesChange(record.userId, e.target.value)
                      }
                      className="border rounded p-1"
                      placeholder="Add notes..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="flex justify-between p-4">
            <button
              onClick={handleRecomputeGrades}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Recompute Totals
            </button>
            <button
              onClick={() => exportToCSV(grades, 'attendance-grades.csv')}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Export CSV
            </button>
          </div>
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Student ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Present Count
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {grades.map((grade) => (
                <tr key={grade.userId}>
                  <td className="px-6 py-4">{grade.userId}</td>
                  <td className="px-6 py-4">{grade.presentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
