import React from 'react';
import { AppState, AIResponse } from '../types';
import { Activity, Brain, Hand, Zap, Settings, Eye, EyeOff, Maximize, Smile, Sparkles } from 'lucide-react';

interface InfoPanelProps {
  state: AppState;
  aiResponse: AIResponse;
  onAskAI: () => void;
  onAskEmotionAI: () => void;
  videoOpacity: number;
  setVideoOpacity: (val: number) => void;
  isVideoVisible: boolean;
  setIsVideoVisible: (val: boolean) => void;
  videoSize: { width: number; height: number };
  setVideoSize: (val: { width: number; height: number }) => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ 
  state, 
  aiResponse, 
  onAskAI,
  onAskEmotionAI,
  videoOpacity,
  setVideoOpacity,
  isVideoVisible,
  setIsVideoVisible,
  videoSize,
  setVideoSize
}) => {
  const isGestureDetected = !!state.detectedGesture && state.detectedGesture !== "None";
  const isEmotionDetected = !!state.detectedEmotion;

  const handleSizeChange = (dim: 'width' | 'height', value: number) => {
    setVideoSize({
        ...videoSize,
        [dim]: value
    });
  };

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl z-30 text-slate-100 flex flex-col gap-6 transition-all duration-300 max-h-[calc(100%-2rem)] overflow-y-auto custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-700 pb-4">
        <div className="p-2 bg-indigo-500/20 rounded-lg">
          <Activity className="w-6 h-6 text-indigo-400" />
        </div>
        <div>
          <h2 className="font-bold text-lg">GestureGenius</h2>
          <p className="text-xs text-slate-400">MediaPipe x Gemini</p>
        </div>
      </div>

      {/* Detection Status */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Status</span>
            <span className={`text-xs font-mono px-2 py-1 rounded-full ${state.isModelLoaded ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {state.isModelLoaded ? 'MODEL READY' : 'LOADING...'}
            </span>
        </div>

        {/* Hand Detection Box */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
                <Hand className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-100">Hand Detected</span>
            </div>
             <div className="flex justify-between items-end">
                <span className="text-xl font-bold tracking-wider">
                    {state.handedness || "--"}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                    {state.handedness ? `${(state.confidence * 100).toFixed(0)}% CONFIDENCE` : ''}
                </span>
             </div>
        </div>

        {/* Gesture Box */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 transition-all duration-300">
             <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-100">Gesture</span>
            </div>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {isGestureDetected ? state.detectedGesture : "Waiting..."}
            </div>
        </div>

        {/* Emotion Box */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-pink-900/30 transition-all duration-300">
             <div className="flex items-center gap-2 mb-2">
                <Smile className="w-4 h-4 text-pink-400" />
                <span className="text-sm font-semibold text-pink-100">Emotion</span>
            </div>
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400">
                {state.detectedEmotion || "Neutral"}
            </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="pt-2 border-t border-slate-700 space-y-2">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2">AI Analysis</p>
        
        {/* Buttons Grid */}
        <div className="grid grid-cols-2 gap-2">
            <button
                onClick={onAskAI}
                disabled={!isGestureDetected || aiResponse.isLoading}
                className={`py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 font-semibold text-xs transition-all duration-200
                    ${!isGestureDetected 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg active:scale-95'
                    }
                `}
            >
                <Brain className={`w-4 h-4 ${aiResponse.isLoading ? 'animate-pulse' : ''}`} />
                <span>Gesture</span>
            </button>

            <button
                onClick={onAskEmotionAI}
                disabled={!isEmotionDetected || aiResponse.isLoading}
                className={`py-2 px-2 rounded-lg flex flex-col items-center justify-center gap-1 font-semibold text-xs transition-all duration-200
                    ${!isEmotionDetected 
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                        : 'bg-pink-600 hover:bg-pink-500 text-white shadow-lg active:scale-95'
                    }
                `}
            >
                <Sparkles className={`w-4 h-4 ${aiResponse.isLoading ? 'animate-pulse' : ''}`} />
                <span>Emotion</span>
            </button>
        </div>

        {/* Result Area */}
        {aiResponse.text && (
            <div className="mt-2 bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 text-sm leading-relaxed text-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                <p>{aiResponse.text}</p>
            </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 space-y-4">
        <div className="flex items-center gap-2 mb-1">
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-200">View Settings</span>
        </div>

        {/* Video Dimensions */}
        <div className="space-y-3 pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
                <Maximize size={12} />
                <span>Screen Size</span>
            </div>
            
            {/* Width Slider */}
            <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                    <span>Width</span>
                    <span>{videoSize.width}%</span>
                </div>
                <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={videoSize.width}
                    onChange={(e) => handleSizeChange('width', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>

            {/* Height Slider */}
             <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                    <span>Height</span>
                    <span>{videoSize.height}%</span>
                </div>
                <input
                    type="range"
                    min="20"
                    max="100"
                    step="5"
                    value={videoSize.height}
                    onChange={(e) => handleSizeChange('height', parseInt(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>
        </div>

        {/* Visibility Toggle */}
        <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
            <span className="text-xs text-slate-400">Camera Feed</span>
            <button
                onClick={() => setIsVideoVisible(!isVideoVisible)}
                className={`p-2 rounded-lg transition-colors ${isVideoVisible ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-500'}`}
                title={isVideoVisible ? "Hide Video" : "Show Video"}
            >
                {isVideoVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
        </div>

        {/* Opacity Slider */}
        {isVideoVisible && (
            <div className="space-y-1">
                <div className="flex justify-between text-xs text-slate-400">
                    <span>Camera Opacity</span>
                    <span>{Math.round(videoOpacity * 100)}%</span>
                </div>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={videoOpacity}
                    onChange={(e) => setVideoOpacity(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
            </div>
        )}
      </div>
    </div>
  );
};