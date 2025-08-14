// src/services/attendance.ts
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from './firebase';

export type AttendanceRecord = {
  userId: string;
  timestamp: string;
  status: 'present' | 'absent' | 'late';
  notes?: string;
  classId: string;
  sessionId: string;
};

export async function recordPresent(userId: string, classId: string, sessionId: string) {
  const record: AttendanceRecord = {
    userId,
    classId,
    sessionId,
    timestamp: new Date().toISOString(),
    status: 'present'
  };

  await addDoc(collection(db, 'attendance'), record);
}

export async function updateStatus(recordId: string, status: 'present' | 'absent' | 'late') {
  const recordRef = doc(db, 'attendance', recordId);
  await updateDoc(recordRef, { status });
}

export async function updateNotes(recordId: string, notes: string) {
  const recordRef = doc(db, 'attendance', recordId);
  await updateDoc(recordRef, { notes });
}

export async function getRecords(classId: string, sessionId: string) {
  const q = query(
    collection(db, 'attendance'),
    where('classId', '==', classId),
    where('sessionId', '==', sessionId),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (AttendanceRecord & { id: string })[];
}

export async function getGrades(classId: string) {
  const gradesDoc = await getDoc(doc(db, 'grades', classId));
  return gradesDoc.data() || {};
}

export async function recomputeGrades(classId: string) {
  // This will trigger the Cloud Function
  await updateDoc(doc(db, 'classes', classId), {
    lastGradeCompute: new Date().toISOString()
  });
}
