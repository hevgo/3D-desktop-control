import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, GestureRecognizer, FaceLandmarker } from '@mediapipe/tasks-vision';
import { drawLandmarks, drawFaceMesh, detectCustomGestures } from './utils';
import { AppState, AIResponse } from './types';
import { InfoPanel } from './components/InfoPanel';
import { ReferencePanel } from './components/ReferencePanel';
import { getGestureInsight } from './services/geminiService';
import { Loader2, Camera, AlertCircle, Move, ScanFace } from 'lucide-react';

const App: React.FC = () => {
  // Gesture Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Face Refs
  const faceVideoRef = useRef<HTMLVideoElement>(null);
  const faceCanvasRef = useRef<HTMLCanvasElement>(null);

  const [recognizer, setRecognizer] = useState<GestureRecognizer | null>(null);
  const [faceLandmarker, setFaceLandmarker] = useState<FaceLandmarker | null>(null);
  
  const requestRef = useRef<number>(0);
  const faceRequestRef = useRef<number>(0);
  
  // View Settings State
  const [videoOpacity, setVideoOpacity] = useState<number>(1);
  const [isVideoVisible, setIsVideoVisible] = useState<boolean>(true);
  
  // Gesture Video State
  const [videoSize, setVideoSize] = useState<{ width: number; height: number }>({ width: 50, height: 50 });
  const [videoPosition, setVideoPosition] = useState({ x: 0, y: 0 });
  const [isVideoDragging, setIsVideoDragging] = useState(false);
  const [videoDragOffset, setVideoDragOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Face Video State
  const [faceVideoSize, setFaceVideoSize] = useState<{ width: number; height: number }>({ width: 50, height: 50 });
  const [faceVideoPosition, setFaceVideoPosition] = useState({ x: 0, y: 0 });
  const [isFaceVideoDragging, setIsFaceVideoDragging] = useState(false);
  const [faceVideoDragOffset, setFaceVideoDragOffset] = useState({ x: 0, y: 0 });
  const faceContainerRef = useRef<HTMLDivElement>(null);

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

  // Initialize Positions
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const centerX = (window.innerWidth - (window.innerWidth * 0.5)) / 2;
        
        // Gesture Video at Top
        setVideoPosition({
            x: centerX,
            y: 24
        });

        // Face Video at Bottom
        setFaceVideoPosition({
            x: centerX,
            y: window.innerHeight - (window.innerHeight * 0.5) - 24
        });
    }
  }, []);

  // Initialize MediaPipe Models
  useEffect(() => {
    const originalInfo = console.info;
    console.info = (...args) => {
      const msg = args[0];
      if (typeof msg === 'string' && msg.includes('Created TensorFlow Lite XNNPACK delegate for CPU')) {
        return;
      }
      originalInfo.apply(console, args);
    };

    let isMounted = true;
    let gestureRecognizer: GestureRecognizer | null = null;
    let faceMeshLandmarker: FaceLandmarker | null = null;

    const initModels = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        if (!isMounted) return;

        const gesturePromise = GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          },
          runningMode: "VIDEO",
          numHands: 1, 
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        const facePromise = FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });

        const [gRecognizer, fLandmarker] = await Promise.all([gesturePromise, facePromise]);

        if (isMounted) {
          setRecognizer(gRecognizer);
          setFaceLandmarker(fLandmarker);
          setAppState(prev => ({ ...prev, isModelLoaded: true }));
        } else {
            gRecognizer.close();
            fLandmarker.close();
        }
      } catch (error) {
        if (isMounted) {
          setAppState(prev => ({ 
            ...prev, 
            errorMessage: "Failed to load MediaPipe models. Please check your connection." 
          }));
          console.error(error);
        }
      }
    };

    initModels();

    return () => {
      isMounted = false;
      console.info = originalInfo;
      if (gestureRecognizer) gestureRecognizer.close();
      if (faceMeshLandmarker) faceMeshLandmarker.close();
    };
  }, []);

  // Initialize Camera
  const enableCamera = useCallback(async () => {
    if (!recognizer || !faceLandmarker) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: 640,
            height: 480
        } 
      });
      
      // Initialize Gesture Video
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
           videoRef.current?.play().catch(console.error);
        };
        videoRef.current.onplay = () => {
           setAppState(prev => ({ ...prev, cameraActive: true }));
           requestRef.current = requestAnimationFrame(predictGestureWebcam);
        };
      }

      // Initialize Face Video
      if (faceVideoRef.current) {
        faceVideoRef.current.srcObject = stream;
        faceVideoRef.current.onloadedmetadata = () => {
            faceVideoRef.current?.play().catch(console.error);
        };
        faceVideoRef.current.onplay = () => {
             faceRequestRef.current = requestAnimationFrame(predictFaceWebcam);
        }
      }

    } catch (err) {
      setAppState(prev => ({ ...prev, errorMessage: "Camera permission denied or not available." }));
    }
  }, [recognizer, faceLandmarker]);

  // Prediction Loops
  const lastVideoTimeRef = useRef<number>(-1);
  const lastFaceVideoTimeRef = useRef<number>(-1);

  const predictGestureWebcam = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!recognizer || !video || !canvas) return;

    if (video.readyState < 2 || video.paused || video.ended) {
        requestRef.current = requestAnimationFrame(predictGestureWebcam);
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
          let gestureName = "None";
          let score = 0;
          if (result.gestures && result.gestures.length > 0 && result.gestures[0].length > 0) {
              const detected = result.gestures[0][0].categoryName;
              if (detected !== "ILoveYou") {
                gestureName = detected;
                score = result.gestures[0][0].score;
              }
          }

          const customGesture = detectCustomGestures(result.landmarks[0]);
          if (customGesture) {
              gestureName = customGesture;
              score = 0.9;
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

    requestRef.current = requestAnimationFrame(predictGestureWebcam);
  };

  const predictFaceWebcam = () => {
    const video = faceVideoRef.current;
    const canvas = faceCanvasRef.current;
    
    if (!faceLandmarker || !video || !canvas) return;

    if (video.readyState < 2 || video.paused || video.ended) {
        faceRequestRef.current = requestAnimationFrame(predictFaceWebcam);
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
    }

    let startTimeMs = performance.now();
    if (lastFaceVideoTimeRef.current !== video.currentTime) {
        lastFaceVideoTimeRef.current = video.currentTime;
        try {
            const result = faceLandmarker.detectForVideo(video, startTimeMs);
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (result.faceLandmarks && result.faceLandmarks.length > 0) {
                drawFaceMesh(ctx, result.faceLandmarks[0], '#ff0080');
            }
        } catch (e) {
            console.warn("Face Recognition error:", e);
        }
    }
    faceRequestRef.current = requestAnimationFrame(predictFaceWebcam);
  }

  useEffect(() => {
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (faceRequestRef.current) cancelAnimationFrame(faceRequestRef.current);
      
      if (videoRef.current && videoRef.current.srcObject) {
         const stream = videoRef.current.srcObject as MediaStream;
         stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Gesture Video Drag
  const handleVideoMouseDown = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setVideoDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsVideoDragging(true);
    }
  };

  // Face Video Drag
  const handleFaceVideoMouseDown = (e: React.MouseEvent) => {
    if (faceContainerRef.current) {
        const rect = faceContainerRef.current.getBoundingClientRect();
        setFaceVideoDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
        setIsFaceVideoDragging(true);
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isVideoDragging) {
        setVideoPosition({
          x: e.clientX - videoDragOffset.x,
          y: e.clientY - videoDragOffset.y
        });
      }
      if (isFaceVideoDragging) {
        setFaceVideoPosition({
            x: e.clientX - faceVideoDragOffset.x,
            y: e.clientY - faceVideoDragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsVideoDragging(false);
      setIsFaceVideoDragging(false);
    };

    if (isVideoDragging || isFaceVideoDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isVideoDragging, videoDragOffset, isFaceVideoDragging, faceVideoDragOffset]);


  const handleAskAI = async () => {
    if (!appState.detectedGesture) return;
    setAiResponse(prev => ({ ...prev, isLoading: true, text: '' }));
    const text = await getGestureInsight(appState.detectedGesture);
    setAiResponse({ text, isLoading: false, error: null });
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 overflow-hidden">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 z-0"></div>

      {/* --- GESTURE RECOGNITION SCREEN (TOP) --- */}
      <div 
        ref={containerRef}
        className="absolute z-10 shadow-2xl bg-black overflow-hidden border border-slate-800 rounded-xl"
        style={{ 
          width: `${videoSize.width}%`, 
          height: `${videoSize.height}%`,
          left: `${videoPosition.x}px`,
          top: `${videoPosition.y}px`,
          transition: isVideoDragging ? 'none' : 'width 0.3s, height 0.3s, opacity 0.3s',
          display: 'block' 
        }}
      >
        <div 
            onMouseDown={handleVideoMouseDown}
            className="absolute top-0 left-0 right-0 h-10 z-30 cursor-move flex items-center justify-center group hover:bg-gradient-to-b hover:from-black/60 hover:to-transparent transition-all"
        >
            <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-white/10 flex items-center gap-2 group-hover:bg-black/60 transition-colors">
                <Move className="w-3 h-3 text-slate-400 group-hover:text-white" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Gesture Drag</span>
            </div>
        </div>
        <video 
          ref={videoRef} 
          className="absolute inset-0 w-full h-full transform scale-x-[-1] z-0 transition-opacity duration-300 object-cover" 
          style={{ opacity: isVideoVisible ? videoOpacity : 0 }}
          autoPlay 
          playsInline 
          muted 
        />
        <canvas 
          ref={canvasRef} 
          className="absolute inset-0 w-full h-full transform scale-x-[-1] z-10 pointer-events-none object-cover" 
        />
      </div>

      {/* --- FACE MESH SCREEN (BOTTOM) --- */}
      {/* Always render to ensure refs are active for stream attachment, but control visibility via state if needed */}
      <div 
        ref={faceContainerRef}
        className="absolute z-10 shadow-2xl bg-black overflow-hidden border border-pink-900/50 rounded-xl"
        style={{ 
        width: `${faceVideoSize.width}%`, 
        height: `${faceVideoSize.height}%`,
        left: `${faceVideoPosition.x}px`,
        top: `${faceVideoPosition.y}px`,
        transition: isFaceVideoDragging ? 'none' : 'width 0.3s, height 0.3s, opacity 0.3s',
        display: appState.cameraActive ? 'block' : 'none' // Hide until active, but keep in DOM if needed, though 'none' removes it from layout calculation.
        // Actually, we need it to be present for refs to work when enableCamera is called.
        // enableCamera sets cameraActive to true slightly later in onPlay. 
        // So we should just let it be visible but empty (black) or 'hidden'
        }}
      >
        <div 
            onMouseDown={handleFaceVideoMouseDown}
            className="absolute top-0 left-0 right-0 h-10 z-30 cursor-move flex items-center justify-center group hover:bg-gradient-to-b hover:from-black/60 hover:to-transparent transition-all"
        >
            <div className="px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-pink-500/30 flex items-center gap-2 group-hover:bg-black/60 transition-colors">
                <ScanFace className="w-3 h-3 text-pink-400 group-hover:text-white" />
                <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">Face Drag</span>
            </div>
        </div>
        <video 
            ref={faceVideoRef} 
            className="absolute inset-0 w-full h-full transform scale-x-[-1] z-0 object-cover transition-opacity duration-300"
            style={{ opacity: isVideoVisible ? videoOpacity : 0 }} 
            autoPlay 
            playsInline 
            muted 
        />
        <canvas 
            ref={faceCanvasRef} 
            className="absolute inset-0 w-full h-full transform scale-x-[-1] z-10 pointer-events-none object-cover" 
        />
      </div>


      {/* UI Overlay Layer (Full Screen) */}
      <div className="absolute inset-0 z-50 pointer-events-none">
          <div className="relative w-full h-full">

            {/* Error Message */}
            {appState.errorMessage && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto p-4 bg-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4 p-8 bg-red-900/90 rounded-2xl border border-red-500 text-white max-w-md text-center">
                <AlertCircle className="w-12 h-12" />
                <p>{appState.errorMessage}</p>
                <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-700 rounded hover:bg-red-600 transition">Reload</button>
                </div>
            </div>
            )}

            {/* Start Screen / Loading */}
            {!appState.cameraActive && !appState.errorMessage && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-4 pointer-events-auto bg-slate-950">
                    <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 shadow-2xl animate-pulse">
                        {appState.isModelLoaded ? (
                            <Camera className="w-10 h-10 text-indigo-400" />
                        ) : (
                            <Loader2 className="w-10 h-10 text-slate-500 animate-spin" />
                        )}
                    </div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">GestureGenius</h1>
                    <p className="text-slate-400 max-w-md text-center">
                        {appState.isModelLoaded ? "Models loaded successfully. Grant camera access." : "Downloading MediaPipe Models..."}
                    </p>
                    <button onClick={enableCamera} disabled={!appState.isModelLoaded} className={`px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 ${appState.isModelLoaded ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}>
                        {appState.isModelLoaded ? 'Enable Camera' : 'Initializing...'}
                    </button>
                </div>
            )}
            
            {/* Interactive Panels */}
            {appState.cameraActive && (
                <div className="pointer-events-auto">
                    <InfoPanel 
                    state={appState} 
                    aiResponse={aiResponse} 
                    onAskAI={handleAskAI}
                    videoOpacity={videoOpacity}
                    setVideoOpacity={setVideoOpacity}
                    isVideoVisible={isVideoVisible}
                    setIsVideoVisible={setIsVideoVisible}
                    videoSize={videoSize}
                    setVideoSize={setVideoSize}
                    />
                    <ReferencePanel />
                    <div className="absolute bottom-6 right-6 text-slate-500 text-xs font-mono select-none opacity-50">POWERED BY MEDIAPIPE & GEMINI</div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;