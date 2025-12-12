import React from 'react';

const GESTURES = [
  { name: "Open_Palm", emoji: "✋", label: "Open Palm" },
  { name: "Closed_Fist", emoji: "✊", label: "Closed Fist" },
  { name: "Thumb_Up", emoji: "👍", label: "Thumb Up" },
  { name: "Thumb_Down", emoji: "👎", label: "Thumb Down" },
  { name: "Victory", emoji: "✌️", label: "Victory" },
  { name: "Pointing_Up", emoji: "☝️", label: "Point Up" },
  { name: "Three", emoji: "3️⃣", label: "Three" },
  { name: "Four", emoji: "4️⃣", label: "Four" },
  { name: "Rock_On", emoji: "🤘", label: "Rock On" },
  { name: "OK_Sign", emoji: "👌", label: "OK Sign" },
];

export const ReferencePanel: React.FC = () => {
  return (
    <div className="absolute bottom-6 left-6 z-20 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-2xl p-4 shadow-2xl max-w-[280px]">
        <h3 className="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3 border-b border-slate-700 pb-2">
          Gesture Guide
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {GESTURES.map((gesture) => (
            <div 
              key={gesture.name}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-xl" role="img" aria-label={gesture.label}>
                {gesture.emoji}
              </span>
              <span className="text-xs text-slate-300 font-medium">
                {gesture.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};