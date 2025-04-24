import React, { useState, useEffect } from 'react';
import { Cell, MazeGrid, generateMaze } from '../utils/mazeGenerator';
import { 
  AlgorithmMetrics, 
  AlgorithmStep, 
  runDFS, 
  runBFS, 
  runAStar, 
  runMonteCarlo,
  runMonteCarloExploration,
  MonteCarloMetrics,
  runQLearning,
  runQLearningExploration,
  QLearningMetrics,
  QTable
} from '../utils/algorithms';
import ValueFunctionViz from './ValueFunctionViz';
import QValueDisplay from './QValueDisplay';
import './Maze.css';

interface MazeProps {
  rows: number;
  cols: number;
}

type Algorithm = 'none' | 'dfs' | 'bfs' | 'astar' | 'montecarlo' | 'qlearning';

const Maze: React.FC<MazeProps> = ({ rows, cols }) => {
  const [maze, setMaze] = useState<MazeGrid>([]);
  const [algorithm, setAlgorithm] = useState<Algorithm>('none');
  const [isRunning, setIsRunning] = useState(false);
  const [metrics, setMetrics] = useState<AlgorithmMetrics | MonteCarloMetrics | QLearningMetrics | null>(null);
  const [valueFunction, setValueFunction] = useState<{ [key: string]: number }>({});
  const [valueFunctionHistory, setValueFunctionHistory] = useState<Array<{ [key: string]: number }>>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  
  // Monte Carlo / Q-Learning parameters
  const [episodes, setEpisodes] = useState<number | string>(100);
  const [epsilon, setEpisode] = useState<number>(0.1);
  const [discountFactor, setDiscountFactor] = useState<number>(0.9);
  const [monteCarloReward, setMonteCarloReward] = useState<number>(100);
  const [stuckPenalty, setStuckPenalty] = useState<number>(-1);
  const [isMonteCarloTrained, setIsMonteCarloTrained] = useState<boolean>(false);
  const [trainingProgress, setTrainingProgress] = useState<number>(0);
  const [totalEpisodesForViz, setTotalEpisodesForViz] = useState<number>(0);
  
  // Q-Learning state
  const [learningRate, setLearningRate] = useState<number>(0.1);
  const [qTable, setQTable] = useState<QTable | null>(null);
  const [isQLearningTrained, setIsQLearningTrained] = useState<boolean>(false);
  
  useEffect(() => {
    const newMaze = generateMaze(rows, cols);
    setMaze(newMaze);
    setMetrics(null);
    setValueFunction({});
    setValueFunctionHistory([]);
    setQTable(null);
    setSelectedCell(null);
    setIsMonteCarloTrained(false);
    setIsQLearningTrained(false);
    setTrainingProgress(0);
  }, [rows, cols]);

  const regenerateMaze = () => {
    const newMaze = generateMaze(rows, cols);
    setMaze(newMaze);
    setIsRunning(false);
    setMetrics(null);
    setValueFunction({});
    setValueFunctionHistory([]);
    setQTable(null);
    setSelectedCell(null);
    setIsMonteCarloTrained(false);
    setIsQLearningTrained(false);
    setTrainingProgress(0);
  };

  const getCellClassName = (cell: Cell) => {
    if (cell.isStart) return 'cell start';
    if (cell.isEnd) return 'cell end';
    if (cell.isPath) return 'cell path';
    if (cell.isVisited) return 'cell visited';
    return cell.isWall ? 'cell wall' : 'cell passage';
  };

  const handleAlgorithmStep = (step: AlgorithmStep) => {
    // Always update the grid to reflect the algorithm's current state
    setMaze(step.grid); 
    
    // Update metrics regardless of algorithm type
    setMetrics(step.metrics);
    
    // Handle specific metric updates based on type
    if (isMonteCarloMetrics(step.metrics)) {
      setValueFunction(step.metrics.valueFunction); 
      if (step.metrics.totalEpisodes > 0) {
        setTotalEpisodesForViz(step.metrics.totalEpisodes); 
      }
      if (!isMonteCarloTrained && step.metrics.episodesCompleted > 0) {
        const currentEpisodes = step.metrics.totalEpisodes > 0 ? step.metrics.totalEpisodes : 1;
        setTrainingProgress(Math.min(100, (step.metrics.episodesCompleted / currentEpisodes) * 100));
      }
    } else if (isQLearningMetrics(step.metrics) && !isQLearningTrained) {
       if (step.metrics.episodesCompleted > 0) {
          const currentEpisodes = step.metrics.totalEpisodes > 0 ? step.metrics.totalEpisodes : 1;
          setTrainingProgress(Math.min(100, (step.metrics.episodesCompleted / currentEpisodes) * 100));
       }
    }
  };

  const runAlgorithm = async () => {
    if (isRunning || algorithm === 'none') return;
    
    console.log('runAlgorithm called');

    setIsRunning(true);
    setMetrics(null);
    setSelectedCell(null); 
    
    if ((algorithm === 'montecarlo' && !isMonteCarloTrained) || (algorithm === 'qlearning' && !isQLearningTrained)) {
      setTrainingProgress(0); 
    }
    
    let finalMetricsResult: AlgorithmMetrics | MonteCarloMetrics | QLearningMetrics | null = null;
    try {
      const cleanMaze = maze.map(row => 
        row.map(cell => ({ ...cell, isVisited: false, isPath: false }))
      );

      // Set clean maze before running
      setMaze(cleanMaze);
      
      // Run the selected algorithm and store its direct return value
      switch (algorithm) {
        case 'dfs':
          finalMetricsResult = await runDFS(cleanMaze, handleAlgorithmStep);
          break;
        case 'bfs':
          finalMetricsResult = await runBFS(cleanMaze, handleAlgorithmStep);
          break;
        case 'astar':
          finalMetricsResult = await runAStar(cleanMaze, handleAlgorithmStep);
          break;
        case 'montecarlo':
          if (isMonteCarloTrained) {
            finalMetricsResult = await runMonteCarloExploration(cleanMaze, handleAlgorithmStep, valueFunction);
          } else {
            // Ensure episodes is a number before passing
            const validEpisodes = typeof episodes === 'number' ? episodes : 100;
            if (typeof episodes !== 'number') setEpisodes(validEpisodes); 

            const mcMetrics = await runMonteCarlo(
              cleanMaze, handleAlgorithmStep, 
              validEpisodes, 
              epsilon, discountFactor, monteCarloReward, stuckPenalty
            );
            // Set state for UI updates from training results
            setMetrics(mcMetrics); 
            setValueFunction(mcMetrics.valueFunction);
            setValueFunctionHistory(mcMetrics.valueFunctionHistory);
            setTotalEpisodesForViz(mcMetrics.totalEpisodes);
            setIsMonteCarloTrained(true);
            finalMetricsResult = mcMetrics;
          }
          break;
        case 'qlearning':
          if (isQLearningTrained && qTable) {
            console.log('Calling runQLearningExploration');
            finalMetricsResult = await runQLearningExploration(cleanMaze, handleAlgorithmStep, qTable);
             console.log('runQLearningExploration finished, result:', finalMetricsResult);
          } else {
             let validEpisodes = typeof episodes === 'number' && episodes > 0 ? episodes : 1000;
             if (typeof episodes !== 'number') setEpisodes(validEpisodes);
            
            const qlMetrics = await runQLearning(
              cleanMaze, handleAlgorithmStep, validEpisodes, epsilon,
              discountFactor, learningRate, monteCarloReward,
              stuckPenalty
            );
            setMetrics(qlMetrics);
            setQTable(qlMetrics.qTable); 
            setIsQLearningTrained(true);
            finalMetricsResult = qlMetrics;
          }
          break;
        default:
          console.log(`Algorithm ${algorithm} not implemented yet`);
          break;
      }
      if (finalMetricsResult) {
          setMetrics(finalMetricsResult);
      }
    } catch (error) {
      console.error("Error running algorithm:", error);
      setMetrics(null);
    } finally {
      setIsRunning(false);
       console.log('runAlgorithm finished'); 
       
       if (algorithm === 'qlearning' && isQLearningTrained && finalMetricsResult && isQLearningMetrics(finalMetricsResult) && !finalMetricsResult.isPathFound) {
           console.log("Path not found");
           setTimeout(() => {
             alert("Q-learning path finding did not reach the goal. Consider increasing the episode count for better training.");
           }, 0);
       } else if (algorithm === 'qlearning' && isQLearningTrained && finalMetricsResult && isQLearningMetrics(finalMetricsResult) && finalMetricsResult.isPathFound) {
           console.log("Path was found");
       }
    }
  };

  const handleAlgorithmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAlgo = e.target.value as Algorithm;
    setAlgorithm(newAlgo);
    setMetrics(null);
    setSelectedCell(null);
    if (newAlgo !== 'montecarlo') setIsMonteCarloTrained(false);
    if (newAlgo !== 'qlearning') setIsQLearningTrained(false);
    if (newAlgo !== 'qlearning') setQTable(null);
  };

  const formatTime = (ms: number): string => {
    return ms.toFixed(2) + ' ms';
  };

  const handleCellClick = (rowIdx: number, colIdx: number) => {
    if (!isRunning && !maze[rowIdx][colIdx].isWall) {
      if (algorithm === 'montecarlo' && isMonteCarloTrained) {
        setSelectedCell([rowIdx, colIdx]);
      } else if (algorithm === 'qlearning' && isQLearningTrained) {
        setSelectedCell([rowIdx, colIdx]);
      }
    }
  };

  // Check if metrics is a MonteCarloMetrics object
  const isMonteCarloMetrics = (m: any): m is MonteCarloMetrics => {
    return m && 'valueFunction' in m;
  };

  // Check if metrics is a QLearningMetrics object
  const isQLearningMetrics = (m: any): m is QLearningMetrics => {
    return m && 'qTable' in m;
  };

  // determine the text of the run button based on the algorithm and state
  const getRunButtonText = () => {
    if (isRunning) return 'Running...';
    if (algorithm === 'montecarlo') {
      return isMonteCarloTrained ? 'Run Path Finding' : 'Train Monte Carlo';
    }
    if (algorithm === 'qlearning') {
      return isQLearningTrained ? 'Run Path Finding' : 'Train Q-Learning';
    }
    return 'Run Algorithm';
  };

  return (
    <div className="maze-container">
      <div className="maze-controls">
        <button onClick={regenerateMaze} disabled={isRunning}>
          Generate New Maze
        </button>
      </div>
      <div className="maze-content">
        <div 
          className="maze-grid" 
          style={{ 
            gridTemplateColumns: `repeat(${cols}, 30px)`,
            gridTemplateRows: `repeat(${rows}, 30px)`
          }}
        >
          {maze.map((row, rowIdx) => 
            row.map((cell, colIdx) => (
              <div 
                key={`${rowIdx}-${colIdx}`} 
                className={getCellClassName(cell)}
                onClick={() => handleCellClick(rowIdx, colIdx)}
                style={
                  algorithm === 'montecarlo' && isMonteCarloTrained && isRunning && !cell.isWall && !cell.isStart && !cell.isEnd && !cell.isPath
                    ? {
                        backgroundColor: cell.isVisited 
                          ? 'lightblue' 
                          : `rgba(0, 255, 0, ${
                              valueFunction[`${rowIdx},${colIdx}`] / 
                              (Object.values(valueFunction).reduce((max, val) => Math.max(max, val), 0) || 1)
                            })`
                      }
                    : undefined
                }
              />
            ))
          )}
        </div>
        
        <div className="algorithm-panel">
          <h3>Algorithm Selection</h3>
          <div className="algorithm-control">
            <label htmlFor="algorithm">Choose algorithm:</label>
            <select 
              id="algorithm" 
              value={algorithm} 
              onChange={handleAlgorithmChange}
              disabled={isRunning}
            >
              <option value="none">Select an algorithm</option>
              <option value="dfs">Depth-First Search (DFS)</option>
              <option value="bfs">Breadth-First Search (BFS)</option>
              <option value="astar">A* Search</option>
              <option value="montecarlo">Monte Carlo</option>
              <option value="qlearning">Q-Learning</option>
            </select>
          </div>
          
          {algorithm === 'montecarlo' && !isMonteCarloTrained && (
            <div className="monte-carlo-params">
              <div className="param-control">
                <label htmlFor="episodes">Episodes:</label>
                <input 
                  type="text" 
                  id="episodes" 
                  value={episodes} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || !isNaN(Number(value))) {
                      setEpisodes(value === '' ? '' as any : Number(value));
                    }
                  }}
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="epsilon">Epsilon:</label>
                <input 
                  type="number" 
                  id="epsilon" 
                  value={epsilon} 
                  onChange={(e) => setEpisode(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.1)))}
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="discount">Discount Factor:</label>
                <input 
                  type="number" 
                  id="discount" 
                  value={discountFactor} 
                  onChange={(e) => setDiscountFactor(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.9)))}
                  min="0"
                  max="1"
                  step="0.1"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="reward">Goal Reward:</label>
                <input 
                  type="number" 
                  id="reward" 
                  value={monteCarloReward} 
                  onChange={(e) => setMonteCarloReward(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  step="1"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="penalty">Stuck Penalty:</label>
                <input 
                  type="number" 
                  id="penalty" 
                  value={stuckPenalty} 
                  onChange={(e) => setStuckPenalty(Math.min(0, parseInt(e.target.value) || 0))}
                  max="0" 
                  step="1"
                  disabled={isRunning}
                />
              </div>
              
              {isRunning && algorithm === 'montecarlo' && (
                <div className="training-progress">
                  <label>Training Progress:</label>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${trainingProgress}%` }}
                    ></div>
                  </div>
                  <div className="progress-percentage">{Math.round(trainingProgress)}%</div>
                </div>
              )}
            </div>
          )}
          
          {algorithm === 'qlearning' && !isQLearningTrained && (
            <div className="qlearning-params">
              <div className="param-control">
                <label htmlFor="episodes">Episodes:</label>
                <input 
                  type="text" 
                  id="episodes" 
                  value={episodes} 
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || !isNaN(Number(value))) {
                      setEpisodes(value === '' ? '' as any : Number(value));
                    }
                  }}
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="epsilon">Epsilon (Exploration Rate):</label>
                <input 
                  type="number" 
                  id="epsilon" 
                  value={epsilon} 
                  onChange={(e) => setEpisode(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.1)))}
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="discount">Discount Factor (Gamma):</label>
                <input 
                  type="number" 
                  id="discount" 
                  value={discountFactor} 
                  onChange={(e) => setDiscountFactor(Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.9)))}
                  min="0"
                  max="1"
                  step="0.05"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="learningRate">Learning Rate (Alpha):</label>
                <input 
                  type="number" 
                  id="learningRate" 
                  value={learningRate} 
                  onChange={(e) => setLearningRate(Math.max(0.01, Math.min(1, parseFloat(e.target.value) || 0.1)))}
                  min="0.01"
                  max="1"
                  step="0.01"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="reward">Goal Reward:</label>
                <input 
                  type="number" 
                  id="reward" 
                  value={monteCarloReward} 
                  onChange={(e) => setMonteCarloReward(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  step="1"
                  disabled={isRunning}
                />
              </div>
              <div className="param-control">
                <label htmlFor="penalty">Stuck Penalty:</label>
                <input 
                  type="number" 
                  id="penalty" 
                  value={stuckPenalty} 
                  onChange={(e) => setStuckPenalty(Math.min(0, parseInt(e.target.value) || 0))}
                  max="0" 
                  step="1"
                  disabled={isRunning}
                />
              </div>
              
              {isRunning && algorithm === 'qlearning' && (
                <div className="training-progress">
                  <label>Training Progress:</label>
                  <div className="progress-bar-container">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${trainingProgress}%` }}
                    ></div>
                  </div>
                  <div className="progress-percentage">{Math.round(trainingProgress)}%</div>
                </div>
              )}
            </div>
          )}
          
          <button 
            onClick={runAlgorithm} 
            disabled={isRunning || algorithm === 'none'}
            className="run-button"
          >
            {getRunButtonText()}
          </button>
          
          {algorithm === 'montecarlo' && isMonteCarloTrained && (
            <div className="monte-carlo-info">
              <p className="cell-click-instruction">
                Click on a cell to see its value function progression
              </p>
              
              <ValueFunctionViz 
                valueFunction={valueFunction}
                valueFunctionHistory={valueFunctionHistory}
                selectedCell={selectedCell}
              />
            </div>
          )}
          
          {algorithm === 'qlearning' && isQLearningTrained && qTable && (
            <QValueDisplay 
              selectedCell={selectedCell}
              qTable={qTable}
            />
          )}
          
          {metrics && (
            <div className="metrics-panel">
              <h4>Metrics</h4>
              <div className="metrics-grid">
                <div className="metric">
                  <span className="metric-label">Nodes Visited:</span>
                  <span className="metric-value">{metrics.nodesVisited}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Path Length:</span>
                  <span className="metric-value">
                    {metrics.isPathFound ? metrics.pathLength : 'N/A'}
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">Execution Time:</span>
                  <span className="metric-value">{formatTime(metrics.executionTime)}</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Path Found:</span>
                  <span className="metric-value">{metrics.isPathFound ? 'Yes' : 'No'}</span>
                </div>
                
                {/* Monte Carlo specific metrics */}
                {isMonteCarloMetrics(metrics) && (
                  <>
                    <div className="metric">
                      <span className="metric-label">Episodes:</span>
                      <span className="metric-value">{metrics.episodesCompleted}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Epsilon:</span>
                      <span className="metric-value">{metrics.epsilonUsed.toFixed(2)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Discount Factor:</span>
                      <span className="metric-value">{metrics.discountFactorUsed.toFixed(2)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Goal Reward Used:</span>
                      <span className="metric-value">{metrics.rewardValueUsed}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Stuck Penalty Used:</span>
                      <span className="metric-value">{metrics.stuckPenaltyUsed}</span>
                    </div>
                  </>
                )}
                
                {isQLearningMetrics(metrics) && (
                  <>
                    <div className="metric">
                      <span className="metric-label">Episodes:</span>
                      <span className="metric-value">{metrics.episodesCompleted}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Epsilon Used:</span>
                      <span className="metric-value">{metrics.epsilonUsed.toFixed(2)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Discount Factor:</span>
                      <span className="metric-value">{metrics.discountFactorUsed.toFixed(2)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Learning Rate:</span>
                      <span className="metric-value">{metrics.learningRateUsed.toFixed(2)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Goal Reward:</span>
                      <span className="metric-value">{metrics.rewardValueUsed}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Stuck Penalty:</span>
                      <span className="metric-value">{metrics.stuckPenaltyUsed}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <div className="algorithm-info">
            {algorithm !== 'none' && (
              <div className="algorithm-description">
                <h4>{algorithm.toUpperCase()} Algorithm</h4>
                <p>
                  {algorithm === 'dfs' && 'Explores as far as possible along each branch before backtracking.'}
                  {algorithm === 'bfs' && 'Explores all neighbor nodes at the present depth before moving to nodes at the next depth level.'}
                  {algorithm === 'astar' && 'Uses Manhattan distance heuristic to efficiently find the shortest path by prioritizing cells that are likely to lead to the goal.'}
                  {algorithm === 'montecarlo' && 'Learns the optimal path by exploring the environment through random sampling and updating value estimates based on experienced returns.'}
                  {algorithm === 'qlearning' && 'A reinforcement learning approach that learns from experience to find optimal paths.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Maze; 