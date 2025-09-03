import { useCallback, useEffect, useRef, useState } from "react";

type Facing = "user" | "environment";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [ready, setReady] = useState(false);
  const [facing, setFacing] = useState<Facing>("user"); // start with selfie cam on phones
  const [error, setError] = useState<string | null>(null);

  // Keep a handle to the active stream so we can stop tracks cleanly
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    const v = videoRef.current;
    if (v) v.srcObject = null;
  }, []);

  const startStream = useCallback(async (which: Facing) => {
    setError(null);
    setReady(false);

    // stop any existing stream before starting a new one
    stopStream();

    try {
      const v = videoRef.current;
      if (!v) throw new Error("Video element not mounted yet.");

      // iOS/Safari need these BEFORE srcObject for autoplay
      v.muted = true;
      v.setAttribute("muted", "");
      v.playsInline = true;
      v.setAttribute("playsinline", "");

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          // Phones respect this; laptops with one cam will just give the default cam
          facingMode: { ideal: which },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      // Quick check for available video devices before attempting getUserMedia
      if (navigator.mediaDevices && (navigator.mediaDevices as any).enumerateDevices) {
        try {
          const devs = await navigator.mediaDevices.enumerateDevices();
          const hasVideo = devs.some((d) => d.kind === 'videoinput');
          if (!hasVideo) throw new Error('No camera found');
        } catch (enumErr) {
          // If enumerateDevices is blocked or fails, we'll continue and let getUserMedia report a clearer error
          console.warn('Could not enumerate devices or no camera detected:', enumErr);
        }
      }

      // Retry loop for flaky camera startup (some devices/browsers fail briefly)
      const MAX_ATTEMPTS = 5;
      let attempt = 0;
      let lastErr: any = null;

      while (attempt < MAX_ATTEMPTS) {
        attempt += 1;
        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          streamRef.current = stream;
          v.srcObject = stream;

          // Wait until metadata is ready before playing to avoid “play() interrupted” spam
          await new Promise<void>((resolve, reject) => {
            if (v.readyState >= 1) return resolve();
            const onMeta = () => {
              v.removeEventListener("loadedmetadata", onMeta);
              resolve();
            };
            const metaTimer = setTimeout(() => {
              v.removeEventListener("loadedmetadata", onMeta);
              reject(new Error('Timeout waiting for video metadata'));
            }, 3000);
            // increase metadata wait for slow devices
            // (we keep the setTimeout above but also allow a longer final play timeout below)
            v.addEventListener("loadedmetadata", onMeta, { once: true });
          });

          // Attempt to play with small exponential backoff retries
          const PLAY_ATTEMPTS = 5;
          let playOk = false;
          for (let p = 0; p < PLAY_ATTEMPTS; p++) {
            try {
              await v.play();
              playOk = true;
              break;
            } catch (playErr) {
              // Wait progressively longer before retrying
              const wait = 100 * Math.pow(2, p); // 100ms, 200ms, 400ms, ...
              // console.debug(`play attempt ${p + 1} failed, waiting ${wait}ms`);
              // eslint-disable-next-line no-await-in-loop
              await new Promise((r) => setTimeout(r, wait));
            }
          }

          if (!playOk) throw new Error('Timeout starting video source');

          setReady(true);
          lastErr = null;
          break; // success
        } catch (e) {
          lastErr = e;
          console.warn(`Camera start attempt ${attempt} failed:`, e);
          // Stop any partial stream before next attempt
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }
          v.srcObject = null;
          // small backoff before retrying
          // eslint-disable-next-line no-await-in-loop
          await new Promise((r) => setTimeout(r, 200 * attempt));
        }
      }

      // Final fallback: try a very basic getUserMedia request once more before giving up
      if (lastErr) {
        try {
          console.warn('Final fallback: trying minimal camera constraints before failing');
          const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = fallbackStream;
          const v = videoRef.current!;
          v.srcObject = fallbackStream;
          await new Promise<void>((resolve, reject) => {
            if (v.readyState >= 1) return resolve();
            const onMeta = () => {
              v.removeEventListener('loadedmetadata', onMeta);
              resolve();
            };
            const metaTimer = setTimeout(() => {
              v.removeEventListener('loadedmetadata', onMeta);
              reject(new Error('Timeout waiting for video metadata (fallback)'));
            }, 7000);
            v.addEventListener('loadedmetadata', onMeta, { once: true });
          });
          await v.play();
          setReady(true);
          lastErr = null;
        } catch (fbErr) {
          console.warn('Fallback camera attempt failed:', fbErr);
          // rethrow the original or fallback error below
        }
      }

      if (lastErr) throw lastErr;
    } catch (e: any) {
      console.error('Camera access error:', e);
      
      // Map common getUserMedia errors to user-friendly messages
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setError('Camera access denied. Please allow camera access and reload the page.');
      } else if (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') {
        setError('No camera found. Please connect a camera and reload the page.');
      } else if (e.name === 'NotReadableError' || e.name === 'TrackStartError') {
        setError('Camera is in use by another application. Please close other apps using the camera.');
      } else {
        setError(e?.message || 'Failed to start camera. Please check permissions and try again.');
      }
      
      stopStream();
    }
  }, [stopStream]);

  // Boot the camera once on mount
  useEffect(() => {
    startStream(facing);
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once

  // Public: flip between selfie ↔ rear (works on phones; harmless on laptops)
  const flipCamera = useCallback(async () => {
    const next = facing === "user" ? "environment" : "user";
    setFacing(next);
    await startStream(next);
  }, [facing, startStream]);

  // Optional: re‑play if tab becomes visible again (prevents occasional paused video)
  useEffect(() => {
    const handler = async () => {
      if (document.hidden) return;
      const v = videoRef.current;
      if (v && v.srcObject && v.paused) {
        try {
          await v.play();
        } catch {}
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return { videoRef, ready, facing, flipCamera, error };
}
