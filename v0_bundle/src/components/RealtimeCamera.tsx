import React, { useEffect, useRef, useState } from 'react';

type Props = { onMultiCapture?: (images: string[]) => void; burstCount?: number };

export default function RealtimeCamera({ onMultiCapture, burstCount = 5 }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (!mounted) return;
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.muted = true;
          (videoRef.current as any).playsInline = true;
          await videoRef.current.play();
          setReady(true);
        }
      } catch (err) {
        console.error('Camera error', err);
      }
    })();
    return () => {
      mounted = false;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    function draw() {
      const v = videoRef.current;
      const c = canvasRef.current;
      if (v && c) {
        const dpr = window.devicePixelRatio || 1;
        const w = v.clientWidth;
        const h = v.clientHeight;
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        c.style.width = `${w}px`;
        c.style.height = `${h}px`;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(v, 0, 0, w, h);
        }
      }
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const captureBurst = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    const images: string[] = [];
    const w = c.width;
    const h = c.height;
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d')!;
    const capped = Math.max(1, Math.min(burstCount || 1, 10));
    for (let i = 0; i < capped; i++) {
      tctx.drawImage(v, 0, 0, tmp.width, tmp.height);
      images.push(tmp.toDataURL('image/jpeg'));
      await new Promise(r => setTimeout(r, 120));
    }
    if (onMultiCapture) onMultiCapture(images);
  };

  return (
    <div style={{ position: 'relative', width: 640, maxWidth: '100%' }}>
      <video ref={videoRef} style={{ width: '100%', display: 'block' }} playsInline muted />
      <canvas ref={canvasRef} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }} />
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 12, marginBottom: 6 }}>Burst capture (max 10 images)</div>
        <button onClick={captureBurst}>Capture {Math.max(1, Math.min(burstCount, 10))}</button>
      </div>
    </div>
  );
}
