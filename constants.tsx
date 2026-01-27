
import React from 'react';
import { ExperienceCategory } from './types';

// Fix: Added missing properties 'VISION', 'ANXIETY', and 'PERSONAL' to match ExperienceCategory type definition.
export const CATEGORY_LABELS: Record<ExperienceCategory, { label: string; icon: React.ReactNode; color: string }> = {
  CAREER: { 
    label: '职业/学习', 
    icon: <i className="fas fa-briefcase"></i>,
    color: 'bg-blue-100 text-blue-700'
  },
  ACHIEVEMENT: { 
    label: '成就感', 
    icon: <i className="fas fa-trophy"></i>,
    color: 'bg-yellow-100 text-yellow-700'
  },
  JOY: { 
    label: '愉悦投入', 
    icon: <i className="fas fa-heart"></i>,
    color: 'bg-pink-100 text-pink-700'
  },
  CHOICE_REGRET: { 
    label: '选择与遗憾', 
    icon: <i className="fas fa-code-branch"></i>,
    color: 'bg-purple-100 text-purple-700'
  },
  INTEREST: { 
    label: '兴趣尝试', 
    icon: <i className="fas fa-lightbulb"></i>,
    color: 'bg-green-100 text-green-700'
  },
  ABILITY_SHORTCOMING: { 
    label: '能力与短板', 
    icon: <i className="fas fa-chart-line"></i>,
    color: 'bg-orange-100 text-orange-700'
  },
  VISION: { 
    label: '愿景与未来', 
    icon: <i className="fas fa-eye"></i>,
    color: 'bg-indigo-100 text-indigo-700'
  },
  ANXIETY: { 
    label: '焦虑与挑战', 
    icon: <i className="fas fa-cloud-rain"></i>,
    color: 'bg-slate-200 text-slate-700'
  },
  PERSONAL: { 
    label: '个人日常', 
    icon: <i className="fas fa-user"></i>,
    color: 'bg-teal-100 text-teal-700'
  }
};

export const INITIAL_QUESTIONS = [
  { id: 'q1', question: '最近一次做什么事，让你觉得“我做得真不错”？哪怕是小事。', category: 'ACHIEVEMENT' as ExperienceCategory },
  { id: 'q2', question: '有没有一件事，你做的时候会忘记看时间？核心快乐是什么？', category: 'JOY' as ExperienceCategory },
  { id: 'q3', question: '如果不用考虑赚钱，你最想每天花时间做什么？', category: 'INTEREST' as ExperienceCategory },
];
