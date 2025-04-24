import { MazeGrid } from './mazeGenerator';

// Priority Queue
import TinyQueue from 'tinyqueue'; 

export interface AlgorithmMetrics {
  nodesVisited: number;
  pathLength: number;
  executionTime: number;
  isPathFound: boolean;
}

export interface MonteCarloMetrics extends AlgorithmMetrics {
  valueFunction: { [key: string]: number };

  // for visualization
  valueFunctionHistory: Array<{ [key: string]: number }>;
  epsilonUsed: number;
  discountFactorUsed: number;
  episodesCompleted: number;
  totalEpisodes: number;
  rewardValueUsed: number;

  // dead-end penalty
  stuckPenaltyUsed: number;
}

// Step details passed to UI callback
export interface AlgorithmStep {
  grid: MazeGrid;
  metrics: AlgorithmMetrics | MonteCarloMetrics | QLearningMetrics;
}

const dx = [-1, 0, 1, 0];
const dy = [0, 1, 0, -1];

// Find the starting and ending positions in the maze
const findPositions = (grid: MazeGrid): { start: [number, number]; end: [number, number] } => {
  let start: [number, number] = [0, 0];
  let end: [number, number] = [0, 0];

  for (let i = 0; i < grid.length; i++) {
    for (let j = 0; j < grid[0].length; j++) {
      if (grid[i][j].isStart) {
        start = [i, j];
      }
      if (grid[i][j].isEnd) {
        end = [i, j];
      }
    }
  }

  return { start, end };
};

// Create a deep copy of the grid
const cloneGrid = (grid: MazeGrid): MazeGrid => {
  return grid.map(row => row.map(cell => ({ ...cell })));
};

// DFS implementation
export const runDFS = async (
  initialGrid: MazeGrid, 
  onStep: (step: AlgorithmStep) => void
): Promise<AlgorithmMetrics> => {
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  
  // Initialize metrics
  const metrics: AlgorithmMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false
  };

  const stack: Array<[number, number, Array<[number, number]>]> = [];
  stack.push([start[0], start[1], [[start[0], start[1]]]]);
  
  const visited: boolean[][] = Array(grid.length)
    .fill(false)
    .map(() => Array(grid[0].length).fill(false));
  
  visited[start[0]][start[1]] = true;
  
  // Delay function for visualization
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (stack.length > 0) {
    const [currentRow, currentCol, path] = stack.pop()!;
    
    // Mark current cell as visited
    if (!grid[currentRow][currentCol].isStart && !grid[currentRow][currentCol].isEnd) {
      grid[currentRow][currentCol].isVisited = true;
    }
    
    metrics.nodesVisited++;
    
    // Update UI
    onStep({
      grid: cloneGrid(grid),
      metrics: { ...metrics }
    });
    
    // Wait a bit to visualize the process
    await delay(30);
    
    // Check if we reached the end
    if (grid[currentRow][currentCol].isEnd) {
      // Mark the path
      for (const [r, c] of path) {
        if (!grid[r][c].isStart && !grid[r][c].isEnd) {
          grid[r][c].isPath = true;
        }
      }
      
      metrics.isPathFound = true;
      metrics.pathLength = path.length - 1;
      metrics.executionTime = performance.now() - startTime;
      
      // One final update
      onStep({
        grid: cloneGrid(grid),
        metrics: { ...metrics }
      });
      
      return metrics;
    }
    
    // Shuffle directions for a more natural-looking DFS
    const directions = [0, 1, 2, 3];
    for (let i = 0; i < directions.length; i++) {
      const randIndex = Math.floor(Math.random() * directions.length);
      [directions[i], directions[randIndex]] = [directions[randIndex], directions[i]];
    }
    
    for (const dir of directions) {
      const newRow = currentRow + dx[dir];
      const newCol = currentCol + dy[dir];
      
      // Check if the new position is valid
      if (
        newRow >= 0 && newRow < grid.length &&
        newCol >= 0 && newCol < grid[0].length &&
        !grid[newRow][newCol].isWall &&
        !visited[newRow][newCol]
      ) {
        visited[newRow][newCol] = true;
        stack.push([newRow, newCol, [...path, [newRow, newCol]]]);
      }
    }
  }
  
  // No path found
  metrics.executionTime = performance.now() - startTime;
  metrics.isPathFound = false;
  
  onStep({
    grid: cloneGrid(grid),
    metrics: { ...metrics }
  });
  
  return metrics;
};

