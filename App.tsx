
import React, { useState, useEffect, useCallback } from 'react';
import { ExperienceEntry, VirtualSelfProfile, ExperienceCategory, GrowthPlan, ActionTask, WeeklySummary, OnboardingData } from './types';
import { storageService } from './services/storageService';
import * as gemini from './services/geminiService';
import { playRawPcm } from './services/audioService';
import ExperienceLibrary from './components/ExperienceLibrary';
import GuidedQA from './components/GuidedQA';
import TaskTracker from './components/TaskTracker';
import CompanionAvatar from './components/CompanionAvatar';
import WeeklyRetrospective from './components/WeeklyRetrospective';
import CapabilityTree from './components/CapabilityTree';
import Onboarding from './components/Onboarding';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Radar as RechartsRadar } from 'recharts';

type View = 'LIBRARY' | 'COMPANION' | 'EXPLORE' | 'TASKS';

const App: React.FC = () => {
  const [library, setLibrary] = useState<ExperienceEntry[]>([]);
  const [profile, setProfile] = useState<VirtualSelfProfile | null>(null);
  const [currentView, setCurrentView] = useState<View>('LIBRARY');
  const [isProcessing, setIsProcessing] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<string>('');
  const [rawInput, setRawInput] = useState('');
  const [growthPlan, setGrowthPlan] = useState<GrowthPlan | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null);
  const [tasks, setTasks] = useState<ActionTask[]>([]);
  const [feedback, setFeedback] = useState<string>('');
  const [speech, setSpeech] = useState<string>('欢迎回来，今天也一起探索真实的自己吗？');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedLib = storageService.getLibrary();
    const savedProfile = storageService.getProfile();
    const savedTasks = storageService.getTasks();
    const savedPlan = storageService.getPlan();

    setLibrary(savedLib || []);
    setTasks(savedTasks || []);
    setGrowthPlan(savedPlan);
    if (savedProfile) setProfile(savedProfile);
  }, []);

  const handleError = (e: any) => {
    console.error("App Error:", e);
    const msg = e?.message || "发生未知错误";
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(null), 5000);
  };

  const saveAll = useCallback((newLib: ExperienceEntry[], newProfile: VirtualSelfProfile | null, newTasks: ActionTask[], newPlan: GrowthPlan | null) => {
    storageService.saveLibrary(newLib);
    if (newProfile) storageService.saveProfile(newProfile);
    storageService.saveTasks(newTasks);
    if (newPlan) storageService.savePlan(newPlan);
  }, []);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setIsProcessing(true);
    setOnboardingStatus('正在深度对齐人格数据库...');
    try {
      const { profile: initProfile, entries: initEntries } = await gemini.initializeProfileFromOnboarding(data);
      setOnboardingStatus('正在合成数字生命形象...');
      let avatarUrl = "";
      try {
        avatarUrl = await gemini.generateAvatarFromOOTD(initProfile.ootd!, initProfile.gender);
      } catch (imgError) {}
      const finalProfile = { ...initProfile, avatarUrl, initialized: true };
      setProfile(finalProfile);
      setLibrary(initEntries);
      saveAll(initEntries, finalProfile, [], null);
      setCurrentView('COMPANION');
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
      setOnboardingStatus('');
    }
  };

  const handleRawInput = async () => {
    if (!rawInput.trim() || !profile) return;
    setIsProcessing(true);
    try {
      const results = await gemini.processRawInput(rawInput);
      const newEntries = results.map(r => ({
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      } as ExperienceEntry));
      const updatedLib = [...newEntries, ...library];
      setLibrary(updatedLib);
      setRawInput('');
      const newProfile = await gemini.updateProfile(updatedLib, profile.gender);
      if (profile.avatarUrl) newProfile.avatarUrl = profile.avatarUrl;
      setProfile(newProfile);
      saveAll(updatedLib, newProfile, tasks, growthPlan);
      const responseSpeech = await gemini.getCompanionSpeech("用户录入了新经历", newProfile);
      setSpeech(responseSpeech);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSpeak = async (text: string) => {
    if (!text || !profile) return;
    setIsSpeaking(true);
    try {
      const audioBase64 = await gemini.generateSpeech(text, profile.gender);
      if (audioBase64) await playRawPcm(audioBase64);
    } catch (e) {
      handleError(e);
    } finally {
      setIsSpeaking(false);
    }
  };

  const handleGeneratePlan = async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const plan = await gemini.generateGrowthPlan(profile, library);
      setGrowthPlan(plan);
      const newTasks: ActionTask[] = (plan.suggestedTasks || []).map(t => ({
        id: Math.random().toString(36).substr(2, 9),
        title: t.title,
        frequency: t.frequency as 'DAILY' | 'WEEKLY' | 'ONCE',
        completedDates: [],
        createdAt: Date.now()
      }));
      setTasks(newTasks);
      saveAll(library, profile, newTasks, plan);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefreshWeeklySummary = async () => {
    if (library.length < 1) return;
    setIsProcessing(true);
    try {
      const summary = await gemini.generateWeeklySummary(library);
      setWeeklySummary(summary);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleTask = (id: string) => {
    const today = new Date().toISOString().split('T')[0];
    const updatedTasks = tasks.map(t => {
      if (t.id === id) {
        const isCompleted = t.completedDates.includes(today);
        return {
          ...t,
          completedDates: isCompleted 
            ? t.completedDates.filter(d => d !== today)
            : [...t.completedDates, today],
          lastCompleted: isCompleted ? t.lastCompleted : today
        };
      }
      return t;
    });
    setTasks(updatedTasks);
    storageService.saveTasks(updatedTasks);
  };

  const handleCheckIn = async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const fb = await gemini.getCheckInFeedback(tasks, profile);
      setFeedback(fb);
      await handleSpeak(fb);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!profile) return <Onboarding onComplete={handleOnboardingComplete} isProcessing={isProcessing} />;

  const radarData = [
    { subject: '核心价值', A: 85 },
    { subject: '优势', A: (profile.strengths || []).length * 20 },
    { subject: '挑战', A: (profile.shortcomings || []).length * 25 },
    { subject: '兴趣', A: (profile.interestDirections || []).length * 20 },
    { subject: '羁绊', A: profile.affinity || 50 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex justify-between">
          <p className="text-sm font-bold">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)}><i className="fas fa-times"></i></button>
        </div>
      )}

      {isProcessing && onboardingStatus && (
        <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-black">{onboardingStatus}</h3>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-fingerprint"></i>
            </div>
            <h1 className="text-xl font-black">Virtual Self</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['LIBRARY', 'COMPANION', 'EXPLORE', 'TASKS'] as View[]).map(v => (
              <button key={v} onClick={() => setCurrentView(v)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentView === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>
                {v === 'LIBRARY' ? '经历' : v === 'COMPANION' ? '分身' : v === 'EXPLORE' ? '地图' : '任务'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8">
        {currentView === 'LIBRARY' && (
          <div className="space-y-8">
            <GuidedQA onAnswer={(c, cat) => {
              const entry = { id: Math.random().toString(36).substr(2, 9), content: c, category: cat as ExperienceCategory, timestamp: Date.now(), tags: ['qa'] };
              const newLib = [entry, ...library];
              setLibrary(newLib);
              storageService.saveLibrary(newLib);
            }} />
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex gap-3">
                <input type="text" value={rawInput} onChange={(e) => setRawInput(e.target.value)} placeholder="刚才发生了什么？" className="flex-1 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl px-4 py-3 text-sm outline-none" onKeyDown={(e) => e.key === 'Enter' && handleRawInput()} />
                <button onClick={handleRawInput} disabled={isProcessing || !rawInput.trim()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-md disabled:opacity-50">
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
            <ExperienceLibrary entries={library} onDelete={(id) => {
              const updated = library.filter(e => e.id !== id);
              setLibrary(updated);
              storageService.saveLibrary(updated);
            }} />
          </div>
        )}

        {currentView === 'COMPANION' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5">
              <CompanionAvatar mood={profile.mood} affinity={profile.affinity} speech={speech} avatarUrl={profile.avatarUrl} onSpeak={() => handleSpeak(speech)} isSpeaking={isSpeaking} onRefreshAvatar={() => {}} />
            </div>
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">人格特征</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold mb-2">优势才华</p>
                    <div className="flex flex-wrap gap-1">{(profile.strengths || []).map(s => <span key={s} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs">{s}</span>)}</div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl">
                    <p className="text-[10px] text-amber-600 font-bold mb-2">挑战/底线</p>
                    <div className="flex flex-wrap gap-1">{(profile.shortcomings || []).map(s => <span key={s} className="bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded-md text-xs">{s}</span>)}</div>
                  </div>
                </div>
              </div>
              <div className="h-64 bg-white rounded-3xl border border-slate-100 p-4 shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fill: '#64748b'}} />
                    <RechartsRadar name="Self" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {currentView === 'EXPLORE' && (
          <div className="space-y-8 pb-12">
            {!growthPlan ? (
              <div className="bg-indigo-900 text-white p-12 rounded-[3rem] text-center shadow-2xl">
                <h2 className="text-3xl font-black mb-4">开启生命地图</h2>
                <button onClick={handleGeneratePlan} disabled={isProcessing || library.length < 3} className="bg-white text-indigo-900 px-10 py-4 rounded-full font-black shadow-2xl disabled:opacity-50">
                  {isProcessing ? '正在解析...' : '生成成长计划'}
                </button>
              </div>
            ) : (
              <div className="space-y-8 animate-in">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-2xl font-black text-slate-800 mb-6">核心导航</h3>
                  <p className="text-slate-700 bg-slate-50 p-6 rounded-2xl italic mb-10 border border-slate-100">{growthPlan.coreValuesAnalysis}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">建议方向</h4>
                      {(growthPlan.directions || []).map((dir, i) => (
                        <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm mb-3">
                          <h5 className="font-bold mb-1">{dir.title}</h5>
                          <p className="text-xs text-slate-500">{dir.reasoning}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">短期目标</h4>
                      <ul className="space-y-2">{(growthPlan.shortTerm || []).map((goal, i) => <li key={i} className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">{goal}</li>)}</ul>
                    </div>
                  </div>
                </div>
                <CapabilityTree entries={library} />
                <WeeklyRetrospective summary={weeklySummary} isLoading={isProcessing} onRefresh={handleRefreshWeeklySummary} />
              </div>
            )}
          </div>
        )}

        {currentView === 'TASKS' && (
          <div className="animate-in">
            <TaskTracker tasks={tasks} onToggleTask={handleToggleTask} onCheckIn={handleCheckIn} isCheckingIn={isProcessing} feedback={feedback} />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 md:hidden z-50 px-6 py-3 flex justify-around items-center">
        {(['LIBRARY', 'COMPANION', 'EXPLORE', 'TASKS'] as View[]).map(v => (
          <button key={v} onClick={() => setCurrentView(v)} className={`flex flex-col items-center gap-1 ${currentView === v ? 'text-indigo-600' : 'text-slate-400'}`}>
            <i className={`fas fa-${v === 'LIBRARY' ? 'book' : v === 'COMPANION' ? 'user-circle' : v === 'EXPLORE' ? 'map' : 'check-square'}`}></i>
            <span className="text-[10px] font-bold">{v === 'LIBRARY' ? '经历' : v === 'COMPANION' ? '分身' : v === 'EXPLORE' ? '地图' : '任务'}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
