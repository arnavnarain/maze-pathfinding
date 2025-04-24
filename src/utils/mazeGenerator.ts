export type Cell = {
  row: number;
  col: number;
  isWall: boolean;
  isStart: boolean;
  isEnd: boolean;
  isVisited: boolean;
  isPath: boolean;
};

export type MazeGrid = Cell[][];

// Direction vectors for moving in 4 directions
const dx = [-1, 0, 1, 0];
const dy = [0, 1, 0, -1];

// Generate a random maze with walls
export const generateMaze = (rows: number, cols: number): MazeGrid => {
  // Initialize grid
  const grid: MazeGrid = [];
  
  for (let i = 0; i < rows; i++) {
    const row: Cell[] = [];
    for (let j = 0; j < cols; j++) {
      row.push({
        row: i,
        col: j,
        isWall: true,
        isStart: false,
        isEnd: false,
        isVisited: false,
        isPath: false,
      });
    }
    grid.push(row);
  }

  // Pick random start point (must be on an odd coordinate)
  const startRow = 0;
  const startCol = 1;
  grid[startRow][startCol].isWall = false;
  grid[startRow][startCol].isStart = true;

  // Pick random end point (must be on the opposite side)
  const endRow = rows - 1;
  const endCol = cols - 2;
  grid[endRow][endCol].isWall = false;
  grid[endRow][endCol].isEnd = true;

  // Use recursive backtracking to generate the maze
  const visited: boolean[][] = Array(rows).fill(false).map(() => Array(cols).fill(false));
  
  // Carve paths with recursive backtracking
  const carvePath = (r: number, c: number) => {
    visited[r][c] = true;
    grid[r][c].isWall = false;

    // Shuffle directions to make the maze more random
    const directions = [0, 1, 2, 3];
    for (let i = 0; i < directions.length; i++) {
      const randIndex = Math.floor(Math.random() * directions.length);
      [directions[i], directions[randIndex]] = [directions[randIndex], directions[i]];
    }

    // Try each direction
    for (const dir of directions) {
      const nr = r + dx[dir] * 2;
      const nc = c + dy[dir] * 2;

      // Check if the new cell is valid and unvisited
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc]) {
        // Carve through the wall between current and new cell
        grid[r + dx[dir]][c + dy[dir]].isWall = false;
        carvePath(nr, nc);
      }
    }
  };

  // Start carving from a random cell
  const randomRow = 1;
  const randomCol = 1;
  carvePath(randomRow, randomCol);

  // Ensure there's a path from start to end
  ensurePathExists(grid, startRow, startCol, endRow, endCol);

  return grid;
};

// Ensure there's a path from start to end using BFS
const ensurePathExists = (grid: MazeGrid, startRow: number, startCol: number, endRow: number, endCol: number) => {
  const rows = grid.length;
  const cols = grid[0].length;
  const visited: boolean[][] = Array(rows).fill(false).map(() => Array(cols).fill(false));
  
  const queue: [number, number, number[][]][] = [];
  queue.push([startRow, startCol, [[startRow, startCol]]]);
  visited[startRow][startCol] = true;

  while (queue.length > 0) {
    const [r, c, path] = queue.shift()!;
    
    if (r === endRow && c === endCol) {
      for (const [pr, pc] of path) {
        grid[pr][pc].isWall = false;
      }
      return true;
    }

    for (let i = 0; i < 4; i++) {
      const nr = r + dx[i];
      const nc = c + dy[i];

      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].isWall && !visited[nr][nc]) {
        visited[nr][nc] = true;
        const newPath = [...path, [nr, nc]];
        queue.push([nr, nc, newPath]);
      }
    }
  }

  // If we can't find a path, create one
  if (!visited[endRow][endCol]) {
    let currentRow = startRow;
    let currentCol = startCol;

    // Create a simple path to the end
    while (currentRow !== endRow || currentCol !== endCol) {
      if (currentRow < endRow) {
        currentRow++;
      } else if (currentRow > endRow) {
        currentRow--;
      } else if (currentCol < endCol) {
        currentCol++;
      } else if (currentCol > endCol) {
        currentCol--;
      }

      grid[currentRow][currentCol].isWall = false;
    }
  }

  return false;
}; 