// BFS implementation
export const runBFS = async (
  initialGrid: MazeGrid, 
  onStep: (step: AlgorithmStep) => void
): Promise<AlgorithmMetrics> => {
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  
  const metrics: AlgorithmMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false
  };

  const queue: Array<[number, number, Array<[number, number]>]> = [];
  queue.push([start[0], start[1], [[start[0], start[1]]]]);
  
  const visited: boolean[][] = Array(grid.length)
    .fill(false)
    .map(() => Array(grid[0].length).fill(false));
  
  visited[start[0]][start[1]] = true;
  
  // Delay function for visualization
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (queue.length > 0) {
    const [currentRow, currentCol, path] = queue.shift()!;
    
    // Mark current cell as visited
    if (!grid[currentRow][currentCol].isStart && !grid[currentRow][currentCol].isEnd) {
      grid[currentRow][currentCol].isVisited = true;
    }
    
    metrics.nodesVisited++;
    
    // Update UI
    onStep({
      grid: cloneGrid(grid),
      metrics: { ...metrics }
    });
    
    // Wait a bit to visualize the process
    await delay(20);
    
    // Check if we reached the end
    if (grid[currentRow][currentCol].isEnd) {
      // Mark the path
      for (const [r, c] of path) {
        if (!grid[r][c].isStart && !grid[r][c].isEnd) {
          grid[r][c].isPath = true;
        }
      }
      
      metrics.isPathFound = true;
      metrics.pathLength = path.length - 1;
      metrics.executionTime = performance.now() - startTime;
      
      // One final update
      onStep({
        grid: cloneGrid(grid),
        metrics: { ...metrics }
      });
      
      return metrics;
    }
    
    // Try all 4 directions in a consistent order
    for (let i = 0; i < 4; i++) {
      const newRow = currentRow + dx[i];
      const newCol = currentCol + dy[i];
      
      // Check if the new position is valid
      if (
        newRow >= 0 && newRow < grid.length &&
        newCol >= 0 && newCol < grid[0].length &&
        !grid[newRow][newCol].isWall &&
        !visited[newRow][newCol]
      ) {
        visited[newRow][newCol] = true;
        queue.push([newRow, newCol, [...path, [newRow, newCol]]]);
      }
    }
  }
  
  // No path found
  metrics.executionTime = performance.now() - startTime;
  metrics.isPathFound = false;
  
  onStep({
    grid: cloneGrid(grid),
    metrics: { ...metrics }
  });
  
  return metrics;
};

// manhattan distance
const manhattanDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
};

type AStarNode = [number, number, Array<[number, number]>, number];

