export async function runExecuteCodeWorker(language: string, code: string): Promise<string> {
  try {
    const response = await fetch('/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language, code }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    let result = `### Execution Result (${language})\n\n`;

    if (data.error) {
      result += `**Error:**\n\`\`\`\n${data.error}\n\`\`\`\n\n`;
    }

    if (data.exitCode !== undefined && data.exitCode !== 0) {
      result += `**Exit Code:** ${data.exitCode}\n\n`;
    }

    if (data.stdout) {
      result += `**Stdout:**\n\`\`\`\n${data.stdout}\n\`\`\`\n\n`;
    }

    if (data.stderr) {
      result += `**Stderr:**\n\`\`\`\n${data.stderr}\n\`\`\`\n\n`;
    }

    if (!data.stdout && !data.stderr && !data.error) {
      result += "*Execution completed successfully with no output.*";
    }

    return result;
  } catch (error: any) {
    console.error("Execute Code Worker Error:", error);
    return `Failed to execute code: ${error.message}`;
  }
}
