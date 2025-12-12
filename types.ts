export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface GestureRecognizerResult {
  landmarks: Landmark[][];
  worldLandmarks: Landmark[][];
  handedness: {
    score: number;
    index: number;
    categoryName: string;
    displayName: string;
  }[][];
  gestures: {
    score: number;
    index: number;
    categoryName: string;
    displayName: string;
  }[][];
}

export interface AppState {
  isModelLoaded: boolean;
  cameraActive: boolean;
  errorMessage: string | null;
  detectedGesture: string | null;
  confidence: number;
  handedness: string | null;
}

export interface AIResponse {
  text: string;
  isLoading: boolean;
  error: string | null;
}