// A* Search implementation using tinyqueue
export const runAStar = async (
  initialGrid: MazeGrid, 
  onStep: (step: AlgorithmStep) => void
): Promise<AlgorithmMetrics> => {
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  
  // Initialize metrics
  const metrics: AlgorithmMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false
  };

  // Use TinyQueue (priority queue library) for the open set
  const openSet = new TinyQueue<AStarNode>([], (a, b) => a[3] - b[3]);

  // Initial node
  const hScore = manhattanDistance(start[0], start[1], end[0], end[1]);
  openSet.push([start[0], start[1], [[start[0], start[1]]], hScore]);
  
  const gScore: { [key: string]: number } = {};
  gScore[`${start[0]},${start[1]}`] = 0;
  
  // Keep track of visited cells (closed set)
  const closedSet = new Set<string>();
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (openSet.length > 0) {
    // Get the node with the lowest fScore from the queue
    const currentNode = openSet.pop();
    if (!currentNode) break;
    
    const [currentRow, currentCol, path, _] = currentNode;
    const currentKey = `${currentRow},${currentCol}`;

    // If already visited, skip
    if (closedSet.has(currentKey)) {
        continue;
    }
    closedSet.add(currentKey);
    metrics.nodesVisited++;

    // Mark cell as visited for visualization
    if (!grid[currentRow][currentCol].isStart && !grid[currentRow][currentCol].isEnd) {
        grid[currentRow][currentCol].isVisited = true;
    }

    // Update UI
    onStep({
        grid: cloneGrid(grid),
        metrics: { ...metrics }
    });
    await delay(15);

    // Check if we reached the end
    if (currentRow === end[0] && currentCol === end[1]) {
      metrics.isPathFound = true;
      // Mark final path
      for (const [r, c] of path) {
        if (!grid[r][c].isStart && !grid[r][c].isEnd) {
          grid[r][c].isPath = true;
        }
      }
      metrics.pathLength = path.length - 1;
      break;
    }

    // Explore neighbors
    for (let i = 0; i < 4; i++) {
      const newRow = currentRow + dx[i];
      const newCol = currentCol + dy[i];
      const neighborKey = `${newRow},${newCol}`;

      // Check bounds and walls
      if (
        newRow >= 0 && newRow < grid.length &&
        newCol >= 0 && newCol < grid[0].length &&
        !grid[newRow][newCol].isWall
      ) {
        // If neighbor is already visited, skip
        if (closedSet.has(neighborKey)) {
            continue;
        }

        // Calculate gScore
        const tentativeGScore = (gScore[currentKey] ?? Infinity) + 1; 

        // If this path to neighbor is better than any previous one
        if (tentativeGScore < (gScore[neighborKey] ?? Infinity)) {
          gScore[neighborKey] = tentativeGScore;
          const neighborHScore = manhattanDistance(newRow, newCol, end[0], end[1]);
          const neighborFScore = tentativeGScore + neighborHScore;
          const newPath: Array<[number, number]> = [...path, [newRow, newCol]];
          
          // Add neighbor  for exploration
          openSet.push([newRow, newCol, newPath, neighborFScore]);
        }
      }
    }
  }
  
  metrics.executionTime = performance.now() - startTime;
  
  // Final update with the path potentially marked
  onStep({
    grid: cloneGrid(grid),
    metrics: { ...metrics }
  });
  
  return metrics;
};

