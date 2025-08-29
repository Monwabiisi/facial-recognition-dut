import React, { useEffect, useRef, useState } from "react";
import Human from "@vladmandic/human";

const human = new Human();

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [captureCount, setCaptureCount] = useState(0);

  // Init camera + Human
  useEffect(() => {
    async function setup() {
      await human.load();
      await human.warmup();
      setInitialized(true);
      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    }
    setup();
  }, []);

  // Handle spacebar capture
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code === "Space" && initialized && videoRef.current) {
        if (captureCount >= 5) {
          alert("✅ You already captured 5 pictures!");
          return;
        }

        const result = await human.detect(videoRef.current);
        if (result.face?.length > 0) {
          const embedding = result.face[0].embedding;

          try {
            const token = localStorage.getItem("token"); // JWT from login
            const res = await fetch("http://127.0.0.1:8000/faces/register", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
              },
              body: JSON.stringify(embedding),
            });

            const data = await res.json();
            if (res.ok) {
              setCaptureCount(prev => prev + 1);
              alert(`📸 Face #${captureCount + 1} saved successfully!`);
              if (captureCount + 1 === 5) {
                alert("🎉 Enrollment complete! You have saved 5 faces.");
              }
            } else {
              alert("❌ Error: " + data.detail);
            }
          } catch (err) {
            console.error(err);
            alert("❌ Could not connect to backend");
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [initialized, captureCount]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-xl font-bold mb-4">Face Enrollment</h1>
      <video ref={videoRef} width="480" height="360" className="border rounded" />
      <p className="mt-4">Press <b>Spacebar</b> to capture. Progress: {captureCount}/5</p>
      {captureCount === 5 && (
        <p className="mt-2 text-green-600 font-semibold">✅ Enrollment Complete</p>
      )}
    </div>
  );
}
