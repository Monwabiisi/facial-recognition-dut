import { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export type Role = 'teacher' | 'student' | 'unknown';

// Cache role checks for 5 minutes
const roleCache = new Map<string, { role: Role; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function getUserRole(user: User | null): Promise<Role> {
  if (!user) return 'unknown';
  
  // Check cache first
  const cached = roleCache.get(user.uid);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.role;
  }

  try {
    const snapshot = await getDoc(doc(db, 'roles', user.uid));
    const role = snapshot.exists() ? snapshot.data()?.role : 'student';
    
    // Validate and normalize role
    const validRole: Role = role === 'teacher' ? 'teacher' : 'student';
    
    // Update cache
    roleCache.set(user.uid, {
      role: validRole,
      timestamp: Date.now()
    });
    
    return validRole;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return 'unknown';
  }
}

export function clearRoleCache(userId?: string) {
  if (userId) {
    roleCache.delete(userId);
  } else {
    roleCache.clear();
  }
}
