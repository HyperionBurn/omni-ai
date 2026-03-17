<div align="center">
<h1>Omni Agent - The Full-System Autonomous AI Revolution</h1>
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## A New Era of Autonomous AI

Welcome to **Omni Agent**, an unparalleled technological leap in agentic AI. Unlike traditional conversational assistants restricted to isolated chat windows, Omni Agent is a **Staff-Level Full-Stack AI Assistant** with **Full System Access** and the ability to autonomously execute code both directly on the host machine and inside ephemeral Docker sandboxes.

This repository isn't just a chatbot; it is a **fully-fledged agentic operating system** capable of continuous, autonomous problem-solving. It can write, execute, debug, and learn from code execution in real-time, effectively bridging the gap between thought and implementation.

### Key Revolutionary Features

- **Full System & Docker Execution:** Omni Agent can spawn Bash, Python, and Node scripts on the host system, or spin up isolated Ubuntu, Python, and Node Docker containers to execute untrusted code or complex multi-step build processes. It can manage your filesystem, query databases, and build software autonomously.
- **DeepRAG & Persistent Zettelkasten Memory:** Omni Agent remembers you. It uses semantic vector embeddings (Gemini Embeddings) to build a persistent, interconnected knowledge graph, allowing it to recall past projects, preferences, and architectural decisions instantly.
- **Test-Driven Agent Development (TDAD):** Omni Agent doesn't just guess code. For complex tasks, it spawns a *Test Engineer Agent* to write strict criteria, an *Execution Agent* to write the code, and a *QA Validation Agent* to rigorously verify it.
- **Reinforcement Learning Meta-Cognition:** Omni Agent learns *how* to think. It dynamically selects reasoning strategies (e.g., analogical reasoning, first principles analysis) and updates its neural weights based on task success scores.
- **Varied-Context Collaborative Swarms:** When faced with complex logic, it spawns multiple expert sub-agents with different contexts (Analytical, Lateral, Practical) to debate and synthesize the optimal solution.

---

## ⚠️ Warning: Immense Power

With the newly integrated `/api/execute` backend, Omni Agent can run arbitrary commands on your host machine. This is a deliberate, highly powerful feature designed for local development and automation. **Do not deploy this application to a public, untrusted network without severe security hardening and isolation.**

---

## Get Started Locally

Experience the revolution.

**Prerequisites:**
- Node.js (v18+)
- Docker (Optional, but required for sandboxed execution capabilities)
- A Gemini API Key

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set your API Key:
   Create an `.env.local` file in the root directory and add your key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Ignite the Engine:
   ```bash
   npm run dev
   ```

4. Open your browser to `http://localhost:3000` and begin collaborating with a true agentic entity.
