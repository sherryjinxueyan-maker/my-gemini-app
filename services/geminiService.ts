
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExperienceEntry, VirtualSelfProfile, ExperienceCategory, GrowthPlan, ActionTask, WeeklySummary, OnboardingData } from "../types";

const COMPANION_PERSONA = `你是一个充满温情、洞察力极强的“虚拟自我”分身。
你的身份：用户的好友、好哥们/好闺蜜。
你的语气：20-30岁，自然、快节奏、口语化。多用“哈”、“嗯”、“对啦”等词。
核心原则：严禁虚构！必须100%忠实于用户提供的原始文字。`;

const MAX_RETRIES = 4;
const INITIAL_BACKOFF = 2000;

async function callWithRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  let lastError: any;
  for (let i = 0; i < MAX_RETRIES; i++) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      return await fn(ai);
    } catch (error: any) {
      lastError = error;
      const status = error?.status || error?.error?.code || (error?.message?.includes('429') ? 429 : 0);
      const message = error?.message || "";

      if (message.includes("Requested entity was not found") && (window as any).aistudio?.openSelectKey) {
        await (window as any).aistudio.openSelectKey();
        continue;
      }

      if (status === 429 || message.includes("RESOURCE_EXHAUSTED") || message.includes("quota")) {
        const delay = INITIAL_BACKOFF * Math.pow(2, i);
        console.warn(`Quota or rate limit exceeded. Retrying in ${delay}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      if (i === MAX_RETRIES - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

export const initializeProfileFromOnboarding = async (data: OnboardingData): Promise<{ profile: VirtualSelfProfile, entries: ExperienceEntry[] }> => {
  const input = `
    性别：${data.gender}
    基本情况：${data.basicInfo}
    满意的事：${data.satisfactions}
    焦虑的事：${data.anxieties}
    愿景：${data.vision2026}
  `;

  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${COMPANION_PERSONA}
      任务：基于用户输入创建档案。
      **限制条件（必须遵守）：**
      1. 经历记录（entries）：必须【逐字提取】用户填写的满意和焦虑的事。禁止美化，禁止发明用户没说过的话。
      2. 性别一致性：用户选择的是 ${data.gender}，形象描述(ootd)必须严格符合该性别的特征。
      3. 性格：分析用户的脆弱点，给出【真心话】级别的建议，而不是空洞的鼓励。`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            profile: {
              type: Type.OBJECT,
              properties: {
                coreValues: { type: Type.ARRAY, items: { type: Type.STRING } },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                shortcomings: { type: Type.ARRAY, items: { type: Type.STRING } },
                growthSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                joyTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
                interestDirections: { type: Type.ARRAY, items: { type: Type.STRING } },
                summary: { type: Type.STRING },
                mood: { type: Type.STRING },
                affinity: { type: Type.NUMBER },
                ootd: { type: Type.STRING }
              },
              required: ["coreValues", "strengths", "shortcomings", "growthSuggestions", "joyTriggers", "interestDirections", "summary", "mood", "affinity", "ootd"]
            },
            entries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  content: { type: Type.STRING },
                  category: { type: Type.STRING },
                  tags: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["content", "category", "tags"]
              }
            }
          },
          required: ["profile", "entries"]
        }
      }
    });
    
    const result = JSON.parse(response.text);
    return {
      profile: { ...result.profile, gender: data.gender, initialized: false },
      entries: result.entries.map((e: any) => ({
        ...e,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now()
      }))
    };
  });
};

export const generateAvatarFromOOTD = async (ootdDescription: string, gender: 'MALE' | 'FEMALE' | 'NON_BINARY'): Promise<string> => {
  const genderPrompt = gender === 'FEMALE' ? 'A stylish and beautiful young woman, clearly female features' : (gender === 'MALE' ? 'A handsome and cool young man, clearly male features' : 'A fashionable person');
  
  const prompt = `Professional 2D character portrait of ${genderPrompt}, age 25. 
  Style: modern high-quality anime, soft cinematic lighting. 
  Outfit: ${ootdDescription}. 
  Important: The character MUST be ${gender === 'FEMALE' ? 'FEMALE' : (gender === 'MALE' ? 'MALE' : 'androgynous')}. 
  Friendly smile, eye contact, simple clean background.`;

  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image found");
  });
};

