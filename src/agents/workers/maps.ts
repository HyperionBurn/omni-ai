import { GoogleGenAI } from "@google/genai";

export async function runMapsWorker(query: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find information on Google Maps for: ${query}`,
      config: {
        tools: [{ googleMaps: {} }],
        systemInstruction: "You are a Maps Worker. Use the googleMaps tool to find location information. Provide a helpful summary of the places found, including addresses and ratings if available."
      }
    });
    
    let result = response.text || "No location found.";
    
    // Extract map links
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks && chunks.length > 0) {
      const urls: string[] = [];
      chunks.forEach(chunk => {
        // @ts-ignore - The types might not perfectly reflect the maps grounding structure yet
        if (chunk.maps?.uri) urls.push(chunk.maps.uri);
      });
      
      if (urls.length > 0) {
        result += "\n\nMap Links:\n" + urls.map(url => `- ${url}`).join("\n");
      }
    }
    
    return result;
  } catch (error) {
    console.error("Maps Worker Error:", error);
    return `Maps Worker failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
