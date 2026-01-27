
import React, { useState, useEffect } from 'react';
import { GuidedQuestion } from '../types';
import { INITIAL_QUESTIONS } from '../constants';
import { speechService } from '../services/speechService';

interface GuidedQAProps {
  onAnswer: (answer: string, category: string) => void;
}

const GuidedQA: React.FC<GuidedQAProps> = ({ onAnswer }) => {
  const [currentQuestion, setCurrentQuestion] = useState<GuidedQuestion | null>(null);
  const [answer, setAnswer] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const randomQ = INITIAL_QUESTIONS[Math.floor(Math.random() * INITIAL_QUESTIONS.length)];
    setCurrentQuestion(randomQ);
  }, []);

  const handleSubmit = () => {
    if (!answer.trim() || !currentQuestion) return;
    onAnswer(answer, currentQuestion.category);
    setAnswer('');
    setIsAnswering(false);
    const randomQ = INITIAL_QUESTIONS[Math.floor(Math.random() * INITIAL_QUESTIONS.length)];
    setCurrentQuestion(randomQ);
  };

  const toggleListening = () => {
    if (isListening) {
      speechService.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      speechService.start({
        onResult: (result) => {
          setAnswer(prev => result.isFinal ? (prev + result.transcript) : (prev.split(' ').slice(0, -1).join(' ') + ' ' + result.transcript).trim());
        },
        onEnd: () => setIsListening(false),
        onError: (err) => {
          console.error(err);
          setIsListening(false);
        }
      });
    }
  };

  if (!currentQuestion) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 mb-8 relative overflow-hidden">
      <div className="absolute -right-4 -top-4 opacity-5 pointer-events-none text-8xl text-indigo-900">
        <i className="fas fa-quote-right"></i>
      </div>
      
      {!isAnswering ? (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex-1">
            <h3 className="text-indigo-900 font-semibold mb-1 flex items-center gap-2">
              <i className="fas fa-sparkles text-indigo-500"></i>
              自我探索引导
            </h3>
            <p className="text-indigo-800/80 italic">"{currentQuestion.question}"</p>
          </div>
          <button 
            onClick={() => setIsAnswering(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-colors shadow-sm text-sm font-medium shrink-0"
          >
            开始回答
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-indigo-900 font-medium">Q: {currentQuestion.question}</p>
            <button 
              onClick={toggleListening}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              }`}
              title={isListening ? "停止录音" : "语音输入"}
            >
              <i className={`fas ${isListening ? 'fa-stop' : 'fa-microphone'}`}></i>
            </button>
          </div>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={isListening ? "正在聆听并转录..." : "随心写下你的感受、情景和原因..."}
            className="w-full h-32 p-4 rounded-xl border-none ring-1 ring-indigo-200 focus:ring-2 focus:ring-indigo-500 bg-white/80 transition-shadow outline-none text-sm"
          />
          <div className="flex justify-end gap-3">
            <button 
              onClick={() => {
                speechService.stop();
                setIsAnswering(false);
              }}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-100 rounded-lg text-sm"
            >
              以后再说
            </button>
            <button 
              onClick={handleSubmit}
              disabled={!answer.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-md text-sm font-medium"
            >
              沉淀经历
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GuidedQA;
