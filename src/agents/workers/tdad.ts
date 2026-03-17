import { GoogleGenAI } from "@google/genai";

export async function runTDADWorker(task: string): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // 1. Test Engineer writes tests
  const testEngineerPrompt = `You are a strict Test Engineer. The user wants to accomplish the following task:
"${task}"
Write a set of strict validation criteria and test cases that the final output MUST pass. Do not write the solution, only the tests/criteria.`;

  const testResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: testEngineerPrompt
  });
  const tests = testResponse.text;

  // 2. Execution Agent writes code/solution
  const executionPrompt = `You are an Execution Agent. Your task is:
"${task}"

You MUST ensure your output passes the following strict tests and criteria defined by the Test Engineer:
${tests}

Provide the final solution/code.`;

  const executionResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: executionPrompt
  });
  const solution = executionResponse.text;

  // 3. Validation Agent checks it
  const validationPrompt = `You are a QA Validation Agent.
Task: "${task}"
Tests/Criteria:
${tests}

Proposed Solution:
${solution}

Does the proposed solution pass ALL the tests and criteria? If yes, reply with "PASS" and a brief confirmation. If no, reply with "FAIL" and explain exactly what failed.`;

  const validationResponse = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: validationPrompt
  });
  const validation = validationResponse.text;

  return `### TDAD Process Report\n\n**1. Tests Defined (Test Engineer):**\n${tests}\n\n**2. Proposed Solution (Execution Agent):**\n${solution}\n\n**3. Validation Result (QA Agent):**\n${validation}`;
}
