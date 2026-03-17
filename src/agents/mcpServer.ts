import express from 'express';
import { SUPERVISOR_PROMPT, searchWebTool, calculatorTool } from './config';
// Mock Model Context Protocol (MCP) Server for tool discovery
// In a real enterprise system, tools wouldn't be hardcoded into the agent;
// the agent would discover them dynamically via an MCP endpoint.

const router = express.Router();

const availableTools = [
  searchWebTool,
  calculatorTool
  // Add other tools here...
];

router.get('/mcp/discover', (req, res) => {
  res.json({
    protocolVersion: "1.0",
    serverName: "OmniAgent-Core-MCP",
    tools: availableTools
  });
});

router.post('/mcp/execute', async (req, res) => {
  const { toolName, args } = req.body;

  try {
    // In a real implementation, this would route to the actual worker logic
    if (toolName === "calculator") {
      // Basic validation to prevent arbitrary code execution
      if (!/^[0-9+\-*/().\s]+$/.test(args.expression)) {
        throw new Error("Invalid characters in expression. Only numbers and basic math operators (+, -, *, /, (), .) are allowed.");
      }

      // Evaluate the mathematical expression safely
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${args.expression}`)();

      res.json({ result: `Result of ${args.expression} is: ${result}` });
    } else {
      res.status(404).json({ error: `Tool ${toolName} not implemented in mock MCP` });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;