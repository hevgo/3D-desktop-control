import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer, DrawingUtils } from '@mediapipe/tasks-vision';
import { drawLandmarks, detectCustomGestures } from './utils';
import { AppState, GestureRecognizerResult, AIResponse } from './types';
import { InfoPanel } from './components/InfoPanel';
import { ReferencePanel } from './components/ReferencePanel';
import { getGestureInsight } from './services/geminiService';
import { Loader2, Camera, AlertCircle } from 'lucide-react';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null);
  const requestRef = useRef<number>(0);
  
  const [appState, setAppState] = useState<AppState>({
    isModelLoaded: false,
    cameraActive: false,
    errorMessage: null,
    detectedGesture: null,
    confidence: 0,
    handedness: null,
  });

  const [aiResponse, setAiResponse] = useState<AIResponse>({
    text: '',
    isLoading: false,
    error: null,
  });

  // Initialize MediaPipe GestureRecognizer
  useEffect(() => {
    let isMounted = true;
    let gestureRecognizer: GestureRecognizer | null = null;

    const initRecognizer = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!isMounted) return;

        gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
            delegate: "CPU" 
          },
          runningMode: "VIDEO",
          numHands: 1, 
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        if (isMounted) {
          setRecognizer(gestureRecognizer);
          setAppState(prev => ({ ...prev, isModelLoaded: true }));
        } else {
            gestureRecognizer.close();
        }
      } catch (error) {
        if (isMounted) {
          setAppState(prev => ({ 
            ...prev, 
            errorMessage: "Failed to load MediaPipe model. Please check your connection." 
          }));
          console.error(error);
        }
      }
    };

    initRecognizer();

    return () => {
      isMounted = false;
      if (gestureRecognizer) {
        gestureRecognizer.close();
      }
    };
  }, []);

  // Initialize Camera
  const enableCamera = useCallback(async () => {
    if (!recognizer || !videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: 640,
            height: 480
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
           videoRef.current?.play().catch(e => {
             console.error("Video play failed:", e);
             setAppState(prev => ({ ...prev, errorMessage: "Could not start video stream." }));
           });
        };

        videoRef.current.onplay = () => {
           setAppState(prev => ({ ...prev, cameraActive: true }));
           requestRef.current = requestAnimationFrame(predictWebcam);
        };
      }
    } catch (err) {
      setAppState(prev => ({ ...prev, errorMessage: "Camera permission denied or not available." }));
    }
  }, [recognizer]);

  // Prediction Loop
  const lastVideoTimeRef = useRef<number>(-1);

  const predictWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!recognizer || !video || !canvas) return;

    if (video.readyState < 2 || video.paused || video.ended) {
        requestRef.current = requestAnimationFrame(predictWebcam);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    let startTimeMs = performance.now();
    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;
      
      try {
        const result = recognizer.recognizeForVideo(video, startTimeMs);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (result.landmarks && result.landmarks.length > 0) {
          drawLandmarks(ctx, result.landmarks[0], '#00f0ff'); 
          
          const handedness = result.handedness?.[0]?.[0]?.displayName || "Unknown";
          
          // Get basic ML result
          let gestureName = "None";
          let score = 0;
          if (result.gestures && result.gestures.length > 0) {
              const detected = result.gestures[0][0].categoryName;
              // Explicitly filter out "ILoveYou" as requested
              if (detected !== "ILoveYou") {
                gestureName = detected;
                score = result.gestures[0][0].score;
              }
          }

          // Check for custom heuristic gestures (overrides None or provides specifics)
          const customGesture = detectCustomGestures(result.landmarks[0]);
          if (customGesture) {
              gestureName = customGesture;
              score = 0.9; // Synthetic high confidence for heuristics
          }
          
          setAppState(prev => ({
            ...prev,
            handedness,
            detectedGesture: gestureName,
            confidence: score
          }));

        } else {
          setAppState(prev => ({
              ...prev,
              handedness: null,
              detectedGesture: null,
              confidence: 0
          }));
        }
      } catch (e) {
        console.warn("Recognition error:", e);
      }
    }

    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleAskAI = async () => {
    if (!appState.detectedGesture) return;
    setAiResponse(prev => ({ ...prev, isLoading: true, text: '' }));
    const text = await getGestureInsight(appState.detectedGesture);
    setAiResponse({ text, isLoading: false, error: null });
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 z-0"></div>

      <div className="relative w-full h-full max-w-[1920px] max-h-[1080px] flex items-center justify-center bg-black/50 backdrop-blur-sm z-10">
        
        {appState.errorMessage && (
           <div className="absolute z-50 flex flex-col items-center gap-4 p-8 bg-red-900/90 rounded-2xl border border-red-500 text-white max-w-md text-center">
             <AlertCircle className="w-12 h-12" />
             <p>{appState.errorMessage}</p>
             <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-700 rounded hover:bg-red-600 transition">Reload</button>
           </div>
        )}

        {!appState.cameraActive && !appState.errorMessage && (
            <div className="absolute z-50 flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-2xl animate-pulse">
                    {appState.isModelLoaded ? (
                        <Camera className="w-10 h-10 text-indigo-400" />
                    ) : (
                        <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
                    )}
                </div>
                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">GestureGenius</h1>
                <p className="text-slate-400 max-w-md text-center">
                    {appState.isModelLoaded ? "Model loaded successfully. Grant camera access to begin real-time gesture recognition." : "Downloading MediaPipe Gesture Recognizer model..."}
                </p>
                <button onClick={enableCamera} disabled={!appState.isModelLoaded} className={`px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 ${appState.isModelLoaded ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                    {appState.isModelLoaded ? 'Enable Camera' : 'Initializing...'}
                </button>
            </div>
        )}

        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" autoPlay playsInline muted />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" />
        
        {appState.cameraActive && (
            <>
                <InfoPanel state={appState} aiResponse={aiResponse} onAskAI={handleAskAI} />
                <ReferencePanel />
            </>
        )}

        <div className="absolute bottom-6 right-6 text-slate-500 text-xs font-mono z-20 pointer-events-none select-none opacity-50">POWERED BY MEDIAPIPE & GEMINI</div>
      </div>
    </div>
  );
};

export default App;