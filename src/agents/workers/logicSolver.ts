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

  // Multi-Agent Reinforcement Learning (MARL) for Social Metrics & Autocurricula via Self-Play
  // Simulate a debate and scoring mechanism where agents evaluate each other
  const debatePrompt = `You are a MARL Referee Agent.
Problem: ${problem}

Expert 1 (Analytical): ${solutions[0]}
Expert 2 (Lateral): ${solutions[1]}
Expert 3 (Practical): ${solutions[2]}

1. Evaluate each expert's solution on 'Cooperation' (how well it builds on accepted logic), 'Negotiation' (how well it addresses counter-arguments), and 'Accuracy'.
2. Provide a numerical score (0-100) for each expert.
3. Synthesize the final, definitive answer based on the highest-scoring arguments.`;

  const debateResponse = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: debatePrompt
  });

  return `### MARL Collaborative Analysis & Self-Play Debate\n\n**Expert 1 (Analytical):**\n${solutions[0]}\n\n**Expert 2 (Lateral):**\n${solutions[1]}\n\n**Expert 3 (Practical):**\n${solutions[2]}\n\n### MARL Referee Scoring & Consensus\n${debateResponse.text || "Failed to reach consensus."}`;
}
