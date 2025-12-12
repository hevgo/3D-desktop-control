import React from 'react';
import { AppState, AIResponse } from '../types';
import { Activity, Brain, Hand, Zap } from 'lucide-react';

interface InfoPanelProps {
  state: AppState;
  aiResponse: AIResponse;
  onAskAI: () => void;
}

export const InfoPanel: React.FC<InfoPanelProps> = ({ state, aiResponse, onAskAI }) => {
  const isGestureDetected = !!state.detectedGesture && state.detectedGesture !== "None";

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-2xl z-20 text-slate-100 flex flex-col gap-6 transition-all duration-300">
      
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

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
                <Hand className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-100">Hand Detected</span>
            </div>
             <div className="flex justify-between items-end">
                <span className="text-2xl font-bold tracking-wider">
                    {state.handedness || "--"}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                    {state.handedness ? `${(state.confidence * 100).toFixed(0)}% CONFIDENCE` : ''}
                </span>
             </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 transition-all duration-300">
             <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-100">Gesture</span>
            </div>
            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                {isGestureDetected ? state.detectedGesture : "Waiting..."}
            </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="pt-2 border-t border-slate-700">
        <button
            onClick={onAskAI}
            disabled={!isGestureDetected || aiResponse.isLoading}
            className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold transition-all duration-200
                ${!isGestureDetected 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 active:scale-95'
                }
            `}
        >
            <Brain className={`w-5 h-5 ${aiResponse.isLoading ? 'animate-pulse' : ''}`} />
            {aiResponse.isLoading ? 'Thinking...' : 'Analyze Gesture with AI'}
        </button>

        {aiResponse.text && (
            <div className="mt-4 bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 text-sm leading-relaxed text-indigo-100 animate-in fade-in slide-in-from-bottom-2">
                <p>{aiResponse.text}</p>
            </div>
        )}
      </div>
    </div>
  );
};