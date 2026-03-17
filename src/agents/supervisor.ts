import { GoogleGenAI, Content, Part, ThinkingLevel } from "@google/genai";
import { SUPERVISOR_PROMPT, PLANNER_PROMPT, VERIFIER_PROMPT, searchWebTool, searchMapsTool, generateImageTool, saveArtifactTool, readUrlTool, calculatorTool, getWeatherTool, getCurrentTimeTool, saveMemoryTool, searchMemoryTool, solveLogicProblemTool, executeTdadTaskTool, semanticDataTool, getBestStrategyTool, rewardStrategyTool } from "./config";
import { runSearchWorker } from "./workers/search";
import { runMapsWorker } from "./workers/maps";
import { runGenerateImageWorker } from "./workers/generateImage";
import { runReadUrlWorker } from "./workers/readUrl";
import { runCalculatorWorker } from "./workers/calculator";
import { runWeatherWorker } from "./workers/weather";
import { runTimeWorker } from "./workers/time";
import { runSaveMemoryWorker, runSearchMemoryWorker } from "./workers/memory";
import { runLogicSolverWorker } from "./workers/logicSolver";
import { runTDADWorker } from "./workers/tdad";
import { getBestStrategy, rewardStrategy } from "./workers/rlStrategy";
import { runSemanticDataWorker } from "./workers/semanticData";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export type AgentStep = {
  id: string;
  type: 'thought' | 'tool_call' | 'tool_result' | 'error';
  message: string;
  data?: any;
};

