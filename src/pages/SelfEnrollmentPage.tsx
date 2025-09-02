import React from 'react';
import StudentSelfEnrollment from '../components/StudentSelfEnrollment';
import FuturisticLayout from '../components/FuturisticLayout';

export default function SelfEnrollmentPage() {
  return (
    <FuturisticLayout>
      <div className="container mx-auto px-4 py-8">
        <StudentSelfEnrollment />
      </div>
    </FuturisticLayout>
  );
}
