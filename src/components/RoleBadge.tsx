import React from 'react';
import { auth, db } from '../services/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export default function RoleBadge() {
  const [role, setRole] = React.useState<'teacher'|'student'|'guest'>('guest');

  React.useEffect(() => {
    // update role reactively if roles/{uid} changes
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      if (!u) return setRole('guest');
      const ref = doc(db, 'roles', u.uid);
      const snap = await getDoc(ref);
      setRole(snap.exists() && (snap.data() as any).role === 'teacher' ? 'teacher' : 'student');

      // live updates if someone edits role doc in console
      const unsubRole = onSnapshot(ref, s => {
        setRole(s.exists() && (s.data() as any).role === 'teacher' ? 'teacher' : 'student');
      });
      return () => unsubRole();
    });
    return () => unsubAuth();
  }, []);

  return (
    <div className="px-2 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium">
      {role === 'guest' ? 'Not signed in' : role === 'teacher' ? 'Teacher' : 'Student'}
    </div>
  );
}
