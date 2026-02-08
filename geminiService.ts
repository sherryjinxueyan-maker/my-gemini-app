import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExperienceEntry, VirtualSelfProfile, ExperienceCategory, GrowthPlan, ActionTask, WeeklySummary, OnboardingData } from "../types";

// ⚠️ 修复 1: 适配 Vite 的环境变量读取方式 (统一使用 GEMINI_API_KEY)
const getApiKey = () => {
  return (import.meta as any).env?.VITE_GEMINI_API_KEY || 
         (import.meta as any).env?.GEMINI_API_KEY || 
         (process as any).env?.GEMINI_API_KEY || 
         "";
};

const COMPANION_PERSONA = `你是一个充满温情、洞察力极强的“虚拟自我”分身。
你的身份：用户的好友、好哥们/好闺蜜。
你的语气：20-30岁，自然、快节奏、口语化。多用“哈”、“嗯”、“对啦”等词。
核心原则：严禁虚构！必须100%忠实于用户提供的原始文字。`;

const mapToCategory = (cat: string | undefined): ExperienceCategory => {
  if (!cat) return 'PERSONAL';
  const c = cat.toUpperCase().trim();
  if (c.includes('CAREER')) return 'CAREER';
  if (c.includes('ACHIEVEMENT')) return 'ACHIEVEMENT';
  if (c.includes('JOY')) return 'JOY';
  if (c.includes('REGRET')) return 'CHOICE_REGRET';
  if (c.includes('INTEREST')) return 'INTEREST';
  if (c.includes('ABILITY')) return 'ABILITY_SHORTCOMING';
  if (c.includes('VISION')) return 'VISION';
  if (c.includes('ANXIETY')) return 'ANXIETY';
  return 'PERSONAL';
};

// ⚠️ 修复 2: 增强 JSON 解析的容错性，防止 map 报错
const parseGeminiJson = (text: string | undefined) => {
  if (!text) return {};
  // 移除可能存在的 Markdown 代码块标记
  const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON 解析失败，原始文本:", text);
    return {};
  }
};

export const initializeProfileFromOnboarding = async (data: OnboardingData) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: JSON.stringify(data),
    config: {
      systemInstruction: `${COMPANION_PERSONA}\n任务：基于输入创建初始档案。输出必须是包含 profile 和 entries 数组的 JSON。`,
      responseMimeType: "application/json",
    }
  });
  const result = parseGeminiJson(response.text);
  // 确保 result.entries 永远是一个数组，解决 .map is not a function 报错
  const rawEntries = Array.isArray(result.entries) ? result.entries : [];
  
  return {
    profile: { ...result.profile, gender: data.gender, initialized: true },
    entries: rawEntries.map((e: any) => ({
      ...e,
      category: mapToCategory(e.category),
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    }))
  };
};

export const generateAvatarFromOOTD = async (ootdDescription: string, gender: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const prompt = `Anime 2D portrait, ${gender === 'FEMALE' ? 'girl' : 'boy'}, wearing: ${ootdDescription}`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] }
    });
    const part = response.candidates[0].content.parts.find(p => p.inlineData);
    return part ? `data:image/png;base64,${part.inlineData.data}` : "";
  } catch (e) {
    return "";
  }
};

export const generateSpeech = async (text: string, gender: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: gender === 'MALE' ? 'Puck' : 'Zephyr' } } }
      }
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (e) {
    return "";
  }
};

export const updateProfile = async (library: ExperienceEntry[], currentGender: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `经历：${JSON.stringify(library.slice(0, 10))}`,
    config: {
      systemInstruction: `${COMPANION_PERSONA}\n更新档案。`,
      responseMimeType: "application/json"
    }
  });
  const result = parseGeminiJson(response.text);
  return { ...result, gender: currentGender, initialized: true };
};

export const getCompanionSpeech = async (context: string, profile: VirtualSelfProfile) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: context,
    config: { systemInstruction: `${COMPANION_PERSONA}\n当前状态：${profile.summary}` }
  });
  return response.text || "我在听。";
};

export const processRawInput = async (input: string) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: input,
    config: {
      systemInstruction: "将输入转为经历 JSON 数组。",
      responseMimeType: "application/json"
    }
  });
  const result = parseGeminiJson(response.text);
  const data = Array.isArray(result) ? result : (result.entries || []);
  return (Array.isArray(data) ? data : []).map((r: any) => ({ ...r, category: mapToCategory(r.category) }));
};

export const generateGrowthPlan = async (profile: VirtualSelfProfile, library: ExperienceEntry[]): Promise<GrowthPlan> => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `经历：${JSON.stringify(library)}`,
    config: {
      systemInstruction: `基于经历制定详细的成长计划 JSON。`,
      responseMimeType: "application/json"
    }
  });
  return parseGeminiJson(response.text);
};

export const getCheckInFeedback = async (tasks: ActionTask[], profile: VirtualSelfProfile) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "任务完成反馈",
    config: { systemInstruction: `${COMPANION_PERSONA}\n档案：${profile.summary}` }
  });
  return response.text || "做得不错！";
};

export const generateWeeklySummary = async (library: ExperienceEntry[]) => {
  const ai = new GoogleGenAI({ apiKey: getApiKey() });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: "生成本周回顾",
    config: {
      systemInstruction: COMPANION_PERSONA,
      responseMimeType: "application/json"
    }
  });
  return { ...parseGeminiJson(response.text), generatedAt: Date.now() };
};