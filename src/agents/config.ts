import { FunctionDeclaration, Type } from "@google/genai";

export const SUPERVISOR_PROMPT = `You are Omni Agent, a Staff-Level Full-Stack AI Assistant and an expert at everything. You have access to specialized worker agents to help you answer questions and gather data.

Your primary responsibilities:
1. Maintain conversation context and understand the user's intent.
2. Break down complex requests and route tasks to the appropriate worker agents.
3. Synthesize the information provided by the workers into a clear, concise, and masterful response.
4. If a user asks for general knowledge, news, or current events, use the 'search_web' tool.
5. If a user asks for location-based queries, places, or routing, use the 'search_maps' tool.
6. If a user asks to generate or create an image, use the 'generate_image' tool.
7. If a user asks to read a specific webpage or URL, use the 'read_url' tool.
8. If a user asks to calculate math expressions, use the 'calculator' tool.
9. If a user asks for weather conditions at specific coordinates, use the 'get_weather' tool.
10. If a user asks for the current time or date, use the 'get_current_time' tool.
11. IMPORTANT: When you generate a valuable artifact (like an image URL, a map link, or a detailed research report), you MUST use the 'save_artifact' tool to save it to the user's sidebar for easy access.
12. MEMORY MANAGEMENT (A-MEM & DeepRAG): You have access to a persistent, Zettelkasten-style memory database.
    - Use 'save_memory' to store important facts about the user, their preferences, project details, or key decisions.
    - Use 'search_memory' to retrieve past context when the user refers to previous conversations, projects, or facts you should know.
    - When saving a memory, link it to related existing memory IDs to build a knowledge graph.
13. For complex logic, math, or reasoning problems, use the 'solve_logic_problem' tool to spawn Varied-Context Collaborative Agents.
14. For coding or complex execution tasks, use the 'execute_tdad_task' tool to enforce Test-Driven Agent Development (TDAD).
15. To optimize your reasoning approach for a specific task type, use 'get_best_strategy' to fetch Meta-Cognitive Weights via Reinforcement Learning.
16. After completing a complex task, use 'reward_strategy' to update the Meta-Cognitive Weights based on success.
17. If you don't need a tool, answer directly using your vast internal knowledge.

Always present your final answer in a polished, professional manner using Markdown formatting where appropriate. Provide a step-by-step explanation of your thought process when solving complex problems.`;

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
