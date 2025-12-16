import React, { useState, useEffect, useRef } from 'react';
import { GripHorizontal } from 'lucide-react';

const GESTURES = [
  { name: "Open_Palm", emoji: "✋", label: "Open Palm" },
  { name: "Closed_Fist", emoji: "✊", label: "Closed Fist" },
  { name: "Thumb_Up", emoji: "👍", label: "Thumb Up" },
  { name: "Thumb_Down", emoji: "👎", label: "Thumb Down" },
  { name: "Victory", emoji: "✌️", label: "Victory" },
  { name: "Pointing_Up", emoji: "☝️", label: "Point Up" },
  { name: "Three", emoji: "3️⃣", label: "Three" },
  { name: "Rock_On", emoji: "🤘", label: "Rock On" },
  { name: "Pinch_OK", emoji: "👌", label: "Pinch/OK Sign" },
];

const EMOTIONS = [
  { name: "Happy", emoji: "😄", label: "Happy" },
  { name: "Sad", emoji: "😢", label: "Sad" },
  { name: "Angry", emoji: "😠", label: "Angry" },
  { name: "Surprised", emoji: "😲", label: "Surprised" },
  { name: "Neutral", emoji: "😐", label: "Neutral" },
];

export const ReferencePanel: React.FC = () => {
  // State for position, initialized to top-left
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Ensure panel is positioned at the top on mount
  useEffect(() => {
    setPosition({ x: 24, y: 24 });
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div 
      ref={panelRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="absolute z-20 w-[280px]"
    >
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
        
        {/* Drag Handle Header */}
        <div 
            onMouseDown={handleMouseDown}
            className={`p-3 border-b border-slate-700 flex items-center justify-between select-none bg-slate-800/50 hover:bg-slate-800 transition-colors ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            title="Drag to move"
        >
            <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wider">
            Guides
            </h3>
            <GripHorizontal className="w-4 h-4 text-slate-500" />
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto custom-scrollbar p-4 pr-2">
            
            {/* Gestures Section */}
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Gestures</h4>
            <div className="grid grid-cols-2 gap-2 mb-4">
            {GESTURES.map((gesture) => (
                <div 
                key={gesture.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
                >
                <span className="text-xl" role="img" aria-label={gesture.label}>
                    {gesture.emoji}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate">
                    {gesture.label}
                </span>
                </div>
            ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-700/50 my-2" />

            {/* Emotions Section */}
            <h4 className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2 pt-2">Emotions</h4>
            <div className="grid grid-cols-2 gap-2">
            {EMOTIONS.map((emotion) => (
                <div 
                key={emotion.name}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
                >
                <span className="text-xl" role="img" aria-label={emotion.label}>
                    {emotion.emoji}
                </span>
                <span className="text-xs text-slate-300 font-medium truncate">
                    {emotion.label}
                </span>
                </div>
            ))}
            </div>

        </div>
      </div>
    </div>
  );
};