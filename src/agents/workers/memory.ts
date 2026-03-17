import { db } from "../../firebase";
import { collection, addDoc, getDocs, query, where, serverTimestamp, doc, updateDoc, getDoc } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

// Helper to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: [text],
    });
    return result.embeddings?.[0]?.values || [];
  } catch (error) {
    console.error("Error generating embedding:", error);
    return [];
  }
}

export async function runSaveMemoryWorker(content: string, tags: string[], userId: string, linkedMemoryIds: string[] = []): Promise<string> {
  try {
    const embedding = await generateEmbedding(content);
    
    const memoryData = {
      userId,
      content,
      tags,
      embedding,
      linkedMemories: linkedMemoryIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, "memories"), memoryData);
    
    // Update linked memories to point back to this one (bidirectional links for Zettelkasten)
    for (const linkedId of linkedMemoryIds) {
      try {
        const linkedDocRef = doc(db, "memories", linkedId);
        const linkedDoc = await getDoc(linkedDocRef);
        if (linkedDoc.exists()) {
          const existingLinks = linkedDoc.data().linkedMemories || [];
          if (!existingLinks.includes(docRef.id)) {
            await updateDoc(linkedDocRef, {
              linkedMemories: [...existingLinks, docRef.id],
              updatedAt: serverTimestamp()
            });
          }
        }
      } catch (e) {
        console.warn(`Failed to update linked memory ${linkedId}:`, e);
      }
    }

    return `Memory saved successfully with ID: ${docRef.id}`;
  } catch (error: any) {
    return `Failed to save memory: ${error.message}`;
  }
}

export async function runSearchMemoryWorker(queryText: string, userId: string, tags?: string[]): Promise<string> {
  try {
    // 1. Semantic Search (DeepRAG)
    const queryEmbedding = await generateEmbedding(queryText);
    
    // 2. Structured Search (Tags)
    let memoriesQuery = query(collection(db, "memories"), where("userId", "==", userId));
    let querySnapshot;
    
    if (tags && tags.length > 0) {
      // If tags are provided, do a structured filter first
      const q = query(memoriesQuery, where("tags", "array-contains-any", tags));
      querySnapshot = await getDocs(q);
    } else {
      querySnapshot = await getDocs(memoriesQuery);
    }

    const memories: any[] = [];
    querySnapshot.forEach((doc) => {
      memories.push({ id: doc.id, ...doc.data() });
    });

    if (memories.length === 0) {
      return "No relevant memories found.";
    }

    // 3. Score and Rank Memories (Simulating ACAN retrieval scoring)
    const scoredMemories = memories.map(memory => {
      let score = 0;
      if (queryEmbedding.length > 0 && memory.embedding && memory.embedding.length > 0) {
        score = cosineSimilarity(queryEmbedding, memory.embedding);
      }
      return { ...memory, score };
    });

    // Sort by score descending
    scoredMemories.sort((a, b) => b.score - a.score);

    // Take top 5 most relevant memories
    const topMemories = scoredMemories.slice(0, 5);

    if (topMemories.length === 0 || topMemories[0].score < 0.5) {
       return "No highly relevant memories found for this query.";
    }

    let result = "Found the following relevant memories:\n\n";
    topMemories.forEach((m, index) => {
      result += `${index + 1}. [ID: ${m.id}] (Relevance: ${(m.score * 100).toFixed(1)}%)\n`;
      result += `   Content: ${m.content}\n`;
      result += `   Tags: ${m.tags?.join(", ") || "none"}\n`;
      if (m.linkedMemories && m.linkedMemories.length > 0) {
        result += `   Linked to: ${m.linkedMemories.join(", ")}\n`;
      }
      result += "\n";
    });

    return result;
  } catch (error: any) {
    return `Failed to search memories: ${error.message}`;
  }
}