// Monte Carlo
export const runMonteCarlo = async (
  initialGrid: MazeGrid,
  onStep: (step: AlgorithmStep) => void,
  episodes: number = 100,
  epsilon: number = 0.1,
  discountFactor: number = 0.9,
  rewardValue: number = 100, 
  stuckPenalty: number = -1
): Promise<MonteCarloMetrics> => {
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  
  // Initialize metrics
  const metrics: MonteCarloMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false,
    valueFunction: {},
    valueFunctionHistory: [],
    epsilonUsed: epsilon,
    discountFactorUsed: discountFactor,
    episodesCompleted: 0,
    totalEpisodes: episodes,
    rewardValueUsed: rewardValue,
    stuckPenaltyUsed: stuckPenalty
  };

  // Initialize valueFunction
  const rows = grid.length;
  const cols = grid[0].length;
  
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (!grid[i][j].isWall) {
        const key = `${i},${j}`;
        metrics.valueFunction[key] = 0;
      }
    }
  }
  
  // Set goal state value using the reward parameter
  metrics.valueFunction[`${end[0]},${end[1]}`] = rewardValue;
  
  // Keep track of visits for averaging returns
  const visitCounts: { [key: string]: number } = {};
  
  // Delay function for visualization
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Snapshot the value function for history
  const saveValueFunctionSnapshot = () => {
    metrics.valueFunctionHistory.push({...metrics.valueFunction});
  };
  
  saveValueFunctionSnapshot();
  
  // Training phase - run multiple episodes
  for (let episode = 0; episode < episodes; episode++) {
    metrics.episodesCompleted = episode + 1;
    
    const trajectory: Array<[number, number]> = [];
    let currentRow = start[0];
    let currentCol = start[1];
    let isEpisodeComplete = false;
    const episodeVisits = new Set<string>();
    const maxSteps = rows * cols * 2; 
    let steps = 0;
    let episodeOutcome: 'goal' | 'stuck' | 'max_steps' = 'max_steps';
    
    while (!isEpisodeComplete && steps < maxSteps) {
      steps++;
      const key = `${currentRow},${currentCol}`;
      trajectory.push([currentRow, currentCol]);
      episodeVisits.add(key);
      
      // Check if we reached the end state
      if (currentRow === end[0] && currentCol === end[1]) {
        episodeOutcome = 'goal';
        isEpisodeComplete = true;
        continue;
      }
      
      // Epsilon-greedy action selection
      const validActions: number[] = [];
      const actionValues: number[] = [];
      
      for (let i = 0; i < 4; i++) {
        const newRow = currentRow + dx[i];
        const newCol = currentCol + dy[i];
        const nextKey = `${newRow},${newCol}`;
        
        // valid action
        if (
          newRow >= 0 && newRow < rows &&
          newCol >= 0 && newCol < cols &&
          !grid[newRow][newCol].isWall &&
          !episodeVisits.has(nextKey)
        ) {
          validActions.push(i);
          actionValues.push(metrics.valueFunction[nextKey] || 0);
        }
      }
      
      // Check if stuck
      if (validActions.length === 0) {
        episodeOutcome = 'stuck'; 
        isEpisodeComplete = true;
        continue;
      }
      
      // Epsilon chance of random, otherwise greedy
      let actionIndex: number;
      
      if (Math.random() < epsilon) {
        // Random action
        actionIndex = Math.floor(Math.random() * validActions.length);
      } else {
        // Greedy action (pick highest value)
        let maxValue = -Infinity;
        let maxIndices: number[] = [];
        
        for (let i = 0; i < actionValues.length; i++) {
          if (actionValues[i] > maxValue) {
            maxValue = actionValues[i];
            maxIndices = [i];
          } else if (actionValues[i] === maxValue) {
            maxIndices.push(i);
          }
        }
        
        // Randomly select among actions with the same value
        actionIndex = maxIndices[Math.floor(Math.random() * maxIndices.length)];
      }
      
      // Take the selected action
      const action = validActions[actionIndex];
      currentRow += dx[action];
      currentCol += dy[action];
    }
    
    // Update returns
    const returns: { [key: string]: number } = {};
    let G = 0;

    // Work backwards to calculate returns
    for (let i = trajectory.length - 1; i >= 0; i--) {
      const [row, col] = trajectory[i];
      const key = `${row},${col}`;
      let reward = 0;
      
      // Assign reward only for the terminal state of this trajectory
      if (i === trajectory.length - 1) {
        // Reward positive for goal, negative for any failure
        reward = episodeOutcome === 'goal' ? rewardValue : stuckPenalty;
      }
      
      G = reward + discountFactor * G;
      
      if (!returns[key]) {
        returns[key] = G;
      }
    }
    
    // Update value function based on first visit returns
    const firstVisitUpdates = new Set<string>();
    for (const [row, col] of trajectory) {
      const key = `${row},${col}`;
      if (!firstVisitUpdates.has(key)) {
         firstVisitUpdates.add(key);
         visitCounts[key] = (visitCounts[key] || 0) + 1;
         const oldValue = metrics.valueFunction[key] || 0;
         const currentReturn = returns[key];
         if (currentReturn !== undefined) {
           metrics.valueFunction[key] = oldValue + (currentReturn - oldValue) / visitCounts[key];
         }
      }
    }
    
    // Ensure early updates are captured
    if (episode < 20) {
      saveValueFunctionSnapshot();
    } else {
      // Save at specific intervals based on total episodes
      if (episodes <= 100) {
        // For fewer episodes, save more frequently
        if (episode % Math.max(1, Math.floor(episodes / 20)) === 0) {
          saveValueFunctionSnapshot();
        }
      } else {
        // For many episodes, save more snapshots
        if (episode % Math.max(1, Math.floor(episodes / 100)) === 0) {
          saveValueFunctionSnapshot();
        }
      }
    }
    
    // Only update UI with progress
    if (episode % Math.max(1, Math.floor(episodes / 10)) === 0 || episode === episodes - 1) {
      // Just update metrics without changing the grid
      onStep({
        grid: cloneGrid(initialGrid),
        metrics: { ...metrics }
      });
      
      // Very short delay just to allow UI updates
      await delay(10);
    }
  }
  
  // Final snapshot
  saveValueFunctionSnapshot();
  
  metrics.executionTime = performance.now() - startTime;
  return metrics;
};

