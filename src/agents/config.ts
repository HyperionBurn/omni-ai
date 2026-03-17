import { FunctionDeclaration, Type } from "@google/genai";

export const SUPERVISOR_PROMPT = `You are the Coordinator Agent, managing a System-Theoretic Architecture. You orchestrate tasks, select appropriate workflows, and ensure robust execution.

Your responsibilities:
1. Understand user intent and break requests into a sequence of steps.
2. Select the correct tool for the job. Do not invoke tools randomly.
3. Rely on dynamic routing depending on the task predictability.
4. IMPORTANT: Before outputting a final answer to the user, verify it via Self-Correction. If the result of a tool doesn't fulfill the user prompt, retry or correct it.
5. IMPORTANT: When you generate a valuable artifact (like an image URL, a map link, or a detailed research report), you MUST use the 'save_artifact' tool to save it to the user's sidebar for easy access.
6. If a user asks for general knowledge, news, or current events, use the 'search_web' tool.
7. If a user asks for location-based queries, places, or routing, use the 'search_maps' tool.
8. If a user asks to generate or create an image, use the 'generate_image' tool.
9. If a user asks to read a specific webpage or URL, use the 'read_url' tool.
10. If a user asks to calculate math expressions, use the 'calculator' tool.
11. If a user asks for weather conditions at specific coordinates, use the 'get_weather' tool.
12. If a user asks for the current time or date, use the 'get_current_time' tool.
13. MEMORY MANAGEMENT (A-MEM & DeepRAG): You have access to a persistent, Zettelkasten-style memory database. Use 'save_memory' and 'search_memory' respectively.
14. For complex logic, math, or reasoning problems, use the 'solve_logic_problem' tool to spawn Varied-Context Collaborative Agents.
15. For coding or complex execution tasks, use the 'execute_tdad_task' tool to enforce Test-Driven Agent Development (TDAD).
16. To perform a semantic analysis or database aggregation on user data, use the 'semantic_data_analysis' tool.
17. To optimize your reasoning approach for a specific task type, use 'get_best_strategy' to fetch Meta-Cognitive Weights via Reinforcement Learning.
18. After completing a complex task, use 'reward_strategy' to update the Meta-Cognitive Weights based on success.

Always verify your result. If you don't need a tool, answer directly using your vast internal knowledge.`;

export const PLANNER_PROMPT = `You are the Planning Module of a System-Theoretic Agent Architecture.
Given the user's request and chat history, decompose the request into an explicit, sequential step-by-step JSON plan.
You must output ONLY valid JSON containing an array of steps.

Example:
{
  "plan": [
    {
      "step": 1,
      "description": "Fetch weather for San Francisco",
      "tool": "get_weather",
      "args": { "latitude": 37.77, "longitude": -122.41 }
    },
    {
      "step": 2,
      "description": "Search memory for user's favorite coffee shop in San Francisco",
      "tool": "search_memory",
      "args": { "query": "favorite coffee shop san francisco" }
    }
  ]
}`;

export const VERIFIER_PROMPT = `You are the Reflection & Self-Correction Agent.
Given the original user request, the plan executed, and the raw results from the tools, verify if the results answer the user's request completely and accurately.
Output a final, polished response for the user based on the tool results. If the tool results failed to answer the question or contain errors, explain the error and provide the best possible fallback answer using the partial information or your internal knowledge.
Format your final output in Markdown.`;

export const searchWebTool: FunctionDeclaration = {
  name: "search_web",
  description: "Search the web for up-to-date information, news, and facts.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The search query to execute." }
    },
    required: ["query"]
  }
};

export const searchMapsTool: FunctionDeclaration = {
  name: "search_maps",
  description: "Search Google Maps for places, locations, businesses, and geographic information.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The maps search query to execute." }
    },
    required: ["query"]
  }
};

export const generateImageTool: FunctionDeclaration = {
  name: "generate_image",
  description: "Generate a high-quality image based on a prompt.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: { type: Type.STRING, description: "A detailed description of the image to generate." },
      size: { type: Type.STRING, enum: ["1K", "2K", "4K"], description: "The resolution of the image. Default to 1K unless specified." }
    },
    required: ["prompt"]
  }
};

