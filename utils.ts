import { Landmark } from './types';
import { FaceLandmarker } from '@mediapipe/tasks-vision';

// Finger connections for drawing the skeleton
export const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20] // Pinky
];

export function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  color: string = '#00f0ff',
  radius: number = 3
) {
  // Draw connections first
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  
  for (const [start, end] of HAND_CONNECTIONS) {
    const p1 = landmarks[start];
    const p2 = landmarks[end];
    
    ctx.beginPath();
    ctx.moveTo(p1.x * ctx.canvas.width, p1.y * ctx.canvas.height);
    ctx.lineTo(p2.x * ctx.canvas.width, p2.y * ctx.canvas.height);
    ctx.stroke();
  }

  // Draw points
  ctx.fillStyle = '#ffffff';
  for (const landmark of landmarks) {
    const x = landmark.x * ctx.canvas.width;
    const y = landmark.y * ctx.canvas.height;
    
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add a glow effect
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset
  }
}

export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[],
  color: string = '#ff0080'
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5; // Thinner lines for face mesh
  
  // Connect landmarks based on tessellation
  const connections = FaceLandmarker.FACE_LANDMARKS_TESSELATION;
  
  for (const connection of connections) {
    const start = landmarks[connection.start];
    const end = landmarks[connection.end];
    
    ctx.beginPath();
    ctx.moveTo(start.x * ctx.canvas.width, start.y * ctx.canvas.height);
    ctx.lineTo(end.x * ctx.canvas.width, end.y * ctx.canvas.height);
    ctx.stroke();
  }
}

function getDistance(p1: Landmark, p2: Landmark): number {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

/**
 * Detects gestures based on geometric heuristics of landmarks.
 * This supplements the ML model which only knows 7 classes.
 */
export function detectCustomGestures(landmarks: Landmark[]): string | null {
    // 0: Wrist
    // 4: Thumb Tip, 3: Thumb IP
    // 8: Index Tip, 6: Index PIP
    // 12: Middle Tip, 10: Middle PIP
    // 16: Ring Tip, 14: Ring PIP
    // 20: Pinky Tip, 18: Pinky PIP

    const wrist = landmarks[0];
    
    // Dynamic scale based on hand size (wrist to Index MCP) used for thresholding
    const scale = getDistance(wrist, landmarks[5]);

    // Heuristic: Finger is extended if tip is significantly further from wrist than the PIP joint
    const isExtended = (tipId: number, pipId: number) => {
        return getDistance(wrist, landmarks[tipId]) > getDistance(wrist, landmarks[pipId]);
    };

    // Thumb is special, we check if it's extended away from the Index MCP
    const isThumbExtended = () => {
         return getDistance(landmarks[4], landmarks[5]) > scale * 0.8;
    };

    const indexExt = isExtended(8, 6);
    const middleExt = isExtended(12, 10);
    const ringExt = isExtended(16, 14);
    const pinkyExt = isExtended(20, 18);
    const thumbExt = isThumbExtended();

    // 1. Three: Index, Middle, Ring extended. Thumb & Pinky curled.
    if (!thumbExt && indexExt && middleExt && ringExt && !pinkyExt) {
        return "Three";
    }

    // 2. Rock On: Index & Pinky Extended. Middle & Ring curled. Thumb curled.
    // Explicitly check !thumbExt to distinguish from "ILoveYou" (which has thumb extended)
    if (!thumbExt && indexExt && pinkyExt && !middleExt && !ringExt) {
        return "Rock_On";
    }

    // 3. Pinch/OK Sign: Thumb tip touches Index tip.
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distanceThumbIndex = getDistance(thumbTip, indexTip);
    
    if (distanceThumbIndex < scale * 0.3) {
        return "Pinch/OK Sign";
    }

    return null;
}

export function detectEmotionFromBlendshapes(blendshapes: any[]): string {
    if (!blendshapes || blendshapes.length === 0) return "Neutral";
    
    const categories = blendshapes[0].categories;
    const scores: Record<string, number> = {};
    
    categories.forEach((cat: any) => {
        scores[cat.categoryName] = cat.score;
    });

    // Thresholds
    const SMILE_THRESHOLD = 0.5;
    const SQUINT_THRESHOLD = 0.5;
    const FROWN_THRESHOLD = 0.4; // browDown
    const SURPRISE_THRESHOLD = 0.5; // browOuterUp

    // 1. Happy (Smile)
    const smileScore = (scores['mouthSmileLeft'] + scores['mouthSmileRight']) / 2;
    if (smileScore > SMILE_THRESHOLD) return "Happy";

    // 2. Angry (Brow Down)
    const frownScore = (scores['browDownLeft'] + scores['browDownRight']) / 2;
    if (frownScore > FROWN_THRESHOLD) return "Angry";

    // 3. Surprise (Brow Outer Up or Eye Wide)
    const surpriseScore = (scores['browOuterUpLeft'] + scores['browOuterUpRight']) / 2;
    // const eyeWideScore = (scores['eyeWideLeft'] + scores['eyeWideRight']) / 2; 
    if (surpriseScore > SURPRISE_THRESHOLD) return "Surprised";

    // 4. Sad (Brow Inner Up)
    if (scores['browInnerUp'] > 0.5) return "Sad";

    return "Neutral";
}