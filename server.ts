import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { exec } from "child_process";
import fs from "fs/promises";
import crypto from "crypto";
import mcpServerRouter from "./src/agents/mcpServer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/execute", async (req, res) => {
    const { language, code } = req.body;

    if (!language || !code) {
      res.status(400).json({ error: "Missing language or code" });
      return;
    }

    const runId = crypto.randomUUID();
    const tmpDir = path.join(process.cwd(), "tmp", runId);

    try {
      await fs.mkdir(tmpDir, { recursive: true });

      let command = "";
      let fileExt = "";

      if (language === "bash") {
        fileExt = ".sh";
        const filePath = path.join(tmpDir, `script${fileExt}`);
        await fs.writeFile(filePath, code);
        command = `bash ${filePath}`;
      } else if (language === "python") {
        fileExt = ".py";
        const filePath = path.join(tmpDir, `script${fileExt}`);
        await fs.writeFile(filePath, code);
        command = `python3 ${filePath}`;
      } else if (language === "node") {
        fileExt = ".js";
        const filePath = path.join(tmpDir, `script${fileExt}`);
        await fs.writeFile(filePath, code);
        command = `node ${filePath}`;
      } else if (language === "docker") {
        fileExt = ".sh";
        const filePath = path.join(tmpDir, `script${fileExt}`);
        await fs.writeFile(filePath, code);
        command = `docker run --rm -v ${tmpDir}:/app -w /app ubuntu bash script.sh`;
      } else if (language === "docker-python") {
        fileExt = ".py";
        const filePath = path.join(tmpDir, `script${fileExt}`);
        await fs.writeFile(filePath, code);
        command = `docker run --rm -v ${tmpDir}:/app -w /app python:3.9 python script.py`;
      } else if (language === "docker-node") {
        fileExt = ".js";
        const filePath = path.join(tmpDir, `script${fileExt}`);
        await fs.writeFile(filePath, code);
        command = `docker run --rm -v ${tmpDir}:/app -w /app node:18 node script.js`;
      } else {
        res.status(400).json({ error: "Unsupported language" });
        return;
      }

      exec(command, { maxBuffer: 1024 * 1024 * 10, cwd: process.cwd(), timeout: 60000 }, (error, stdout, stderr) => {
        // Cleanup
        fs.rm(tmpDir, { recursive: true, force: true }).catch(console.error);

        res.json({
          stdout: stdout || "",
          stderr: stderr || "",
          error: error ? error.message : null,
          exitCode: error ? error.code : 0
        });
      });

    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Mock Model Context Protocol (MCP) server endpoints
  app.use("/api", mcpServerRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();