// Function to run a trained Monte Carlo model (for exploring after training)
export const runMonteCarloExploration = async (
  initialGrid: MazeGrid,
  onStep: (step: AlgorithmStep) => void,
  valueFunction: { [key: string]: number }
): Promise<MonteCarloMetrics> => {
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  
  // Initialize metrics with existing value function
  const metrics: MonteCarloMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false,
    valueFunction: { ...valueFunction },
    valueFunctionHistory: [{ ...valueFunction }],
    epsilonUsed: 0,
    discountFactorUsed: 0.9,
    episodesCompleted: 0,
    totalEpisodes: 0,
    rewardValueUsed: 0,
    stuckPenaltyUsed: 0
  };
  
  const rows = grid.length;
  const cols = grid[0].length;
  
  // Start from the beginning
  let currentRow = start[0];
  let currentCol = start[1];
  const path: Array<[number, number]> = [[currentRow, currentCol]];
  
  // Follow the learned policy (greedy) until we reach the end or hit a loop
  const maxSteps = rows * cols * 2;
  let steps = 0;
  const visited = new Set<string>();
  
  // Delay function for visualization
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  while (steps < maxSteps) {
    steps++;
    const key = `${currentRow},${currentCol}`;
    
    // Check if we've been here before (loop detection)
    if (visited.has(key) && key !== `${start[0]},${start[1]}`) {
      break;
    }
    
    visited.add(key);
    metrics.nodesVisited++;
    
    // Check if we reached the end
    if (currentRow === end[0] && currentCol === end[1]) {
      metrics.isPathFound = true;
      break;
    }
    
    // Mark cell as visited for visualization
    if (!grid[currentRow][currentCol].isStart && !grid[currentRow][currentCol].isEnd) {
      grid[currentRow][currentCol].isVisited = true;
    }
    
    // Update UI
    onStep({
      grid: cloneGrid(grid),
      metrics: { ...metrics }
    });
    
    await delay(30);
    
    // Find the next best action using the learned policy (greedy)
    let bestValue = -Infinity;
    let bestAction = -1;
    
    for (let i = 0; i < 4; i++) {
      const newRow = currentRow + dx[i];
      const newCol = currentCol + dy[i];
      
      if (
        newRow >= 0 && newRow < rows &&
        newCol >= 0 && newCol < cols &&
        !grid[newRow][newCol].isWall
      ) {
        const nextKey = `${newRow},${newCol}`;
        const value = metrics.valueFunction[nextKey] || 0;
        
        if (value > bestValue) {
          bestValue = value;
          bestAction = i;
        }
      }
    }
    
    // If we can't find a valid action, we're stuck
    if (bestAction === -1) {
      break;
    }
    
    // Take the best action
    currentRow += dx[bestAction];
    currentCol += dy[bestAction];
    path.push([currentRow, currentCol]);
  }
  
  // Mark the final path followed during exploration, regardless of success
  for (const [r, c] of path) {
    if (!grid[r][c].isStart && !grid[r][c].isEnd) {
      grid[r][c].isPath = true;
    }
  }
  
  // Set pathLength based on the actual path taken
  metrics.pathLength = path.length > 0 ? path.length - 1 : 0;
  
  metrics.executionTime = performance.now() - startTime;

  // Final UI update
  onStep({
    grid: cloneGrid(grid),
    metrics: { ...metrics }
  });

  return metrics;
};

export type QTable = { [key: string]: { [action: number]: number } };

// Metrics specific to Q-Learning
export interface QLearningMetrics extends AlgorithmMetrics {
  qTable: QTable;
  epsilonUsed: number;
  discountFactorUsed: number;
  learningRateUsed: number;
  rewardValueUsed: number;
  stuckPenaltyUsed: number;
  episodesCompleted: number;
  totalEpisodes: number;
}

