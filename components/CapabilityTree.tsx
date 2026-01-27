
import React, { useMemo } from 'react';
import { ExperienceEntry } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface CapabilityTreeProps {
  entries: ExperienceEntry[];
}

const CapabilityTree: React.FC<CapabilityTreeProps> = ({ entries }) => {
  // Filter achievements and career events
  const milestones = useMemo(() => {
    return entries.filter(e => e.category === 'ACHIEVEMENT' || e.category === 'CAREER');
  }, [entries]);

  // Generate deterministic "leaf" positions based on entry ID
  const leaves = useMemo(() => {
    return milestones.slice(0, 30).map((m, i) => {
      const seed = m.id.charCodeAt(0) + m.id.charCodeAt(m.id.length - 1);
      const angle = (seed % 180) - 90; // -90 to 90 degrees
      const distance = 40 + (seed % 60); // 40 to 100 units from center
      const rad = (angle * Math.PI) / 180;
      
      return {
        id: m.id,
        x: 100 + Math.cos(rad) * distance,
        y: 100 + Math.sin(rad) * distance - 20, // Offset upwards
        category: m.category,
        label: m.content.substring(0, 10) + '...',
        color: m.category === 'ACHIEVEMENT' ? '#f59e0b' : '#3b82f6'
      };
    });
  }, [milestones]);

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden relative">
      <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-3">
        <i className="fas fa-tree text-emerald-500"></i>
        能力生长树 / Capability Tree
      </h3>
      <p className="text-xs text-slate-400 mb-8">每一项成就与经历，都是你成长的叶片</p>
      
      <div className="flex justify-center items-center h-80 relative">
        <svg viewBox="0 0 200 200" className="w-full h-full max-w-sm">
          {/* Main Trunk */}
          <path 
            d="M100,180 Q100,140 100,100 Q100,80 80,60 M100,100 Q100,80 120,60 M100,140 Q100,120 70,110 M100,120 Q100,100 130,90" 
            stroke="#4b3621" 
            strokeWidth="4" 
            fill="none" 
            strokeLinecap="round" 
          />
          
          {/* Leaves (Achievements) */}
          {leaves.map((leaf, i) => (
            <g key={leaf.id} className="animate-in" style={{ animationDelay: `${i * 0.1}s` }}>
              <circle 
                cx={leaf.x} 
                cy={leaf.y} 
                r="6" 
                fill={leaf.color} 
                className="opacity-80 hover:opacity-100 transition-opacity cursor-pointer shadow-lg"
              >
                <title>{leaf.label}</title>
              </circle>
              <path 
                d={`M100,100 Q${leaf.x},100 ${leaf.x},${leaf.y}`} 
                stroke={leaf.color} 
                strokeWidth="0.5" 
                fill="none" 
                strokeDasharray="2,2" 
                className="opacity-20"
              />
            </g>
          ))}
          
          {/* Base */}
          <ellipse cx="100" cy="180" rx="40" ry="10" fill="#f1f5f9" />
        </svg>

        <div className="absolute bottom-4 right-4 space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-[10px] font-bold text-slate-400">职业/学习</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-[10px] font-bold text-slate-400">成就感事件</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapabilityTree;
