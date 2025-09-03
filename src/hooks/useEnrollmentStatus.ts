import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { faceService } from '../services/faceService';

export function useEnrollmentStatus() {
  const { user } = useAuth();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (!user) {
        setIsEnrolled(false);
        setLoading(false);
        return;
      }

      try {
        const faces = await faceService.getEnrolledFaces();
        const userFaces = faces.filter(face => face.user_id === user.id);
        setIsEnrolled(userFaces.length > 0);
      } catch (error) {
        console.error('Error checking enrollment status:', error);
        setIsEnrolled(false);
      } finally {
        setLoading(false);
      }
    };

    checkEnrollment();
  }, [user]);

  return { isEnrolled, loading };
}
