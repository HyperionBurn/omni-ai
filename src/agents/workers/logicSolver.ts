import { GoogleGenAI } from "@google/genai";

export async function runLogicSolverWorker(problem: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // 3 different contexts/personas for varied-context collaborative agents
  const contexts = [
    "You are an analytical mathematician. Break down the problem into formal logical steps and solve it rigorously.",
    "You are a lateral thinker. Look for edge cases, hidden assumptions, and alternative interpretations of the problem before solving.",
    "You are a practical engineer. Focus on real-world constraints and straightforward, step-by-step deduction."
  ];

  const promises = contexts.map(ctx => 
    ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: problem,
      config: { systemInstruction: ctx }
    }).then(res => res.text)
  );

  const solutions = await Promise.all(promises);

  // Voter/Summarizer Agent
  const voterPrompt = `You are a consensus-building agent. You have been given a logic problem and 3 different solutions from 3 different expert agents with varied contexts.
Problem: ${problem}

Expert 1 (Analytical):
${solutions[0]}

Expert 2 (Lateral):
${solutions[1]}

Expert 3 (Practical):
${solutions[2]}

Analyze the 3 solutions, identify the correct reasoning, point out any flaws in the incorrect ones, and provide the final, definitive answer.`;

  const finalResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: voterPrompt
  });

  return `### Collaborative Agent Analysis\n\n**Expert 1 (Analytical):**\n${solutions[0]}\n\n**Expert 2 (Lateral):**\n${solutions[1]}\n\n**Expert 3 (Practical):**\n${solutions[2]}\n\n### Final Consensus\n${finalResponse.text || "Failed to reach consensus."}`;
}
