interface User {
  id: number;
  student_id: string;
  name: string;
  role: string;
}

interface AttendanceSession {
  id: number;
  records: AttendanceRecord[];
}

interface AttendanceRecord {
  id: number;
  user_id: number;
  confidence: number;
}

interface TopPerformer {
  id: number;
  name: string;
  student_id: string;
  attendance_rate: number;
}

interface RecentActivity {
  id: number;
  student_name: string;
  status: string;
  timestamp: string;
  confidence: number;
}

interface AnalyticsData {
  totalStudents: number;
  presentToday: number;
  attendanceRate: number;
  weeklyTrend: number;
  monthlyData: {
    labels: string[];
    attendance: number[];
    total: number[];
  };
  topPerformers: Array<{
    name: string;
    studentId: string;
    rate: number;
  }>;
  recentActivity: Array<{
    id: string;
    student: string;
    action: string;
    timestamp: Date;
    confidence: number;
  }>;
}

export const fetchAnalytics = async (period: 'week' | 'month' | 'semester'): Promise<AnalyticsData> => {
  // Get total students
  const studentsResponse = await fetch('/api/users');
  const students: User[] = await studentsResponse.json();
  const totalStudents = students.filter(s => s.role === 'student').length;

  // Get attendance for today
  const today = new Date().toISOString().split('T')[0];
  const attendanceResponse = await fetch(`/api/attendance/sessions?date=${today}`);
  const todayAttendance = await attendanceResponse.json();
  const presentToday = new Set(todayAttendance.flatMap(s => s.records || [])).size;

  // Calculate attendance rate
  const attendanceRate = totalStudents ? (presentToday / totalStudents * 100) : 0;

  // Get weekly trend
  const lastWeekDate = new Date();
  lastWeekDate.setDate(lastWeekDate.getDate() - 7);
  const lastWeekResponse = await fetch(`/api/attendance/sessions?date=${lastWeekDate.toISOString().split('T')[0]}`);
  const lastWeekAttendance = await lastWeekResponse.json();
  const lastWeekPresent = new Set(lastWeekAttendance.flatMap(s => s.records || [])).size;
  const weeklyTrend = lastWeekPresent ? ((presentToday - lastWeekPresent) / lastWeekPresent * 100) : 0;

  // Get monthly data
  const getMonthlyLabels = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weeks.unshift(`Week ${i + 1}`);
    }
    return weeks;
  };

  const monthlyLabels = getMonthlyLabels();
  const monthlyAttendance = await Promise.all(
    monthlyLabels.map(async (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (index * 7));
      const response = await fetch(`/api/attendance/sessions?date=${date.toISOString().split('T')[0]}`);
      const data = await response.json();
      return new Set(data.flatMap(s => s.records || [])).size;
    })
  );

  // Get top performers
  const topPerformersResponse = await fetch('/api/attendance/top-performers');
  const topPerformers = await topPerformersResponse.json();

  // Get recent activity
  const recentActivityResponse = await fetch('/api/attendance/recent');
  const recentActivity = await recentActivityResponse.json();

  return {
    totalStudents,
    presentToday,
    attendanceRate,
    weeklyTrend,
    monthlyData: {
      labels: monthlyLabels,
      attendance: monthlyAttendance,
      total: monthlyLabels.map(() => totalStudents)
    },
    topPerformers: topPerformers.map(p => ({
      name: p.name,
      studentId: p.student_id,
      rate: p.attendance_rate
    })),
    recentActivity: recentActivity.map(a => ({
      id: a.id.toString(),
      student: a.student_name,
      action: a.status,
      timestamp: new Date(a.timestamp),
      confidence: a.confidence
    }))
  };
};
