
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

    if (savedProfile) {
      if (!savedProfile.initialized && speech === '欢迎回来，今天也一起探索真实的自己吗？') {
        const welcomeSpeech = "我已降临。你的过去、现在与未来，我都已悉知。让我们开始这段旅程吧。";
        setSpeech(welcomeSpeech);
        const updatedProfile = { ...savedProfile, initialized: true };
        setProfile(updatedProfile);
        storageService.saveProfile(updatedProfile);
      } else {
        setProfile(savedProfile);
      }
    }
  }, []);

  const clearError = () => setErrorMsg(null);

  const handleError = (e: any) => {
    console.error(e);
    const msg = e?.message || "发生未知错误";
    if (msg.includes("quota") || msg.includes("limit") || msg.includes("429")) {
      setErrorMsg("API 配额已达上限。请稍后再试。");
    } else {
      setErrorMsg(msg);
    }
    setTimeout(clearError, 8000);
  };

  const saveAll = useCallback((newLib: ExperienceEntry[], newProfile: VirtualSelfProfile | null, newTasks: ActionTask[], newPlan: GrowthPlan | null) => {
    storageService.saveLibrary(newLib);
    if (newProfile) storageService.saveProfile(newProfile);
    storageService.saveTasks(newTasks);
    if (newPlan) storageService.savePlan(newPlan);
  }, []);

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

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setIsProcessing(true);
    try {
      const { profile: initProfile, entries: initEntries } = await gemini.initializeProfileFromOnboarding(data);
      setProfile(initProfile);
      setLibrary(initEntries);
      storageService.saveProfile(initProfile);
      storageService.saveLibrary(initEntries);
      
      setIsGeneratingAvatar(true);
      // Pass gender to avatar generation
      const avatarUrl = await gemini.generateAvatarFromOOTD(initProfile.ootd!, initProfile.gender);
      const finalProfile = { ...initProfile, avatarUrl, initialized: true };
      setProfile(finalProfile);
      storageService.saveProfile(finalProfile);
      setIsGeneratingAvatar(false);
      
      setSpeech("我已降临。你的过去、现在与未来，我都已悉知。让我们开始这段旅程吧。");
      setCurrentView('COMPANION');
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateVirtualSelf = useCallback(async (newLib: ExperienceEntry[]) => {
    if (!profile) return;
    try {
      setIsTyping(true);
      const newProfile = await gemini.updateProfile(newLib, profile.gender);
      if (profile?.avatarUrl) {
        newProfile.avatarUrl = profile.avatarUrl;
      }
      setProfile(newProfile);
      
      const newSpeech = await gemini.getCompanionSpeech("用户更新了经历库", newProfile);
      setSpeech(newSpeech);
      
      saveAll(newLib, newProfile, tasks, growthPlan);
    } catch (e) {
      handleError(e);
    } finally {
      setIsTyping(false);
    }
  }, [tasks, growthPlan, saveAll, profile]);

  const handleGenerateAvatar = async () => {
    if (!profile || !profile.ootd) return;
    setIsGeneratingAvatar(true);
    try {
      const avatarUrl = await gemini.generateAvatarFromOOTD(profile.ootd, profile.gender);
      const updatedProfile = { ...profile, avatarUrl };
      setProfile(updatedProfile);
      storageService.saveProfile(updatedProfile);
      setSpeech("这就是我现在的样子，你觉得怎么样？希望能带给你更多力量。");
      await handleSpeak("这就是我现在的样子，你觉得怎么样？希望能带给你更多力量。");
    } catch (e) {
      handleError(e);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  const handleRawInput = async () => {
    if (!rawInput.trim()) return;
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
      await updateVirtualSelf(updatedLib);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      speechService.start({
        onResult: (result) => {
          setRawInput(prev => result.isFinal ? (prev + result.transcript) : (prev.split(' ').slice(0, -1).join(' ') + ' ' + result.transcript).trim());
        },
        onEnd: () => setIsListening(false),
        onError: (err) => {
          console.error(err);
          setIsListening(false);
        }
      });
    }
  };

  const handleAnswer = async (content: string, category: string) => {
    const newEntry: ExperienceEntry = {
      id: Math.random().toString(36).substr(2, 9),
      content,
      category: category as ExperienceCategory,
      timestamp: Date.now(),
      tags: ['guided-qa']
    };
    const updatedLib = [newEntry, ...library];
    setLibrary(updatedLib);
    await updateVirtualSelf(updatedLib);
  };

  const handleDeleteEntry = (id: string) => {
    const updatedLib = library.filter(e => e.id !== id);
    setLibrary(updatedLib);
    storageService.saveLibrary(updatedLib);
  };

  const handleGeneratePlan = async () => {
    if (!profile) return;
    setIsProcessing(true);
    try {
      const plan = await gemini.generateGrowthPlan(profile, library);
      setGrowthPlan(plan);
      
      const newTasks: ActionTask[] = plan.suggestedTasks.map(t => ({
        id: Math.random().toString(36).substr(2, 9),
        title: t.title,
        frequency: t.frequency,
        completedDates: [],
        createdAt: Date.now()
      }));
      setTasks(newTasks);
      saveAll(library, profile, newTasks, plan);
      setCurrentView('EXPLORE');
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
        const completed = t.completedDates.includes(today);
        return {
          ...t,
          completedDates: completed 
            ? t.completedDates.filter(d => d !== today)
            : [...t.completedDates, today],
          lastCompleted: completed ? t.lastCompleted : today
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
      const feedbackText = await gemini.getCheckInFeedback(tasks, profile);
      setFeedback(feedbackText);
      await handleSpeak(feedbackText);
    } catch (e) {
      handleError(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const openKeySelector = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
  };

  const radarData = profile ? [
    { subject: '核心价值', A: 80, fullMark: 100 },
    { subject: '优势才华', A: profile.strengths.length * 20, fullMark: 100 },
    { subject: '改善动力', A: profile.shortcomings.length * 25, fullMark: 100 },
    { subject: '兴趣深度', A: profile.interestDirections.length * 20, fullMark: 100 },
    { subject: '羁绊等级', A: profile.affinity, fullMark: 100 },
  ] : [];

  const showOnboarding = !profile;

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} isProcessing={isProcessing} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {errorMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <i className="fas fa-exclamation-triangle"></i>
            <p className="text-sm font-bold">{errorMsg}</p>
          </div>
          <button onClick={clearError} className="p-1">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      <header className="bg-white border-b border-slate-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <i className="fas fa-fingerprint text-lg"></i>
            </div>
            <h1 className="text-xl font-black tracking-tight text-slate-800">Virtual Self <span className="text-indigo-600">Companion</span></h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {(['LIBRARY', 'COMPANION', 'EXPLORE', 'TASKS'] as View[]).map(v => (
                <button
                  key={v}
                  onClick={() => setCurrentView(v)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    currentView === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {v === 'LIBRARY' && '经历库'}
                  {v === 'COMPANION' && '分身'}
                  {v === 'EXPLORE' && '生命地图'}
                  {v === 'TASKS' && '行动'}
                </button>
              ))}
            </div>
            <button 
              onClick={openKeySelector}
              className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-100 transition-all"
              title="切换 API Key"
            >
              <i className="fas fa-key"></i>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8">
        {currentView === 'LIBRARY' && (
          <div className="space-y-8 animate-in">
            <GuidedQA onAnswer={handleAnswer} />
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-widest">碎片化录入 / Fast Record</h3>
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input 
                    type="text"
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder={isListening ? "正在聆听..." : "刚才发生了什么？"}
                    className="w-full bg-slate-50 border-none ring-1 ring-slate-200 rounded-xl pl-4 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleRawInput()}
                  />
                  <button 
                    onClick={toggleListening}
                    className={`absolute right-2 top-1.5 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'text-slate-400 hover:text-indigo-600'
                    }`}
                  >
                    <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
                  </button>
                </div>
                <button 
                  onClick={handleRawInput}
                  disabled={isProcessing || !rawInput.trim()}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50"
                >
                  {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
                </button>
              </div>
            </div>
            <ExperienceLibrary entries={library} onDelete={handleDeleteEntry} />
          </div>
        )}

        {currentView === 'COMPANION' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in">
            <div className="lg:col-span-5">
              <CompanionAvatar 
                mood={profile?.mood || 'Curious'} 
                affinity={profile?.affinity || 0} 
                speech={speech} 
                avatarUrl={profile?.avatarUrl}
                isTyping={isTyping}
                onSpeak={() => handleSpeak(speech)}
                isSpeaking={isSpeaking}
                onRefreshAvatar={handleGenerateAvatar}
                isGeneratingAvatar={isGeneratingAvatar}
              />
            </div>
            <div className="lg:col-span-7 space-y-6">
              {profile ? (
                <>
                  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <i className="fas fa-dna text-indigo-500"></i> 分身人格特征 ({profile.gender === 'MALE' ? '男' : (profile.gender === 'FEMALE' ? '女' : '多元')})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-2xl">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">优势才华</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.strengths.map(s => <span key={s} className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-medium">{s}</span>)}
                        </div>
                      </div>
                      <div className="bg-amber-50 p-4 rounded-2xl">
                        <p className="text-[10px] text-amber-600 font-bold uppercase mb-2">人格短板 (Shadow Side)</p>
                        <div className="flex flex-wrap gap-1">
                          {profile.shortcomings.map(s => <span key={s} className="bg-white border border-amber-200 text-amber-700 px-2 py-1 rounded-md text-xs font-medium">{s}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
                    <h3 className="text-sm font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <i className="fas fa-bolt"></i> 好友的决策建议
                    </h3>
                    <div className="space-y-3">
                      {profile.growthSuggestions.map((s, i) => (
                        <div key={i} className="flex gap-3 text-sm text-slate-300 bg-slate-800/50 p-3 rounded-xl border border-white/5">
                           <span className="text-indigo-500 font-black">{i+1}.</span>
                           {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="h-64 bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
                     <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="subject" tick={{fontSize: 10}} />
                        <Radar
                          name="Self"
                          dataKey="A"
                          stroke="#4f46e5"
                          fill="#4f46e5"
                          fillOpacity={0.6}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}

        {currentView === 'EXPLORE' && (
          <div className="space-y-12 pb-12 animate-in">
            {!growthPlan ? (
              <div className="bg-indigo-900 text-white p-12 rounded-[3rem] text-center relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32"></div>
                <div className="relative z-10">
                  <h2 className="text-3xl font-black mb-4">开启你的生命地图</h2>
                  <p className="text-indigo-200 max-w-lg mx-auto mb-8 leading-relaxed">
                    基于“八木仁平”自我探索逻辑，提炼核心价值，绘制属于你的「深度成长计划」。
                  </p>
                  <button 
                    onClick={handleGeneratePlan}
                    disabled={isProcessing || library.length < 1}
                    className="bg-white text-indigo-900 px-8 py-4 rounded-full font-black shadow-2xl hover:bg-indigo-50 transition-all disabled:opacity-50"
                  >
                    {isProcessing ? '正在深度解析中...' : '生成成长计划'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-in space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
                   <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                      <i className="fas fa-compass text-indigo-500"></i> 核心导航
                    </h3>
                    <button 
                      onClick={handleGeneratePlan}
                      className="text-xs font-bold text-indigo-600 hover:underline"
                    >
                      重新生成地图
                    </button>
                   </div>
                  <div className="prose prose-slate max-w-none mb-10">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">核心价值深度解析</h4>
                    <p className="text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-2xl italic border border-slate-100">
                      {growthPlan.coreValuesAnalysis}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">推荐事业方向</h4>
                      <div className="space-y-3">
                        {growthPlan.directions.map((dir, i) => (
                          <div key={i} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                            <h5 className="font-bold text-slate-800 mb-1">{dir.title}</h5>
                            <p className="text-xs text-slate-500 mb-2 leading-relaxed">{dir.reasoning}</p>
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">匹配度: {dir.fit}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-6">
                       <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">短期目标 (1-3m)</h4>
                        <ul className="space-y-2">
                          {growthPlan.shortTerm.map((goal, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <i className="fas fa-check-circle text-indigo-500"></i> {goal}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 pl-1">避坑与行动指南</h4>
                        <div className="text-xs text-slate-600 leading-relaxed bg-indigo-50 p-4 rounded-xl border border-indigo-100 italic">
                          {growthPlan.actionGuide}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-slate-100">
                    <div className="flex justify-between items-end mb-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">已同步行动任务</h4>
                      <button 
                        onClick={() => setCurrentView('TASKS')}
                        className="text-[10px] font-bold text-indigo-600 hover:underline"
                      >
                        去打卡任务 <i className="fas fa-arrow-right ml-1"></i>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {growthPlan.suggestedTasks.map((t, i) => (
                        <div key={i} className="bg-slate-900 p-5 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-30 transition-opacity">
                             <i className={`fas fa-${t.frequency === 'DAILY' ? 'calendar-day' : t.frequency === 'WEEKLY' ? 'calendar-week' : 'flag'} text-3xl`}></i>
                           </div>
                           <p className="text-xs font-bold mb-3 text-indigo-300 tracking-widest">{t.frequency}</p>
                           <p className="text-sm font-black leading-tight pr-4">{t.title}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <CapabilityTree entries={library} />
            
            <WeeklyRetrospective 
               summary={weeklySummary} 
               isLoading={isProcessing} 
               onRefresh={handleRefreshWeeklySummary} 
            />
          </div>
        )}

        {currentView === 'TASKS' && (
          <div className="animate-in">
            <TaskTracker 
              tasks={tasks} 
              onToggleTask={handleToggleTask} 
              onCheckIn={handleCheckIn}
              isCheckingIn={isProcessing}
              feedback={feedback}
            />
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-100 md:hidden z-50 px-6 py-4 flex justify-between items-center">
        {(['LIBRARY', 'COMPANION', 'EXPLORE', 'TASKS'] as View[]).map(v => (
          <button
            key={v}
            onClick={() => setCurrentView(v)}
            className={`flex flex-col items-center gap-1 transition-all ${
              currentView === v ? 'text-indigo-600 scale-110' : 'text-slate-400'
            }`}
          >
            <i className={`fas fa-${
              v === 'LIBRARY' ? 'book-open' : 
              v === 'COMPANION' ? 'user-circle' : 
              v === 'EXPLORE' ? 'map' : 'check-double'
            } text-lg`}></i>
            <span className="text-[10px] font-bold">
              {v === 'LIBRARY' && '记录'}
              {v === 'COMPANION' && '分身'}
              {v === 'EXPLORE' && '地图'}
              {v === 'TASKS' && '行动'}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
