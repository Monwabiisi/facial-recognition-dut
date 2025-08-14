// src/types/vision.ts
// Simple types for face bounds + landmark points

/** Bounding box in pixels (top-left origin). */
export type Box = { x: number; y: number; width: number; height: number };

/** A single 2D or 3D landmark point returned by models. */
export type Landmark = { x: number; y: number; z?: number };

/** Face mesh result: a box and a list of landmarks. */
export type MeshResult = { box: Box; landmarks: Landmark[] };
