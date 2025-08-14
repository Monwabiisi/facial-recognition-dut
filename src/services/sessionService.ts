import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  addDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export interface Session {
  id: string;
  title: string;
  description?: string;
  startTime: Timestamp;
  endTime?: Timestamp;
  courseId: string;
  teacherId: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  attendanceCount: number;
  enrolledCount: number;
}

export interface SessionAttendance {
  userId: string;
  sessionId: string;
  timestamp: Timestamp;
  status: 'present' | 'absent' | 'late';
  verificationMethod?: string;
}

const SESSIONS_COLLECTION = 'sessions';
const ATTENDANCE_COLLECTION = 'attendance';

export class SessionService {
  static async createSession(data: Omit<Session, 'id' | 'startTime' | 'attendanceCount'>): Promise<Session> {
    const sessionData = {
      ...data,
      startTime: serverTimestamp(),
      attendanceCount: 0,
      status: 'scheduled' as const
    };

    const docRef = await addDoc(collection(db, SESSIONS_COLLECTION), sessionData);
    return { id: docRef.id, ...sessionData } as Session;
  }

  static async getSession(sessionId: string): Promise<Session | null> {
    const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as Session;
  }

  static async getTeacherSessions(teacherId: string): Promise<Session[]> {
    const q = query(collection(db, SESSIONS_COLLECTION), where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Session[];
  }

  static async updateSessionStatus(
    sessionId: string,
    status: Session['status'],
    endTime?: Date
  ): Promise<void> {
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    
    const updates: any = { status };
    if (endTime) {
      updates.endTime = Timestamp.fromDate(endTime);
    }
    
    await updateDoc(sessionRef, updates);
  }

  static async markAttendance(data: Omit<SessionAttendance, 'timestamp'>): Promise<void> {
    const attendanceData = {
      ...data,
      timestamp: serverTimestamp()
    };

    // Create attendance record
    await addDoc(collection(db, ATTENDANCE_COLLECTION), attendanceData);

    // Update session attendance count
    const sessionRef = doc(db, SESSIONS_COLLECTION, data.sessionId);
    const session = await this.getSession(data.sessionId);
    
    if (session) {
      await updateDoc(sessionRef, {
        attendanceCount: (session.attendanceCount || 0) + 1
      });
    }
  }

  static async getSessionAttendance(sessionId: string): Promise<SessionAttendance[]> {
    const q = query(collection(db, ATTENDANCE_COLLECTION), where('sessionId', '==', sessionId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data()) as SessionAttendance[];
  }

  static async getUserAttendance(userId: string): Promise<SessionAttendance[]> {
    const q = query(collection(db, ATTENDANCE_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => doc.data()) as SessionAttendance[];
  }
}
