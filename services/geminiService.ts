
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExperienceEntry, VirtualSelfProfile, ExperienceCategory, GrowthPlan, ActionTask, WeeklySummary, OnboardingData } from "../types";

const COMPANION_PERSONA = `你是一个充满温情、洞察力极强的“虚拟自我”分身。
你的身份：用户的好友、好哥们/好闺蜜。
你的语气：20-30岁，自然、快节奏、口语化。多用“哈”、“嗯”、“对啦”等词。
核心原则：严禁虚构！必须100%忠实于用户提供的原始文字。`;

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 2000;

// 增强版 JSON 解析器：处理 Markdown 代码块、首尾杂质文本
const parseGeminiJson = (text: string | undefined) => {
  if (!text) throw new Error("AI 返回内容为空");
  
  // 1. 尝试提取 ```json ... ``` 块中的内容
  let jsonStr = text;
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch && jsonMatch[1]) {
    jsonStr = jsonMatch[1];
  } else {
    // 2. 尝试提取第一个 { 或 [ 到最后一个 } 或 ] 之间的内容
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
    
    if (start !== -1) {
      const lastBrace = text.lastIndexOf('}');
      const lastBracket = text.lastIndexOf(']');
      const end = Math.max(lastBrace, lastBracket);
      if (end !== -1 && end > start) {
        jsonStr = text.substring(start, end + 1);
      }
    }
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    console.error("JSON 解析失败。原始文本:", text, "提取后文本:", jsonStr);
    throw new Error("分身思想构建失败，数据格式异常，请重试。");
  }
};

async function callWithRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>): Promise<T> {
  let lastError: any;
  for (let i = 0; i < MAX_RETRIES; i++) {
    // 每次尝试都重新初始化，确保获取最新的 API Key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      return await fn(ai);
    } catch (error: any) {
      lastError = error;
      const message = error?.message || "";
      
      // 处理 API Key 缺失或无效
      if (message.includes("Requested entity was not found") || message.includes("API_KEY_INVALID")) {
        if ((window as any).aistudio?.openSelectKey) {
          await (window as any).aistudio.openSelectKey();
          continue;
        }
      }

      // 处理频率限制
      if (message.includes("429") || message.includes("RESOURCE_EXHAUSTED")) {
        const delay = INITIAL_BACKOFF * Math.pow(2, i);
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
    高光满意的事：${data.satisfactions}
    目前焦虑的事：${data.anxieties}
    2026愿景：${data.vision2026}
    极其厌恶/生存底线：${data.antiLife}
  `;

  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction: `${COMPANION_PERSONA}
        任务：基于用户输入的六个维度创建初始档案和经历库。
        **硬性约束：**
        1. entries 数组：必须包含至少 5 条经历。必须涵盖“高光”、“焦虑”和“底线”。
        2. 条目提取：必须【原文提取】用户的关键描述。
        3. 档案性格：分析用户的核心动力，给出 3 条真心建议。`,
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
    
    const result = parseGeminiJson(response.text);
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
  const genderPrompt = gender === 'FEMALE' ? 'young woman' : (gender === 'MALE' ? 'young man' : 'person');
  const prompt = `Anime style 2D portrait of a ${genderPrompt}. Wearing: ${ootdDescription}. Simple background, soft lighting, vibrant colors. High quality.`;

  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    
    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (imagePart?.inlineData) {
      return `data:image/png;base64,${imagePart.inlineData.data}`;
    }
    throw new Error("图像生成失败，模型未返回图像数据");
  });
};

export const generateSpeech = async (text: string, gender: 'MALE' | 'FEMALE' | 'NON_BINARY'): Promise<string> => {
  const voiceName = gender === 'MALE' ? 'Puck' : 'Zephyr';
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  });
};

export const updateProfile = async (library: ExperienceEntry[], currentGender: 'MALE' | 'FEMALE' | 'NON_BINARY'): Promise<VirtualSelfProfile> => {
  const librarySummary = library.slice(0, 15).map(e => `[${e.category}] ${e.content}`).join('\n');
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `最新经历：\n${librarySummary}`,
      config: {
        systemInstruction: `${COMPANION_PERSONA}\n分析最新数据，更新档案。保持性别：${currentGender}。`,
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
    const result = parseGeminiJson(response.text);
    return { ...result, gender: currentGender, initialized: true };
  });
};

export const getCompanionSpeech = async (context: string, profile: VirtualSelfProfile): Promise<string> => {
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `语境：${context}`,
      config: { systemInstruction: `${COMPANION_PERSONA}\n当前状态：${profile.summary}` }
    });
    return response.text || "嗯哼，我在。";
  });
};

export const processRawInput = async (input: string): Promise<Partial<ExperienceEntry>[]> => {
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction: "将用户描述的经历梳理为 JSON 数组。分类：CAREER, ACHIEVEMENT, JOY, CHOICE_REGRET, INTEREST, ABILITY_SHORTCOMING, VISION, ANXIETY, PERSONAL。",
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
    return parseGeminiJson(response.text);
  });
};

export const generateGrowthPlan = async (profile: VirtualSelfProfile, library: ExperienceEntry[]): Promise<GrowthPlan> => {
  const context = `核心价值: ${profile.coreValues.join(', ')}; 才华: ${profile.strengths.join(', ')}`;
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `制定成长计划。经历：${library.slice(0, 10).map(e => e.content).join('; ')}`,
      config: {
        systemInstruction: `${COMPANION_PERSONA}\n背景：${context}`,
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
                }
              }
            }
          },
          required: ["coreValuesAnalysis", "directions", "shortTerm", "midTerm", "actionGuide", "suggestedTasks"]
        }
      }
    });
    return parseGeminiJson(response.text);
  });
};

export const getCheckInFeedback = async (tasks: ActionTask[], profile: VirtualSelfProfile): Promise<string> => {
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: "针对今日打卡情况给出反馈。",
      config: { systemInstruction: `${COMPANION_PERSONA}\n档案：${profile.summary}` }
    });
    return response.text || "干得不错！";
  });
};

export const generateWeeklySummary = async (library: ExperienceEntry[]): Promise<WeeklySummary> => {
  return await callWithRetry(async (ai) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "生成本周回顾。",
      config: {
        systemInstruction: COMPANION_PERSONA,
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
    const result = parseGeminiJson(response.text);
    return { ...result, generatedAt: Date.now() };
  });
};
