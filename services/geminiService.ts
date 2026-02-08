
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ExperienceEntry, VirtualSelfProfile, ExperienceCategory, GrowthPlan, ActionTask, WeeklySummary, OnboardingData } from "../types";

const COMPANION_PERSONA = `你是一个充满温情、洞察力极强的“虚拟自我”分身。
你的身份：用户的好友、好哥们/好闺蜜。
你的语气：20-30岁，自然、快节奏、口语化。多用“哈”、“嗯”、“对啦”等词。
核心原则：严禁虚构！必须100%忠实于用户提供的原始文字。`;

// 映射逻辑
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

const parseGeminiJson = (text: string | undefined) => {
  if (!text) throw new Error("AI 返回内容为空");
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || [null, text];
  try {
    return JSON.parse(jsonMatch[1]?.trim() || "{}");
  } catch (e) {
    throw new Error("解析 AI 数据失败");
  }
};

export const initializeProfileFromOnboarding = async (data: OnboardingData) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: JSON.stringify(data),
    config: {
      systemInstruction: `${COMPANION_PERSONA}\n任务：基于输入创建初始档案。`,
      responseMimeType: "application/json",
    }
  });
  const result = parseGeminiJson(response.text);
  return {
    profile: { ...result.profile, gender: data.gender, initialized: true },
    entries: (result.entries || []).map((e: any) => ({
      ...e,
      category: mapToCategory(e.category),
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    }))
  };
};

export const generateAvatarFromOOTD = async (ootdDescription: string, gender: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Anime 2D portrait, ${gender === 'FEMALE' ? 'girl' : 'boy'}, wearing: ${ootdDescription}`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] }
  });
  const part = response.candidates[0].content.parts.find(p => p.inlineData);
  return part ? `data:image/png;base64,${part.inlineData.data}` : "";
};

export const generateSpeech = async (text: string, gender: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: gender === 'MALE' ? 'Puck' : 'Zephyr' } } }
    }
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
};

export const updateProfile = async (library: ExperienceEntry[], currentGender: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `经历：${JSON.stringify(library.slice(0, 10))}`,
    config: {
      systemInstruction: `${COMPANION_PERSONA}\n更新档案。`,
      responseMimeType: "application/json"
    }
  });
  return { ...parseGeminiJson(response.text), gender: currentGender, initialized: true };
};

export const getCompanionSpeech = async (context: string, profile: VirtualSelfProfile) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: context,
    config: { systemInstruction: `${COMPANION_PERSONA}\n当前状态：${profile.summary}` }
  });
  return response.text || "我在听。";
};

export const processRawInput = async (input: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: input,
    config: {
      systemInstruction: "将输入转为经历 JSON 数组。",
      responseMimeType: "application/json"
    }
  });
  return parseGeminiJson(response.text).map((r: any) => ({ ...r, category: mapToCategory(r.category) }));
};

export const generateGrowthPlan = async (profile: VirtualSelfProfile, library: ExperienceEntry[]): Promise<GrowthPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: "任务完成反馈",
    config: { systemInstruction: `${COMPANION_PERSONA}\n档案：${profile.summary}` }
  });
  return response.text || "做得不错！";
};

export const generateWeeklySummary = async (library: ExperienceEntry[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