export const saveArtifactTool: FunctionDeclaration = {
  name: "save_artifact",
  description: "Save a generated artifact (image, map, report) to the database so it appears in the user's sidebar.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "A short, descriptive title for the artifact." },
      type: { type: Type.STRING, enum: ["image", "map", "report", "search_results"], description: "The type of artifact." },
      data: { type: Type.STRING, description: "The content of the artifact. For images/maps, this should be the URL. For reports, this should be the markdown text." }
    },
    required: ["title", "type", "data"]
  }
};

export const readUrlTool: FunctionDeclaration = {
  name: "read_url",
  description: "Fetch and read the text content of a webpage from a given URL.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The URL to fetch." }
    },
    required: ["url"]
  }
};

export const calculatorTool: FunctionDeclaration = {
  name: "calculator",
  description: "Evaluate a mathematical expression. Only supports basic math operations (+, -, *, /, ()).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      expression: { type: Type.STRING, description: "The math expression to evaluate (e.g., '2 + 2 * 4')." }
    },
    required: ["expression"]
  }
};

export const getWeatherTool: FunctionDeclaration = {
  name: "get_weather",
  description: "Get the current weather for a specific location using latitude and longitude.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      latitude: { type: Type.NUMBER, description: "Latitude of the location." },
      longitude: { type: Type.NUMBER, description: "Longitude of the location." }
    },
    required: ["latitude", "longitude"]
  }
};

export const getCurrentTimeTool: FunctionDeclaration = {
  name: "get_current_time",
  description: "Get the current local time and date.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      timezone: { type: Type.STRING, description: "Optional timezone (e.g., 'America/Los_Angeles'). Defaults to UTC." }
    }
  }
};

export const saveMemoryTool: FunctionDeclaration = {
  name: "save_memory",
  description: "Save a fact, preference, or concept to the persistent Zettelkasten memory database.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      content: { type: Type.STRING, description: "The core content or fact to remember." },
      tags: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Keywords or categories for this memory (e.g., ['user_preference', 'dietary_restriction'])." 
      },
      linkedMemoryIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Optional array of existing memory IDs that this new memory relates to."
      }
    },
    required: ["content", "tags"]
  }
};

export const searchMemoryTool: FunctionDeclaration = {
  name: "search_memory",
  description: "Search the persistent memory database for relevant facts using semantic search (DeepRAG).",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The semantic search query to find relevant memories." },
      tags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Optional tags to filter the search results."
      }
    },
    required: ["query"]
  }
};

export const solveLogicProblemTool: FunctionDeclaration = {
  name: "solve_logic_problem",
  description: "Spawn Varied-Context Collaborative Agents to solve a complex logic, math, or reasoning problem. They will vote and summarize the best answer.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      problem: { type: Type.STRING, description: "The complex problem to solve." }
    },
    required: ["problem"]
  }
};

export const executeTdadTaskTool: FunctionDeclaration = {
  name: "execute_tdad_task",
  description: "Enforce Test-Driven Agent Development (TDAD) for a coding or execution task. Spawns a Test Engineer, Execution Agent, and Validation Agent.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      task: { type: Type.STRING, description: "The coding or execution task to complete." }
    },
    required: ["task"]
  }
};

export const semanticDataTool: FunctionDeclaration = {
  name: "semantic_data_analysis",
  description: "Translate natural language to a database query (Semantic Layer), execute it, and perform an on-the-fly multi-dimensional analysis (Hypercube) of the results.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The natural language question about the user's data (memories or artifacts)." }
    },
    required: ["query"]
  }
};

export const getBestStrategyTool: FunctionDeclaration = {
  name: "get_best_strategy",
  description: "Fetch the best reasoning strategy for a specific task type using Meta-Cognitive Weights via Reinforcement Learning.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskType: { type: Type.STRING, description: "The type of task (e.g., 'math_word_problem', 'code_refactoring', 'creative_writing')." }
    },
    required: ["taskType"]
  }
};

export const rewardStrategyTool: FunctionDeclaration = {
  name: "reward_strategy",
  description: "Update the Meta-Cognitive Weights for a strategy based on how successful it was.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      taskType: { type: Type.STRING, description: "The type of task." },
      strategy: { type: Type.STRING, description: "The strategy that was used." },
      successScore: { type: Type.NUMBER, description: "A score between -1.0 (complete failure) and 1.0 (perfect success)." }
    },
    required: ["taskType", "strategy", "successScore"]
  }
};
