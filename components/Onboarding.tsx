
import React, { useState } from 'react';
import { OnboardingData } from '../types';
import { speechService } from '../services/speechService';

interface OnboardingProps {
  onComplete: (data: OnboardingData) => void;
  isProcessing: boolean;
}

const STEPS = [
  { 
    id: 'gender', 
    title: '你是谁？', 
    question: '在开始前，请告诉我你的性别。这将帮助我为你选择最舒适的声线。',
    isChoice: true
  },
  { 
    id: 'basicInfo', 
    title: '初次见面', 
    question: '我想更了解你。能告诉我你现在的年龄、居住城市，以及目前的工作状态吗？',
    placeholder: '例：26岁，上海，互联网设计师...'
  },
  { 
    id: 'satisfactions', 
    title: '高光时刻', 
    question: '最近有哪些事让你感到自豪或满足？请列出目前你最满意的3件事。',
    placeholder: '这些将成为我记录你的起点...'
  },
  { 
    id: 'anxieties', 
    title: '真实压力', 
    question: '每个人都有疲惫的时候。目前让你感到最焦虑或困扰的3件事是什么？',
    placeholder: '放心，只有我知道这些脆弱...'
  },
  { 
    id: 'vision2026', 
    title: '未来回响', 
    question: '想象一下2026年的某个午后。那时候你成为了什么样的人？处在什么样的状态？',
    placeholder: '描述那个理想中的你...'
  },
  { 
    id: 'antiLife', 
    title: '生存底线', 
    question: '为了不再重蹈覆辙，哪一种生活是你发誓最不想再经历的？',
    placeholder: '那些让你想要逃离的瞬间...'
  }
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete, isProcessing }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    gender: 'FEMALE',
    basicInfo: '',
    satisfactions: '',
    anxieties: '',
    vision2026: '',
    antiLife: ''
  });
  const [isListening, setIsListening] = useState(false);

  const step = STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete(data);
    }
  };

  const updateValue = (val: any) => {
    setData(prev => ({ ...prev, [step.id]: val }));
  };

  const toggleListening = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      speechService.start({
        onResult: (result) => {
          const currentText = (data as any)[step.id] || '';
          const newText = result.isFinal ? (currentText + result.transcript) : (currentText.split(' ').slice(0, -1).join(' ') + ' ' + result.transcript).trim();
          updateValue(newText);
        },
        onEnd: () => setIsListening(false),
        onError: (err) => {
          console.error(err);
          setIsListening(false);
        }
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-50 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-amber-50 rounded-full blur-[100px]"></div>
      </div>

      <div className="max-w-xl w-full relative z-10">
        <div className="mb-12">
          <div className="flex gap-2 mb-8">
            {STEPS.map((_, i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                  i <= currentStep ? 'bg-indigo-600' : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
          <p className="text-indigo-600 font-black text-xs uppercase tracking-widest mb-4">Step {currentStep + 1} / {STEPS.length}</p>
          <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">{step.title}</h2>
          <p className="text-slate-500 text-lg leading-relaxed">{step.question}</p>
        </div>

        <div className="relative group">
          {step.id === 'gender' ? (
            <div className="flex gap-4">
              {([['MALE', '男性'], ['FEMALE', '女性'], ['NON_BINARY', '多元']] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => updateValue(val)}
                  className={`flex-1 py-6 rounded-3xl font-bold transition-all border-2 ${
                    data.gender === val 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-105' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-indigo-200'
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {val === 'MALE' && <i className="fas fa-mars"></i>}
                    {val === 'FEMALE' && <i className="fas fa-venus"></i>}
                    {val === 'NON_BINARY' && <i className="fas fa-transgender"></i>}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <>
              <textarea
                value={(data as any)[step.id]}
                onChange={(e) => updateValue(e.target.value)}
                placeholder={isListening ? "正在倾听..." : step.placeholder}
                className="w-full h-48 p-6 bg-slate-50 border-none ring-1 ring-slate-200 rounded-[2rem] text-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                autoFocus
              />
              <button 
                onClick={toggleListening}
                className={`absolute right-4 bottom-4 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                  isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-indigo-600 shadow-md border border-slate-100'
                }`}
              >
                <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
              </button>
            </>
          )}
        </div>

        <div className="mt-12 flex justify-between items-center">
          <button 
            onClick={() => currentStep > 0 && setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 0 || isProcessing}
            className={`text-slate-400 font-bold hover:text-slate-600 transition-colors ${currentStep === 0 ? 'opacity-0' : ''}`}
          >
            上一步
          </button>
          <button 
            onClick={handleNext}
            disabled={isProcessing || (step.id !== 'gender' && !(data as any)[step.id].trim())}
            className="px-10 py-4 bg-indigo-600 text-white rounded-full font-black shadow-xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
          >
            {isProcessing ? <i className="fas fa-spinner fa-spin"></i> : (currentStep === STEPS.length - 1 ? '捏合分身' : '继续')}
          </button>
        </div>
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[110] flex flex-col items-center justify-center text-center p-6">
          <div className="w-24 h-24 relative mb-8">
            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-4">正在深度对齐数据库...</h3>
          <p className="text-slate-500 max-w-xs mx-auto">正在将你的过往经历结构化，并识别潜在的人格短板与成长路径。</p>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
