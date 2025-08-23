import { useState, useEffect, ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { User, onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../utils/roles';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

type State = 'loading' | 'ok' | 'deny' | 'error';

async function getRoleFromFirestore(user: User | null): Promise<Role> {
  if (!user) return 'unknown';
  try {
    const snapshot = await getDoc(doc(db, 'roles', user.uid));
    if (!snapshot.exists()) return 'student'; // Default to student if no role set
    const role = snapshot.data()?.role;
    return role === 'teacher' ? 'teacher' : 'student';
  } catch (error) {
    console.error('Error fetching role:', error);
    return 'unknown';
  }
}

export default function ProtectedRoute({
  children,
  requireRole = 'teacher',
}: {
  children: ReactNode;
  requireRole?: Role;
}) {
  const [state, setState] = useState<State>('loading');
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkRole = async () => {
      try {
        const role = await getRoleFromFirestore(user);
        
        if (!mounted) return;

        if (!user) {
          setState('deny');
        } else if (requireRole === 'teacher' && role !== 'teacher') {
          setState('deny');
        } else {
          setState('ok');
        }
      } catch (error) {
        console.error('Error in ProtectedRoute:', error);
        if (mounted) setState('error');
      }
    };

    checkRole();
    return () => { mounted = false; };
  }, [user, requireRole]);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-gray-600">Checking permissions...</div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="text-red-600">Error checking permissions. Please try again later.</div>
      </div>
    );
  }

  if (state === 'deny') {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}