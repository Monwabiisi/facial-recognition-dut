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

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      v.srcObject = stream;

      // Wait until metadata is ready before playing to avoid “play() interrupted” spam
      await new Promise<void>((resolve) => {
        if (v.readyState >= 1) return resolve();
        const onMeta = () => {
          v.removeEventListener("loadedmetadata", onMeta);
          resolve();
        };
        v.addEventListener("loadedmetadata", onMeta, { once: true });
      });

      try {
        await v.play();
      } catch {
        // tiny delay + retry once fixes most browsers’ race
        await new Promise((r) => setTimeout(r, 50));
        await v.play();
      }

      setReady(true);
    } catch (e: any) {
      setError(e?.message || String(e));
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