// Q-Learning Implementation
export const runQLearning = async (
  initialGrid: MazeGrid,
  onStep: (step: AlgorithmStep) => void,
  episodes: number = 1000,
  epsilon: number = 0.1,
  discountFactor: number = 0.9,
  learningRate: number = 0.1,
  rewardValue: number = 1,
  stuckPenalty: number = -1
): Promise<QLearningMetrics> => {
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  const rows = grid.length;
  const cols = grid[0].length;
  const qTable: QTable = {};

  // Initialize Q-table with zeros
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c].isWall) {
        const key = `${r},${c}`;
        qTable[key] = {};
        for (let a = 0; a < 4; a++) {
          qTable[key][a] = 0;
        }
      }
    }
  }

  // Initialize metrics
  const metrics: QLearningMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false,
    qTable: {},
    epsilonUsed: epsilon,
    discountFactorUsed: discountFactor,
    learningRateUsed: learningRate,
    rewardValueUsed: rewardValue,
    stuckPenaltyUsed: stuckPenalty,
    episodesCompleted: 0,
    totalEpisodes: episodes,
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Training loop
  for (let episode = 0; episode < episodes; episode++) {
    metrics.episodesCompleted = episode + 1;
    let currentRow = start[0];
    let currentCol = start[1];
    let isTerminal = false;
    let steps = 0;

    // Prevent infinite loops
    const maxSteps = rows * cols * 2;

    while (!isTerminal && steps < maxSteps) {
      steps++;
      const currentStateKey = `${currentRow},${currentCol}`;

      // Epsilon-greedy action selection
      let action: number;
      const validActions: number[] = [];
      const qValuesCurrentState = qTable[currentStateKey] || {0:0, 1:0, 2:0, 3:0};
      let maxQValue = -Infinity;
      let bestActions: number[] = [];

      for (let a = 0; a < 4; a++) {
         const nextRow = currentRow + dx[a];
         const nextCol = currentCol + dy[a];
         if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols && !grid[nextRow][nextCol].isWall) {
             validActions.push(a);
             const qVal = qValuesCurrentState[a];
             if (qVal > maxQValue) {
                 maxQValue = qVal;
                 bestActions = [a];
             } else if (qVal === maxQValue) {
                 bestActions.push(a);
             }
         }
      }
      
      // Decide action
      if (validActions.length === 0) {
        // Indicate stuck state
        action = -1;
      } else if (Math.random() < epsilon) {
        // Exploration
        action = validActions[Math.floor(Math.random() * validActions.length)];
      } else {
        // Exploitation
        action = bestActions[Math.floor(Math.random() * bestActions.length)];
      }
      
      // If stuck, apply penalty and end episode
      if (action === -1) {
           isTerminal = true;
           continue;
      }

      // Take action, observe next state and reward
      const nextRow = currentRow + dx[action];
      const nextCol = currentCol + dy[action];
      const nextStateKey = `${nextRow},${nextCol}`;
      let reward = 0;
      
      // Check if next state is the goal
      if (nextRow === end[0] && nextCol === end[1]) {
        reward = rewardValue;
        isTerminal = true;
      } 
      // Check if next move leads to being stuck
      else { 
        const nextValidActions: number[] = [];
        for (let a = 0; a < 4; a++) {
             const r = nextRow + dx[a];
             const c = nextCol + dy[a];
             if (r >= 0 && r < rows && c >= 0 && c < cols && !grid[r][c].isWall) {
                nextValidActions.push(a);
             }
         }
         if (nextValidActions.length === 0 && !(nextRow === end[0] && nextCol === end[1])) {
             // Moved into a dead end state, Penalize reaching a dead end
             reward = stuckPenalty;
             isTerminal = true;
         }
      }
      
      // Find max Q value for next state
      let maxNextQValue = 0;
      if (!isTerminal && qTable[nextStateKey]) {
        maxNextQValue = Math.max(...Object.values(qTable[nextStateKey]));
      }
      
      const oldQValue = qTable[currentStateKey][action];
      const temporalDifference = reward + discountFactor * maxNextQValue - oldQValue;
      qTable[currentStateKey][action] = oldQValue + learningRate * temporalDifference;

      // Move to the next state
      currentRow = nextRow;
      currentCol = nextCol;
    }
    
    // Update UI progress
    if (episode % Math.max(1, Math.floor(episodes / 20)) === 0 || episode === episodes - 1) {
       onStep({
         grid: initialGrid,
         metrics: { ...metrics, qTable: { ...qTable } }
       });
       // Small delay for UI responsiveness
       await delay(1);
    }
  }

  metrics.qTable = qTable;
  metrics.executionTime = performance.now() - startTime;
  return metrics;
};

