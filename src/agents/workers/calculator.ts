export async function runCalculatorWorker(expression: string): Promise<string> {
  try {
    // Basic validation to prevent arbitrary code execution
    // Only allow numbers, basic operators, parentheses, and spaces
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error("Invalid characters in expression. Only numbers and basic math operators (+, -, *, /, (), .) are allowed.");
    }
    
    // Evaluate the mathematical expression safely
    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${expression}`)();
    
    return `Result of ${expression} is: ${result}`;
  } catch (error: any) {
    return `Failed to calculate: ${error.message}`;
  }
}
