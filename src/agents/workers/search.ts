import { GoogleGenAI } from "@google/genai";

export async function runSearchWorker(query: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Hypothesis-Driven Divide-and-Conquer Search
    // 1. Break the query into 2 distinct sub-queries for broader coverage
    const plannerResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Decompose this search query into 2 distinct, specific sub-queries to maximize information retrieval: "${query}". Return a JSON array of strings.`,
      config: { responseMimeType: "application/json" }
    });

    let subQueries: string[] = [];
    try {
      subQueries = JSON.parse(plannerResponse.text || "[]");
    } catch {
      subQueries = [query];
    }

    if (!subQueries || subQueries.length === 0) subQueries = [query];
    // Limit to max 3 queries to avoid rate limits
    if (subQueries.length > 3) subQueries = subQueries.slice(0, 3);

    // 2. Execute parallel searches
    const searchPromises = subQueries.map(async (sq) => {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Perform a web search to answer the following query: ${sq}`,
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: "You are a Search Worker. Use the googleSearch tool to find accurate and up-to-date information. Summarize the findings."
        }
      });
      return { query: sq, text: response.text, metadata: response.candidates?.[0]?.groundingMetadata };
    });

    const searchResults = await Promise.all(searchPromises);

    // 3. Merge findings
    const mergeResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Merge and synthesize the following parallel search results into a single cohesive, highly detailed answer for the original query: "${query}"\n\nResults:\n${JSON.stringify(searchResults.map(r => ({ query: r.query, text: r.text })))}`,
      config: {
        systemInstruction: "You are a Synthesis Agent. Combine the provided search results into a unified, clear, and comprehensive response. Remove redundancies."
      }
    });

    let finalResult = mergeResponse.text || "No cohesive results found.";
    
    // Collect all unique URLs from all chunks
    const allUrls = new Set<string>();
    searchResults.forEach(res => {
      const chunks = res.metadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        chunks.forEach(chunk => {
          if (chunk.web?.uri) allUrls.add(chunk.web.uri);
        });
      }
    });

    if (allUrls.size > 0) {
      finalResult += "\n\nSources:\n" + Array.from(allUrls).map(url => `- ${url}`).join("\n");
    }
    
    return finalResult;
  } catch (error) {
    console.error("Search Worker Error:", error);
    return `Search Worker failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}
