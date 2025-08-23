// Overlay helpers + small types used by Camera/FaceLab.
// Kept minimal and dependency-free.

export type Box = { x: number; y: number; width: number; height: number };
export type Point = { x: number; y: number };

/**
 * Clears the entire canvas to transparent.
 */
export function clearCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

export function drawBox(ctx: CanvasRenderingContext2D, b: Box, color = "#22c55e") {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(b.x, b.y, b.width, b.height);
  ctx.restore();
}

export function drawMesh(ctx: CanvasRenderingContext2D, pts: Point[], color = "#0ea5e9") {
  if (!pts?.length) return;
  ctx.save();
  ctx.fillStyle = color;
  for (const p of pts) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawBoxes(ctx: CanvasRenderingContext2D, boxes: Box[], color = "#22c55e") {
    for (const b of boxes) {
        drawBox(ctx, b, color);
    }
}

/**
 * Draws a label above or below a bounding box.
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = "#22c55e",
  font = "16px Arial"
) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Resizes the canvas to match the video element dimensions.
 */
export function resizeCanvasToVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
) {
  if (!canvas || !video) return;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
}
