
import React from 'react';
import { ExperienceEntry, ExperienceCategory } from '../types';
import { CATEGORY_LABELS } from '../constants';

interface ExperienceLibraryProps {
  entries: ExperienceEntry[];
  onDelete: (id: string) => void;
}

const ExperienceLibrary: React.FC<ExperienceLibraryProps> = ({ entries, onDelete }) => {
  if (!entries) return null;
  const sortedEntries = [...entries].sort((a, b) => b.timestamp - a.timestamp);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">全维度经历库</h2>
        <span className="text-sm text-slate-500">{entries.length} 条记录</span>
      </div>

      {sortedEntries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-400">还没有记录，开始碎片化录入吧</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedEntries.map((entry) => {
            if (!entry) return null;
            // 安全查找分类配置，强制降级逻辑
            const category = entry.category || 'PERSONAL';
            const config = CATEGORY_LABELS[category] || CATEGORY_LABELS.PERSONAL;
            
            return (
              <div key={entry.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative group">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 ${config.color || 'bg-slate-100 text-slate-700'}`}>
                    {config.icon}
                    {config.label}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(entry.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed mb-3">
                  {entry.content}
                </p>
                <div className="flex flex-wrap gap-1">
                  {(entry.tags || []).map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
                <button 
                  onClick={() => onDelete(entry.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 p-1"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExperienceLibrary;
