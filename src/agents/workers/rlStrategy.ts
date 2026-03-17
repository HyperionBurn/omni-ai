import { db } from "../../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const STRATEGIES = [
  "step_by_step_deduction",
  "analogical_reasoning",
  "first_principles_analysis",
  "working_backwards"
];

export async function getBestStrategy(taskType: string): Promise<string> {
  const docRef = doc(db, "meta_cognitive_weights", taskType);
  let docSnap;
  try {
    docSnap = await getDoc(docRef);
  } catch (error: any) {
    // In local/mock environments, just return a random strategy
    return `Firebase mock mode: Suggest trying '${STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)]}' as a baseline strategy.`;
  }
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (!data) return "No data found.";
    const weights = data.weights as Record<string, number>;

    // Select strategy with highest weight (Exploitation) with a small chance for Exploration (epsilon-greedy)
    const epsilon = 0.2;
    let selectedStrategy = "";

    if (Math.random() < epsilon) {
      // Explore: Pick a random strategy
      selectedStrategy = STRATEGIES[Math.floor(Math.random() * STRATEGIES.length)];
      return `[Exploration] Selected strategy for '${taskType}' is: ${selectedStrategy}.`;
    } else {
      // Exploit: Pick best strategy
      let maxWeight = -Infinity;
      for (const s of STRATEGIES) {
        const w = weights[s] || 0;
        if (w > maxWeight) {
          maxWeight = w;
          selectedStrategy = s;
        }
      }
      return `[Exploitation] Based on historical reinforcement learning weights, the best reasoning strategy for '${taskType}' is: ${selectedStrategy} (Weight: ${maxWeight.toFixed(3)}). Use this strategy to approach the problem.`;
    }
  } else {
    // Initialize weights
    const initialWeights: Record<string, number> = {};
    for (const s of STRATEGIES) {
      initialWeights[s] = 0; // Initial weight
    }
    await setDoc(docRef, { weights: initialWeights });
    return `No historical data for '${taskType}'. Initialized weights. Suggest trying 'step_by_step_deduction' as a baseline strategy.`;
  }
}

export async function rewardStrategy(taskType: string, strategy: string, successScore: number): Promise<string> {
  // successScore between -1.0 and 1.0
  const docRef = doc(db, "meta_cognitive_weights", taskType);
  let docSnap;

  try {
    docSnap = await getDoc(docRef);
  } catch (error: any) {
    return `Mock update successful for strategy '${strategy}' on task '${taskType}' with reward ${successScore}.`;
  }
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    if (!data) return "No data found.";
    const weights = data.weights as Record<string, number>;
    const currentWeight = weights[strategy] || 0;
    
    // Simple Q-Learning update rule: Q(s,a) = Q(s,a) + alpha * (reward - Q(s,a))
    const learningRate = 0.1;
    weights[strategy] = currentWeight + learningRate * (successScore - currentWeight);
    
    await updateDoc(docRef, { weights });
    return `Successfully updated Continuous Online RL weight for strategy '${strategy}' on task '${taskType}'. New weight: ${weights[strategy].toFixed(3)}`;
  } else {
    // If it doesn't exist, create it with the first reward
    const initialWeights: Record<string, number> = {};
    for (const s of STRATEGIES) {
      initialWeights[s] = (s === strategy) ? (0 + 0.1 * successScore) : 0;
    }
    await setDoc(docRef, { weights: initialWeights });
    return `Initialized and updated RL weight for strategy '${strategy}' on task '${taskType}'.`;
  }
}