export const generateSpeech = async (text: string, gender: 'MALE' | 'FEMALE' | 'NON_BINARY'): Promise<string> => {
  const voiceName = gender === 'MALE' ? 'Puck' : 'Zephyr';
  // Adding instructions within the text for better prosody control
  const fastText = `(语速快一点，语气轻快，像朋友聊天：)${text}`;
  
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: fastText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

export const updateProfile = async (library: ExperienceEntry[], currentGender: 'MALE' | 'FEMALE' | 'NON_BINARY'): Promise<VirtualSelfProfile> => {
  const librarySummary = library.map(e => `[${e.category}] ${e.content}`).join('\n');
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${COMPANION_PERSONA}
      基于最新经历更新档案。
      性别维持：${currentGender}。
      重点：深挖用户的潜意识焦虑，给出直白、不啰嗦的决策建议。
      
      经历库：
      ${librarySummary}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            coreValues: { type: Type.ARRAY, items: { type: Type.STRING } },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            shortcomings: { type: Type.ARRAY, items: { type: Type.STRING } },
            growthSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            joyTriggers: { type: Type.ARRAY, items: { type: Type.STRING } },
            interestDirections: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            mood: { type: Type.STRING },
            affinity: { type: Type.NUMBER },
            ootd: { type: Type.STRING }
          },
          required: ["coreValues", "strengths", "shortcomings", "growthSuggestions", "joyTriggers", "interestDirections", "summary", "mood", "affinity", "ootd"]
        }
      }
    });
    return { ...JSON.parse(response.text), gender: currentGender, initialized: true };
  });
};

export const getCompanionSpeech = async (context: string, profile: VirtualSelfProfile): Promise<string> => {
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `${COMPANION_PERSONA}
      语境：${context}
      档案：${profile.summary}
      说一两句极短的口语，像微信发语音那样，甚至可以带点调侃。`
    });
    return response.text;
  });
};

export const processRawInput = async (input: string): Promise<Partial<ExperienceEntry>[]> => {
    return await callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `梳理个人经历： "${input}"。
        严禁修饰，保留原始动词和名词。
        返回 JSON 数组。`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                category: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["content", "category", "tags"]
            }
          }
        }
      });
      return JSON.parse(response.text);
    });
  };

export const generateGrowthPlan = async (profile: VirtualSelfProfile, library: ExperienceEntry[]): Promise<GrowthPlan> => {
    const context = `核心价值: ${profile.coreValues.join(', ')}; 才华: ${profile.strengths.join(', ')}; 兴趣: ${profile.interestDirections.join(', ')}`;
    return await callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: `${COMPANION_PERSONA}
        基于八木仁平逻辑制定计划。
        背景：${context}
        经历：${library.slice(0, 10).map(e => e.content).join('; ')}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coreValuesAnalysis: { type: Type.STRING },
              directions: { 
                type: Type.ARRAY, 
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    fit: { type: Type.STRING }
                  }
                } 
              },
              shortTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
              midTerm: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionGuide: { type: Type.STRING },
              suggestedTasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    frequency: { type: Type.STRING, enum: ["DAILY", "WEEKLY", "ONCE"] }
                  },
                  required: ["title", "frequency"]
                }
              }
            },
            required: ["coreValuesAnalysis", "directions", "shortTerm", "midTerm", "actionGuide", "suggestedTasks"]
          }
        }
      });
      return JSON.parse(response.text);
    });
  };

  export const getCheckInFeedback = async (tasks: ActionTask[], profile: VirtualSelfProfile): Promise<string> => {
    const completed = tasks.filter(t => t.completedDates.length > 0).map(t => t.title).join(', ');
    return await callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${COMPANION_PERSONA}
        反馈任务：${completed || '暂无'}。
        用好朋友的语气吐槽或夸奖一下。`
      });
      return response.text;
    });
  };

  export const generateWeeklySummary = async (library: ExperienceEntry[]): Promise<WeeklySummary> => {
    const context = library.slice(0, 20).map(e => `[${e.category}] ${e.content}`).join('\n');
    return await callWithRetry(async (ai) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `${COMPANION_PERSONA} 生成周回顾。\n记录：\n${context}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              period: { type: Type.STRING },
              summary: { type: Type.STRING },
              valueShifts: { type: Type.STRING },
              topInsights: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["period", "summary", "valueShifts", "topInsights"]
          }
        }
      });
      return {
        ...JSON.parse(response.text),
        generatedAt: Date.now()
      };
    });
  };
