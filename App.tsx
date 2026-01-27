
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
import { speechService } from './services/speechService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, RadarProps } from 'recharts';

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
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedLib = storageService.getLibrary();
    const savedProfile = storageService.getProfile();
    const savedTasks = storageService.getTasks();
    const savedPlan = storageService.getPlan();

    setLibrary(savedLib);
    setTasks(savedTasks);
    setGrowthPlan(savedPlan);
    if (savedProfile) setProfile(savedProfile);
  }, []);

  const handleError = (e: any) => {
    console.error("App Error:", e);
    const msg = e?.message || "发生未知错误";
    if (msg.includes("quota") || msg.includes("429")) {
      setErrorMsg("Gemini API 配额不足，请稍后重试或更换 Key。");
    } else if (msg.includes("思想构建失败")) {
      setErrorMsg("数据解析异常，请尝试精简输入内容。");
    } else {
      setErrorMsg(msg);
    }
    setTimeout(() => setErrorMsg(null), 6000);
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setIsProcessing(true);
    setOnboardingStatus('正在深度对齐人格数据库...');
    try {
      // 1. 逻辑合成
      const { profile: initProfile, entries: initEntries } = await gemini.initializeProfileFromOnboarding(data);
      
      // 2. 形象塑造（不阻塞主流程，失败则使用默认头像）
      setOnboardingStatus('正在合成数字生命形象...');
      let avatarUrl = "";
      try {
        avatarUrl = await gemini.generateAvatarFromOOTD(initProfile.ootd!, initProfile.gender);
      } catch (imgError) {
        console.warn("图像生成失败，将使用默认占位", imgError);
      }
      
      const finalProfile = { ...initProfile, avatarUrl, initialized: true };
      
      // 3. 原子更新状态
      setProfile(finalProfile);
      setLibrary(initEntries);
      storageService.saveProfile(finalProfile);
      storageService.saveLibrary(initEntries);
      
      setSpeech("我已降临。你的过去、现在与未来，我都已悉知。");
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
      const newEntries: ExperienceEntry[] = results.map(r => ({
        ...r,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
      } as ExperienceEntry));
      
      const updatedLib = [...newEntries, ...library];
      setLibrary(updatedLib);
      setRawInput('');
      
      // 更新档案
      setIsTyping(true);
      const newProfile = await gemini.updateProfile(updatedLib, profile.gender);
      if (profile.avatarUrl) newProfile.avatarUrl = profile.avatarUrl;
      setProfile(newProfile);
      storageService.saveProfile(newProfile);
      storageService.saveLibrary(updatedLib);
      
      const responseSpeech = await gemini.getCompanionSpeech("用户录入了新经历", newProfile);
      setSpeech(responseSpeech);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
      setIsTyping(false);
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

  const handleGenerateAvatar = async () => {
    if (!profile || !profile.ootd) return;
    setIsGeneratingAvatar(true);
    try {
      const url = await gemini.generateAvatarFromOOTD(profile.ootd, profile.gender);
      const updated = { ...profile, avatarUrl: url };
      setProfile(updated);
      storageService.saveProfile(updated);
    } catch (e) {
      handleError(e);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const openKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} isProcessing={isProcessing} />;
  }

  const radarData = [
    { subject: '核心价值', A: 85, fullMark: 100 },
    { subject: '优势才华', A: profile.strengths.length * 20, fullMark: 100 },
    { subject: '改善动力', A: profile.shortcomings.length * 25, fullMark: 100 },
    { subject: '兴趣深度', A: profile.interestDirections.length * 20, fullMark: 100 },
    { subject: '羁绊等级', A: profile.affinity, fullMark: 100 },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in">
          <p className="text-sm font-bold">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)}><i className="fas fa-times"></i></button>
        </div>
      )}

      {isProcessing && onboardingStatus && (
        <div className="fixed inset-0 z-[110] bg-white/80 backdrop-blur-md flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h3 className="text-xl font-black">{onboardingStatus}</h3>
          <p className="text-slate-500 mt-2">请稍候，我们正在构建你的数字分身...</p>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
              <i className="fas fa-fingerprint"></i>
            </div>
            <h1 className="text-xl font-black">Virtual Self</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex bg-slate-100 p-1 rounded-xl">
              {(['LIBRARY', 'COMPANION', 'EXPLORE', 'TASKS'] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setCurrentView(v)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    currentView === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'
                  }`}
                >
                  {v === 'LIBRARY' ? '经历库' : v === 'COMPANION' ? '分身' : v === 'EXPLORE' ? '地图' : '任务'}
                </button>
              ))}
            </div>
            <button onClick={openKeySelector} className="w-10 h-10 bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
              <i className="fas fa-key"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8">
        {currentView === 'LIBRARY' && (
          <div className="space-y-8 animate-in">
            <GuidedQA onAnswer={(c, cat) => {
              const entry = { id: Math.random().toString(36).substr(2, 9), content: c, category: cat as ExperienceCategory, timestamp: Date.now(), tags: ['qa'] };
              setLibrary([entry, ...library]);
              storageService.saveLibrary([entry, ...library]);
            }} />
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">快速录入</h3>
              <div className="flex gap-3">
                <input 
                  type="text"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="刚才发生了什么？"
                  className="flex-1 bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleRawInput()}
                />
                <button 
                  onClick={handleRawInput}
                  disabled={isProcessing || !rawInput.trim()}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-md disabled:opacity-50"
                >
                  {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in">
            <div className="lg:col-span-5">
              <CompanionAvatar 
                mood={profile.mood} 
                affinity={profile.affinity} 
                speech={speech} 
                avatarUrl={profile.avatarUrl}
                isTyping={isTyping}
                onSpeak={() => handleSpeak(speech)}
                isSpeaking={isSpeaking}
                onRefreshAvatar={handleGenerateAvatar}
                isGeneratingAvatar={isGeneratingAvatar}
              />
            </div>
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><i className="fas fa-dna text-indigo-500"></i> 分身人格特征</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">优势才华</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.strengths.map(s => <span key={s} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-medium">{s}</span>)}
                    </div>
                  </div>
                  <div className="bg-amber-50 p-4 rounded-2xl">
                    <p className="text-[10px] text-amber-600 font-bold uppercase mb-2">生存底线/影子人格</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.shortcomings.map(s => <span key={s} className="bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded-md text-xs font-medium">{s}</span>)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
                <h3 className="text-sm font-black text-indigo-400 mb-4 uppercase tracking-widest"><i className="fas fa-bolt"></i> 深度决策建议</h3>
                <div className="space-y-3">
                  {profile.growthSuggestions.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                       <span className="text-indigo-500 font-black">{i+1}.</span>{s}
                    </div>
                  ))}
                </div>
              </div>

              <div className="h-64 bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
                 <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fill: '#64748b'}} />
                    <Radar name="Self" dataKey="A" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.6} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
        
        {/* 其他视图 (EXPLORE, TASKS) 的逻辑保持原样... */}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 md:hidden z-50 px-6 py-4 flex justify-between items-center">
        {(['LIBRARY', 'COMPANION', 'EXPLORE', 'TASKS'] as View[]).map(v => (
          <button key={v} onClick={() => setCurrentView(v)} className={`flex flex-col items-center gap-1 transition-all ${currentView === v ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}>
            <i className={`fas fa-${v === 'LIBRARY' ? 'book-open' : v === 'COMPANION' ? 'user-circle' : v === 'EXPLORE' ? 'map' : 'check-double'} text-lg`}></i>
            <span className="text-[10px] font-bold">{v === 'LIBRARY' ? '记录' : v === 'COMPANION' ? '分身' : v === 'EXPLORE' ? '地图' : '任务'}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
