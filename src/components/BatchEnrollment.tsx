import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

interface StudentData {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface Props {
  onEnroll: (students: StudentData[]) => Promise<void>;
  isLoading?: boolean;
}

export const BatchEnrollment: React.FC<Props> = ({ onEnroll, isLoading = false }) => {
  const [error, setError] = useState<string>('');
  const [preview, setPreview] = useState<StudentData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setError('');
    setIsProcessing(true);

    Papa.parse(file, {
      complete: (results) => {
        try {
          // Validate CSV structure
          const headers = results.meta.fields;
          if (!headers?.includes('email') || !headers?.includes('name')) {
            throw new Error('CSV must include "email" and "name" columns');
          }

          // Process and validate each row
          const students: StudentData[] = results.data
            .filter((row: any) => row.email && row.name)
            .map((row: any, index: number) => ({
              id: row.id || `temp-${index}`,
              email: row.email.trim().toLowerCase(),
              name: row.name.trim(),
              role: row.role || 'student'
            }));

          if (students.length === 0) {
            throw new Error('No valid student records found in CSV');
          }

          setPreview(students);
        } catch (err: any) {
          setError(err.message || 'Failed to process CSV file');
        } finally {
          setIsProcessing(false);
        }
      },
      header: true,
      skipEmptyLines: true
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1,
    disabled: isLoading || isProcessing
  });

  const handleEnroll = async () => {
    try {
      setError('');
      await onEnroll(preview);
      setPreview([]);
    } catch (err: any) {
      setError(err.message || 'Failed to enroll students');
    }
  };

  return (
    <div className="space-y-6">
      {/* File upload area */}
      <div
        {...getRootProps()}
        className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}
          ${isLoading || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="space-y-2">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-sm text-gray-600">
            {isDragActive
              ? 'Drop the CSV file here...'
              : 'Drag and drop a CSV file, or click to select'}
          </p>
          <p className="text-xs text-gray-500">
            CSV must include "email" and "name" columns
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-interface-error bg-opacity-10 text-interface-error rounded-lg">
          {error}
        </div>
      )}

      {/* Preview table */}
      {preview.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Preview ({preview.length} students)
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {preview.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.role}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleEnroll}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white bg-primary rounded-md
                ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}
              `}
            >
              {isLoading ? 'Enrolling...' : 'Enroll Students'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