// Exploration using the learned Q-table
export const runQLearningExploration = async (
  initialGrid: MazeGrid,
  onStep: (step: AlgorithmStep) => void,
  qTable: QTable
): Promise<QLearningMetrics> => {
  console.log("Starting runQLearningExploration");
  const startTime = performance.now();
  const grid = cloneGrid(initialGrid);
  const { start, end } = findPositions(grid);
  const rows = grid.length;
  const cols = grid[0].length;

  // Initialize metrics
  const metrics: QLearningMetrics = {
    nodesVisited: 0,
    pathLength: 0,
    executionTime: 0,
    isPathFound: false,
    qTable: qTable,
    epsilonUsed: 0, discountFactorUsed: 0, learningRateUsed: 0,
    rewardValueUsed: 0, stuckPenaltyUsed: 0, episodesCompleted: 0, totalEpisodes: 0
  };

  let currentRow = start[0];
  let currentCol = start[1];
  const path: Array<[number, number]> = [[currentRow, currentCol]];
  const visitedInExploration = new Set<string>();
  visitedInExploration.add(`${currentRow},${currentCol}`);
  let steps = 0;
  const maxSteps = rows * cols * 2; 

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  while (steps < maxSteps) {
    steps++;
    metrics.nodesVisited++;
    const currentStateKey = `${currentRow},${currentCol}`;
    console.log(`[Exploration] Step ${steps}: At [${currentRow}, ${currentCol}]`); 

    // Check if goal reached
    if (currentRow === end[0] && currentCol === end[1]) {
      metrics.isPathFound = true;
      console.log("Goal reached!");
      break;
    }

    // Mark current cell as visited for visualization
    if (!grid[currentRow][currentCol].isStart && !grid[currentRow][currentCol].isEnd) {
      grid[currentRow][currentCol].isVisited = true;
      // Add log to confirm grid modification *before* cloning
      console.log(`Marked [${currentRow}, ${currentCol}] as visited. grid[${currentRow}][${currentCol}].isVisited = ${grid[currentRow][currentCol].isVisited}`); 
    }

    // Update UI
    console.log('Calling onStep...');
    onStep({
      grid: cloneGrid(grid),
      metrics: { ...metrics }
    });
    await delay(30);

    // Choose the best action greedily based on Q-table
    const qValues = qTable[currentStateKey] || {};
    let bestAction = -1;
    let maxQ = -Infinity;
    const validActions: number[] = [];
    let bestActionsList: number[] = [];
    
    let actionDetails = [];
    for(let a = 0; a < 4; a++) {
        const nextRow = currentRow + dx[a];
        const nextCol = currentCol + dy[a];
        if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols && !grid[nextRow][nextCol].isWall) {
            validActions.push(a); 
            const qVal = qValues[a] ?? 0; 
            actionDetails.push(`Action ${a}: Q=${qVal.toFixed(3)}`); 
            if(qVal > maxQ) {
                maxQ = qVal;

                // Start new list of best actions
                bestActionsList = [a];
            } else if (qVal === maxQ) {

                // Add to list of equally best actions
                bestActionsList.push(a);
            }
        }
    }
    console.log(`Q-Values for [${currentRow}, ${currentCol}]:`, qValues, ` Potential best actions are: ${actionDetails.join(', ')}`); 

    // Decide next step
    if (validActions.length === 0) {
        // Physically stuck, no valid moves
        console.log("Stuck: No valid actions."); 
        break; 
    } else {
        // If multiple actions have the same max Q-value, pick one randomly
        if (bestActionsList.length > 0) {
            bestAction = bestActionsList[Math.floor(Math.random() * bestActionsList.length)];
            console.log(`Chosen best action (highest Q, tie-broken): ${bestAction} (Q=${maxQ.toFixed(3)})`); 
        } else {
            // This shouldn't really happen but just in case
            bestAction = validActions[Math.floor(Math.random() * validActions.length)];
            console.log(`No preferred action (all <= -Inf?). Choosing random valid action: ${bestAction}`);
        }
        
        // Take the chosen action
        currentRow += dx[bestAction];
        currentCol += dy[bestAction];
        const nextStateKey = `${currentRow},${currentCol}`;

        // Check for loops *after* moving
        if (visitedInExploration.has(nextStateKey)) {
            console.log(`Loop detected upon entering [${currentRow}, ${currentCol}].`);
            break;
        }
        visitedInExploration.add(nextStateKey);
        path.push([currentRow, currentCol]);
    }
  }

  // Mark the final path followed
  for (const [r, c] of path) {
    if (!grid[r][c].isStart && !grid[r][c].isEnd) {
      grid[r][c].isPath = true;
    }
  }
  
  metrics.pathLength = path.length > 0 ? path.length - 1 : 0;
  metrics.executionTime = performance.now() - startTime;

  // Final UI update
  onStep({
    grid: cloneGrid(grid),
    metrics: { ...metrics }
  });

  return metrics;
}; 