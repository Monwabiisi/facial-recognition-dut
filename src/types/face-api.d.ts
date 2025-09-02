declare namespace faceapi {
  class TinyFaceDetectorOptions {
    constructor();
  }

  interface IPoint {
    x: number;
    y: number;
  }

  interface IRect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  class FaceDetection {
    readonly score: number;
    readonly box: IRect;
    constructor(score: number, box: IRect);
    public forSize(width: number, height: number): FaceDetection;
  }

  interface FaceLandmarks {
    positions: IPoint[];
    shift(x: number, y: number): FaceLandmarks;
    forSize(width: number, height: number): FaceLandmarks;
  }

  interface WithFaceLandmarks<T extends FaceDetection | WithFaceDetection> {
    detection: T;
    landmarks: FaceLandmarks;
  }

  interface WithFaceDescriptor<T> {
    descriptor: Float32Array;
    detection: T;
  }

  interface WithFaceDetection {
    detection: FaceDetection;
  }

  type DetectSingleFaceDetection = Promise<FaceDetection | undefined>;
  type DetectSingleFaceLandmarks = Promise<WithFaceLandmarks<FaceDetection> | undefined>;
  type FullFaceDescription = WithFaceDescriptor<WithFaceLandmarks<FaceDetection>>;

  function detectSingleFace(input: HTMLVideoElement | HTMLCanvasElement, options: TinyFaceDetectorOptions): DetectSingleFaceDetection;
}

interface Window {
  faceapi: typeof faceapi;
}

declare module "@vladmandic/face-api" {
  export = faceapi;
}
