
import { ExperienceEntry, VirtualSelfProfile, ActionTask, GrowthPlan } from '../types';

const LIB_KEY = 'vsc_library';
const PROFILE_KEY = 'vsc_profile';
const TASKS_KEY = 'vsc_tasks';
const PLAN_KEY = 'vsc_plan';

export const storageService = {
  saveLibrary: (library: ExperienceEntry[]) => {
    localStorage.setItem(LIB_KEY, JSON.stringify(library));
  },
  getLibrary: (): ExperienceEntry[] => {
    const data = localStorage.getItem(LIB_KEY);
    return data ? JSON.parse(data) : [];
  },
  saveProfile: (profile: VirtualSelfProfile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
  getProfile: (): VirtualSelfProfile | null => {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : null;
  },
  saveTasks: (tasks: ActionTask[]) => {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },
  getTasks: (): ActionTask[] => {
    const data = localStorage.getItem(TASKS_KEY);
    return data ? JSON.parse(data) : [];
  },
  savePlan: (plan: GrowthPlan) => {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
  },
  getPlan: (): GrowthPlan | null => {
    const data = localStorage.getItem(PLAN_KEY);
    return data ? JSON.parse(data) : null;
  },
  clearAll: () => {
    localStorage.clear();
  }
};
