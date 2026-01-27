
import React from 'react';

interface CompanionAvatarProps {
  mood: string;
  affinity: number;
  speech: string;
  avatarUrl?: string;
  isTyping?: boolean;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  onRefreshAvatar?: () => void;
  isGeneratingAvatar?: boolean;
}

const CompanionAvatar: React.FC<CompanionAvatarProps> = ({ 
  mood, 
  affinity, 
  speech, 
  avatarUrl, 
  isTyping, 
  onSpeak, 
  isSpeaking, 
  onRefreshAvatar, 
  isGeneratingAvatar 
}) => {
  return (
    <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="relative group">
        <div className="w-48 h-48 md:w-56 md:h-56 bg-gradient-to-tr from-indigo-100 to-purple-100 rounded-[3rem] flex items-center justify-center shadow-2xl ring-8 ring-white relative overflow-hidden transition-transform duration-500 hover:scale-105">
          {isGeneratingAvatar ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-[10px] font-bold text-indigo-600 animate-pulse">正在唤醒形象...</p>
            </div>
          ) : avatarUrl ? (
            <img 
              src={avatarUrl} 
              alt="Virtual Self" 
              className="w-full h-full object-cover transform scale-110"
            />
          ) : (
            <div className="flex flex-col items-center gap-4 p-8 text-center">
              <div className="text-6xl text-indigo-200 mb-2">
                <i className="fas fa-user-astronaut"></i>
              </div>
              <button 
                onClick={onRefreshAvatar}
                className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                唤醒我的形象
              </button>
            </div>
          )}
          
          <div className={`absolute inset-0 pointer-events-none opacity-20 mix-blend-soft-light transition-colors ${
            mood.toLowerCase().includes('thinking') ? 'bg-blue-500' : 
            mood.toLowerCase().includes('encouraging') ? 'bg-yellow-400' : 'bg-transparent'
          }`}></div>
        </div>

        {avatarUrl && !isGeneratingAvatar && (
          <button 
            onClick={onRefreshAvatar}
            className="absolute top-2 right-2 w-8 h-8 bg-white/80 backdrop-blur-md rounded-full shadow-md text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="重新生成形象"
          >
            <i className="fas fa-redo-alt text-[10px]"></i>
          </button>
        )}

        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-lg border border-slate-100 flex items-center gap-2 z-10 whitespace-nowrap">
          <div className="flex items-center gap-1">
            <i className="fas fa-heart text-pink-500 text-[10px] animate-pulse"></i>
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">Bond</span>
          </div>
          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000" 
              style={{ width: `${affinity}%` }}
            ></div>
          </div>
          <span className="text-[10px] font-bold text-indigo-600">{affinity}%</span>
        </div>
      </div>
      
      {speech && (
        <div className="mt-10 relative max-w-sm mx-auto px-4 w-full">
          <div className="bg-white/90 backdrop-blur-sm p-5 rounded-[2rem] rounded-tl-none shadow-xl border border-slate-100 text-slate-700 text-sm italic leading-relaxed relative group/speech">
            {isTyping ? (
              <div className="flex gap-1.5 py-2 justify-center">
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce delay-200"></div>
              </div>
            ) : (
              <div className="relative">
                <p>
                  <span className="absolute -left-3 -top-1 text-2xl text-indigo-100 pointer-events-none">“</span>
                  {speech}
                  <span className="absolute -bottom-4 -right-1 text-2xl text-indigo-100 pointer-events-none">”</span>
                </p>
                <div className="absolute -right-2 -top-2 flex gap-1">
                   <button 
                    onClick={onSpeak}
                    disabled={isSpeaking}
                    className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center opacity-0 group-hover/speech:opacity-100 transition-opacity hover:bg-indigo-100 active:scale-95 disabled:opacity-50"
                  >
                    {isSpeaking ? (
                      <div className="flex gap-0.5 items-end h-3">
                        <div className="w-0.5 bg-indigo-600 animate-pulse h-full"></div>
                        <div className="w-0.5 bg-indigo-600 animate-pulse h-2/3"></div>
                        <div className="w-0.5 bg-indigo-600 animate-pulse h-full"></div>
                      </div>
                    ) : (
                      <i className="fas fa-volume-up text-xs"></i>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="absolute -top-2 left-4 w-5 h-5 bg-white/90 border-l border-t border-slate-100 -rotate-45"></div>
        </div>
      )}
    </div>
  );
};

export default CompanionAvatar;
