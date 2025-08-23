import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { Camera } from './Camera';
import { useCamera } from '../hooks/useCamera';
import { vi } from 'vitest';

// Mock the useCamera hook
vi.mock('../hooks/useCamera', () => ({
  useCamera: vi.fn(),
}));

// Mock the Worker
global.Worker = vi.fn(() => ({
  postMessage: vi.fn(),
  onmessage: vi.fn(),
  terminate: vi.fn(),
})) as any;

describe('Camera component', () => {
  const mockOnFaceDetected = vi.fn();
  const mockOnCameraError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays a loading message while initializing', () => {
    (useCamera as any).mockReturnValue({
      videoRef: { current: null },
      isLoading: true,
      error: null,
      videoReady: false,
    });

    render(
      <Camera
        engineName="faceapi"
        onFaceDetected={mockOnFaceDetected}
        onCameraError={mockOnCameraError}
        width={640}
        height={480}
      />
    );

    expect(screen.getByText(/Initializing Camera/i)).toBeInTheDocument();
  });

  it('displays an error message if camera initialization fails', () => {
    const errorMessage = 'Camera not found';
    (useCamera as any).mockReturnValue({
      videoRef: { current: null },
      isLoading: false,
      error: { message: errorMessage },
      videoReady: false,
    });

    render(
      <Camera
        engineName="faceapi"
        onFaceDetected={mockOnFaceDetected}
        onCameraError={mockOnCameraError}
        width={640}
        height={480}
      />
    );

    expect(screen.getByText(/camera error/i)).toBeInTheDocument();
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(mockOnCameraError).toHaveBeenCalledWith({ message: errorMessage });
  });

  it('does not render video if not ready', () => {
    (useCamera as any).mockReturnValue({
      videoRef: { current: null },
      isLoading: false,
      error: null,
      videoReady: false,
    });

    const { container } = render(
      <Camera
        engineName="faceapi"
        onFaceDetected={mockOnFaceDetected}
        onCameraError={mockOnCameraError}
        width={640}
        height={480}
      />
    );

    const videoElement = container.querySelector('video');
    expect(videoElement).not.toBeInTheDocument();
  });
});
