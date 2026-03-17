import { GoogleGenAI } from "@google/genai";

export async function runSearchWorker(query: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Perform a web search to answer the following query: ${query}`,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: "You are a Search Worker. Use the googleSearch tool to find the most accurate and up-to-date information. Summarize the findings clearly and concisely."
      }
    });
    
    // Extract grounding chunks (URLs) if available
    let result = response.text || "No results found.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks && chunks.length > 0) {
      const urls = chunks
        .map(chunk => chunk.web?.uri)
        .filter((uri): uri is string => !!uri);
        
      if (urls.length > 0) {
        result += "\n\nSources:\n" + urls.map(url => `- ${url}`).join("\n");
      }
    }
    
    return result;
  } catch (error) {
    console.error("Search Worker Error:", error);
    return `Search Worker failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
