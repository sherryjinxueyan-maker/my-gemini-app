
import React from 'react';
import { WeeklySummary } from '../types';

interface WeeklyRetrospectiveProps {
  summary: WeeklySummary | null;
  onRefresh: () => void;
  isLoading: boolean;
}

const WeeklyRetrospective: React.FC<WeeklyRetrospectiveProps> = ({ summary, onRefresh, isLoading }) => {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
            <i className="fas fa-calendar-check text-indigo-500"></i>
            每周回顾 / Retrospective
          </h3>
          <p className="text-xs text-slate-400 mt-1">{summary?.period || '尚未生成回顾'}</p>
        </div>
        <button 
          onClick={onRefresh}
          disabled={isLoading}
          className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors"
        >
          {isLoading ? <i className="fas fa-spinner fa-spin mr-1"></i> : <i className="fas fa-sync-alt mr-1"></i>}
          同步最新回顾
        </button>
      </div>

      {!summary ? (
        <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <p className="text-slate-400 text-sm">点击上方按钮，让 AI 深度解析你本周的变化</p>
        </div>
      ) : (
        <div className="space-y-8 animate-in">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-lg">
            <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">本周状态总结</h4>
            <p className="text-sm font-medium leading-relaxed">{summary.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">核心价值偏移</h4>
              <p className="text-sm text-slate-700 leading-relaxed italic">
                {summary.valueShifts}
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 pl-1">深度洞察 / Insights</h4>
              <ul className="space-y-3">
                {summary.topInsights.map((insight, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-50 shadow-sm">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-full font-black shrink-0">{i+1}</span>
                    {insight}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyRetrospective;