export async function runSupervisor(
  chatHistory: Content[],
  userMessage: string,
  images: { data: string, mimeType: string }[],
  userId: string,
  sessionId: string,
  onStep: (step: AgentStep) => void
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Build the new user message parts
  const newParts: Part[] = [{ text: userMessage }];
  for (const img of images) {
    newParts.push({
      inlineData: { data: img.data, mimeType: img.mimeType }
    });
  }
  
  const contents: Content[] = [...chatHistory, { role: "user", parts: newParts }];
  
  let isDone = false;
  let finalResponseText = "";

  // Dynamic Routing & Workflow Decomposition
  onStep({ id: Date.now().toString(), type: 'thought', message: 'Analyzing request and decomposing into formal step-by-step plan...' });

  try {
    // 1. Planner Agent: Explicit Step-by-Step decomposition
    const plannerResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: `Original request: ${userMessage}` }] }],
      config: {
        systemInstruction: PLANNER_PROMPT,
        responseMimeType: "application/json"
      }
    });

    let plan = [];
    try {
      const parsed = JSON.parse(plannerResponse.text || "{}");
      plan = parsed.plan || [];
    } catch (e) {
      // Fallback: Empty plan, the ReAct loop will take over
      console.warn("Planner failed to generate valid JSON plan. Falling back to dynamic routing.", e);
    }

    if (plan.length > 0) {
      onStep({ id: Date.now().toString(), type: 'thought', message: `Generated explicit plan with ${plan.length} steps.` });
    } else {
      onStep({ id: Date.now().toString(), type: 'thought', message: 'No explicit plan generated. Falling back to ReAct routing.' });
    }

    const executedStepsResults: any[] = [];

    // The core ReAct/Coordinator Loop
    while (!isDone) {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction: SUPERVISOR_PROMPT,
          // Bounded Autonomy: Mask tools dynamically (For simplicity, we pass all here, but you can filter based on plan step)
          tools: [{ functionDeclarations: [searchWebTool, searchMapsTool, generateImageTool, saveArtifactTool, readUrlTool, calculatorTool, getWeatherTool, getCurrentTimeTool, saveMemoryTool, searchMemoryTool, solveLogicProblemTool, executeTdadTaskTool, semanticDataTool, getBestStrategyTool, rewardStrategyTool] }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });

      const functionCalls = response.functionCalls;
    
      if (functionCalls && functionCalls.length > 0) {
        if (response.candidates && response.candidates[0].content) {
          contents.push(response.candidates[0].content);
        }

        const functionResponses: Part[] = [];
        
        for (const call of functionCalls) {
          let result = "";
          const stepId = Date.now().toString() + Math.random().toString(36).substring(7);

          try {
            if (call.name === "search_web") {
              onStep({ id: stepId, type: 'tool_call', message: `Searching web for: "${call.args.query}"` });
              result = await runSearchWorker(call.args.query as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Found ${result.length > 100 ? 'detailed' : 'brief'} search results.` });
            } else if (call.name === "search_maps") {
              onStep({ id: stepId, type: 'tool_call', message: `Searching maps for: "${call.args.query}"` });
              result = await runMapsWorker(call.args.query as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Found map locations.` });
            } else if (call.name === "generate_image") {
              onStep({ id: stepId, type: 'tool_call', message: `Generating image: "${call.args.prompt}" (${call.args.size || '1K'})` });
              result = await runGenerateImageWorker(call.args.prompt as string, call.args.size as any || "1K", userId);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Image generation complete.` });
            } else if (call.name === "save_artifact") {
              onStep({ id: stepId, type: 'tool_call', message: `Saving artifact: ${call.args.title}` });

              // Save to Firestore
              const artifactId = Date.now().toString();
              await setDoc(doc(db, 'artifacts', artifactId), {
                id: artifactId,
                sessionId,
                userId,
                type: call.args.type,
                title: call.args.title,
                data: call.args.data,
                createdAt: new Date()
              });

              result = `Artifact saved successfully with ID: ${artifactId}`;
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Artifact saved to sidebar.` });
            } else if (call.name === "read_url") {
              onStep({ id: stepId, type: 'tool_call', message: `Reading URL: ${call.args.url}` });
              result = await runReadUrlWorker(call.args.url as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Read URL content.` });
            } else if (call.name === "calculator") {
              onStep({ id: stepId, type: 'tool_call', message: `Calculating: ${call.args.expression}` });
              result = await runCalculatorWorker(call.args.expression as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Calculation complete.` });
            } else if (call.name === "get_weather") {
              onStep({ id: stepId, type: 'tool_call', message: `Getting weather for: ${call.args.latitude}, ${call.args.longitude}` });
              result = await runWeatherWorker(call.args.latitude as number, call.args.longitude as number);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Retrieved weather data.` });
            } else if (call.name === "get_current_time") {
              onStep({ id: stepId, type: 'tool_call', message: `Getting current time${call.args.timezone ? ` for ${call.args.timezone}` : ''}` });
              result = await runTimeWorker(call.args.timezone as string | undefined);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Retrieved current time.` });
            } else if (call.name === "save_memory") {
              onStep({ id: stepId, type: 'tool_call', message: `Saving memory: ${call.args.content}` });
              result = await runSaveMemoryWorker(call.args.content as string, call.args.tags as string[], userId, call.args.linkedMemoryIds as string[] | undefined);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Memory saved to persistent database.` });
            } else if (call.name === "search_memory") {
              onStep({ id: stepId, type: 'tool_call', message: `Searching memory for: ${call.args.query}` });
              result = await runSearchMemoryWorker(call.args.query as string, userId, call.args.tags as string[] | undefined);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Memory search complete.` });
            } else if (call.name === "solve_logic_problem") {
              onStep({ id: stepId, type: 'tool_call', message: `Spawning Collaborative Agents to solve logic problem...` });
              result = await runLogicSolverWorker(call.args.problem as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Collaborative Agents reached consensus.` });
            } else if (call.name === "execute_tdad_task") {
              onStep({ id: stepId, type: 'tool_call', message: `Initiating Test-Driven Agent Development (TDAD) for task...` });
              result = await runTDADWorker(call.args.task as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `TDAD process complete.` });
            } else if (call.name === "semantic_data_analysis") {
              onStep({ id: stepId, type: 'tool_call', message: `Executing Semantic Layer Translation & Hypercube Aggregation for query...` });
              result = await runSemanticDataWorker(call.args.query as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Semantic Analysis complete.` });
            } else if (call.name === "get_best_strategy") {
              onStep({ id: stepId, type: 'tool_call', message: `Fetching Meta-Cognitive Weights for: ${call.args.taskType}` });
              result = await getBestStrategy(call.args.taskType as string);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `Retrieved optimal strategy.` });
            } else if (call.name === "reward_strategy") {
              onStep({ id: stepId, type: 'tool_call', message: `Updating RL weights for strategy: ${call.args.strategy}` });
              result = await rewardStrategy(call.args.taskType as string, call.args.strategy as string, call.args.successScore as number);
              onStep({ id: stepId + '_res', type: 'tool_result', message: `RL weights updated.` });
            } else {
              result = "Unknown tool requested.";
            }
          } catch (error: any) {
            result = `Error executing ${call.name}: ${error.message}`;
            onStep({ id: stepId + '_err', type: 'error', message: `Failed to execute ${call.name}: ${error.message}` });
          }

          executedStepsResults.push({ tool: call.name, result });

          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result }
            }
          });
        }
        
        contents.push({ role: "user", parts: functionResponses });
      } else {
        // Reflection & Self-Correction Step
        onStep({ id: Date.now().toString(), type: 'thought', message: 'Verifying final response...' });

        const verifierResponse = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [{
            role: "user",
            parts: [{
              text: `Original Request: ${userMessage}\n\nDraft Answer: ${response.text}\n\nTool Results: ${JSON.stringify(executedStepsResults)}\n\nVerify this answer and provide the final polished response.`
            }]
          }],
          config: { systemInstruction: VERIFIER_PROMPT }
        });

        finalResponseText = verifierResponse.text || response.text || "I'm sorry, I couldn't generate a response.";
        isDone = true;
      }
    }
  } catch (error: any) {
    if (error.message && error.message.includes('429')) {
      finalResponseText = "I'm sorry, but I've reached my Gemini API rate limit. Please wait a moment and try again.";
    } else {
      finalResponseText = `I encountered an error: ${error.message}`;
    }
  }
  
  return finalResponseText;
}
