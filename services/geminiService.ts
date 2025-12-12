import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

try {
  if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
} catch (error) {
  console.error("Failed to initialize GoogleGenAI", error);
}

export const getGestureInsight = async (gestureName: string): Promise<string> => {
  if (!ai) {
    return "API Key not configured. Unable to fetch insights.";
  }

  try {
    const model = "gemini-2.5-flash";
    const prompt = `
      I am performing a hand gesture recognized as "${gestureName}". 
      Provide a fun, short (max 2 sentences) cultural or historical fact about this gesture 
      or a witty comment about using it. Keep it lighthearted.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "No insight available.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not retrieve gesture insight at this time.";
  }
};