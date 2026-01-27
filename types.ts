
export type ExperienceCategory = 
  | 'CAREER' 
  | 'ACHIEVEMENT' 
  | 'JOY' 
  | 'CHOICE_REGRET' 
  | 'INTEREST' 
  | 'ABILITY_SHORTCOMING'
  | 'VISION'
  | 'ANXIETY'
  | 'PERSONAL';

export interface ExperienceEntry {
  id: string;
  timestamp: number;
  content: string;
  category: ExperienceCategory;
  tags: string[];
}

export interface VirtualSelfProfile {
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY';
  coreValues: string[];
  strengths: string[];
  shortcomings: string[]; // Added: Areas for improvement/shadow traits
  growthSuggestions: string[]; // Added: Decision suggestions
  joyTriggers: string[];
  interestDirections: string[];
  summary: string;
  mood: string; 
  affinity: number; 
  avatarUrl?: string; 
  ootd?: string; 
  initialized?: boolean;
}

export interface OnboardingData {
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY';
  basicInfo: string;
  satisfactions: string;
  anxieties: string;
  vision2026: string;
  antiLife: string;
}

export interface GuidedQuestion {
  id: string;
  question: string;
  category: ExperienceCategory;
}

export interface ActionTask {
  id: string;
  title: string;
  frequency: 'DAILY' | 'WEEKLY' | 'ONCE';
  completedDates: string[];
  lastCompleted?: string;
  createdAt: number;
}

export interface GrowthPlan {
  coreValuesAnalysis: string;
  directions: { title: string; reasoning: string; fit: string }[];
  shortTerm: string[];
  midTerm: string[];
  actionGuide: string;
  suggestedTasks: { title: string; frequency: 'DAILY' | 'WEEKLY' | 'ONCE' }[];
}

export interface WeeklySummary {
  period: string;
  summary: string;
  valueShifts: string;
  topInsights: string[];
  generatedAt: number;
}
