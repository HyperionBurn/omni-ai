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
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const weights = docSnap.data().weights as Record<string, number>;
    // Select strategy with highest weight
    let bestStrategy = STRATEGIES[0];
    let maxWeight = -Infinity;
    for (const [strategy, weight] of Object.entries(weights)) {
      if (weight > maxWeight) {
        maxWeight = weight;
        bestStrategy = strategy;
      }
    }
    return `Based on historical reinforcement learning weights, the best reasoning strategy for '${taskType}' is: ${bestStrategy} (Weight: ${maxWeight.toFixed(3)}). Use this strategy to approach the problem.`;
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
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const weights = docSnap.data().weights as Record<string, number>;
    const currentWeight = weights[strategy] || 0;
    
    // Simple RL update rule: Q(s,a) = Q(s,a) + alpha * (reward - Q(s,a))
    const learningRate = 0.1;
    weights[strategy] = currentWeight + learningRate * (successScore - currentWeight);
    
    await updateDoc(docRef, { weights });
    return `Successfully updated RL weight for strategy '${strategy}' on task '${taskType}'. New weight: ${weights[strategy].toFixed(3)}`;
  } else {
    return `Error: Task type '${taskType}' not found in RL weights database.`;
  }
}
