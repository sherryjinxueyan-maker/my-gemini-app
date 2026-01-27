
import React from 'react';
import { ActionTask } from '../types';

interface TaskTrackerProps {
  tasks: ActionTask[];
  onToggleTask: (id: string) => void;
  onCheckIn: () => void;
  isCheckingIn: boolean;
  feedback?: string;
}

const TaskTracker: React.FC<TaskTrackerProps> = ({ tasks, onToggleTask, onCheckIn, isCheckingIn, feedback }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const dailyTasks = tasks.filter(t => t.frequency === 'DAILY');
  const weeklyTasks = tasks.filter(t => t.frequency === 'WEEKLY');
  const onceTasks = tasks.filter(t => t.frequency === 'ONCE');

  const renderTaskList = (list: ActionTask[], title: string) => {
    if (list.length === 0) return null;
    return (
      <div className="mb-8">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">{title}</h4>
        <div className="space-y-3">
          {list.map(task => {
            const isCompletedToday = task.completedDates.includes(todayStr);
            return (
              <div 
                key={task.id} 
                onClick={() => onToggleTask(task.id)}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer group active:scale-[0.98] ${
                  isCompletedToday 
                    ? 'bg-emerald-50 border-emerald-100 shadow-sm' 
                    : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                  isCompletedToday 
                    ? 'bg-emerald-500 border-emerald-500 text-white scale-110' 
                    : 'border-slate-200 text-transparent group-hover:border-indigo-300'
                }`}>
                  <i className="fas fa-check text-xs"></i>
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold tracking-tight ${isCompletedToday ? 'text-emerald-900 line-through opacity-50' : 'text-slate-700'}`}>
                    {task.title}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    累计达成: {task.completedDates.length} 次
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">行动任务</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">每一小步都是通向真实的自己</p>
          </div>
          <button 
            onClick={onCheckIn}
            disabled={isCheckingIn || tasks.length === 0}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-full text-xs font-black hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95 flex items-center gap-2"
          >
            {isCheckingIn ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-magic"></i>}
            每日监督反馈
          </button>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
            <div className="text-4xl text-slate-200 mb-4">
              <i className="fas fa-clipboard-list"></i>
            </div>
            <p className="text-slate-400 text-sm font-bold">暂无行动任务</p>
            <p className="text-slate-300 text-[11px] mt-1">请先去“探索”页面绘制你的生命地图</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {renderTaskList(dailyTasks, '每日挑战 / Daily')}
            {renderTaskList(weeklyTasks, '每周目标 / Weekly')}
            {renderTaskList(onceTasks, '单次尝试 / Once')}
          </div>
        )}
      </div>

      {feedback && (
        <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
          <div className="absolute right-[-2rem] bottom-[-2rem] opacity-5 text-[10rem] pointer-events-none rotate-12">
            <i className="fas fa-comments"></i>
          </div>
          <div className="relative z-10">
            <h4 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
              分身监督反馈
            </h4>
            <div className="text-sm italic leading-relaxed text-indigo-50/90 whitespace-pre-wrap">
              "{feedback}"
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskTracker;
