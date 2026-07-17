/**
 * Minimax with Alpha-Beta Pruning implementation for Tic-Tac-Toe.
 * Includes search visualization metrics and difficulty settings.
 */

const WIN_PATTERNS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

let nodesEvaluated = 0;

/**
 * Check if the board is in a terminal state.
 * @param {Array} board - 9-element array
 * @returns {string|null} 'X', 'O', 'draw', or null
 */
function checkWinner(board) {
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const [a, b, c] = WIN_PATTERNS[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== null)) {
    return 'draw';
  }
  return null;
}

/**
 * Heuristic evaluation function for non-terminal states at search depth limits.
 * Calculates score from AI perspective: positive is good for AI, negative is good for human.
 */
function evaluateHeuristic(board, aiSymbol, humanSymbol) {
  let score = 0;
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const [a, b, c] = WIN_PATTERNS[i];
    const cells = [board[a], board[b], board[c]];
    const aiCount = cells.filter(cell => cell === aiSymbol).length;
    const humanCount = cells.filter(cell => cell === humanSymbol).length;
    const emptyCount = cells.filter(cell => cell === null).length;

    // AI potential
    if (aiCount === 2 && emptyCount === 1) score += 3;
    else if (aiCount === 1 && emptyCount === 2) score += 1;

    // Human potential (must be counteracted)
    if (humanCount === 2 && emptyCount === 1) score -= 3;
    else if (humanCount === 1 && emptyCount === 2) score -= 1;
  }
  return score;
}

/**
 * Core minimax search function with Alpha-Beta Pruning.
 */
function minimax(board, depth, alpha, beta, isMaximizing, aiSymbol, humanSymbol, maxDepth) {
  nodesEvaluated++;

  const winner = checkWinner(board);
  if (winner === aiSymbol) return 10 - depth;
  if (winner === humanSymbol) return -10 + depth;
  if (winner === 'draw') return 0;

  // Depth limit reached (used for Easy/Medium difficulties)
  if (depth >= maxDepth) {
    return evaluateHeuristic(board, aiSymbol, humanSymbol);
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = aiSymbol;
        let evaluation = minimax(board, depth + 1, alpha, beta, false, aiSymbol, humanSymbol, maxDepth);
        board[i] = null;
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break; // Beta cut-off
      }
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] === null) {
        board[i] = humanSymbol;
        let evaluation = minimax(board, depth + 1, alpha, beta, true, aiSymbol, humanSymbol, maxDepth);
        board[i] = null;
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break; // Alpha cut-off
      }
    }
    return minEval;
  }
}

/**
 * Get the best move for the AI, along with cell evaluations for the visualizer.
 * @param {Array} board - Current board state
 * @param {string} aiSymbol - 'X' or 'O'
 * @param {string} humanSymbol - 'X' or 'O'
 * @param {string} difficulty - 'easy', 'medium', or 'unbeatable'
 * @returns {Object} { bestMove: number, cellEvaluations: Array, nodesSearched: number }
 */
function getBestMove(board, aiSymbol, humanSymbol, difficulty) {
  nodesEvaluated = 0;
  
  // Set depth limit based on difficulty
  let maxDepth = 9; // Unbeatable default
  if (difficulty === 'easy') maxDepth = 1;
  else if (difficulty === 'medium') maxDepth = 2;

  const cellEvaluations = Array(9).fill(null);
  const availableMoves = [];

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      availableMoves.push(i);
      
      // Simulate move
      board[i] = aiSymbol;
      
      // We always run minimax with alpha=-Infinity, beta=Infinity
      // The first move starts as minimizing search for player
      const evalScore = minimax(board, 0, -Infinity, Infinity, false, aiSymbol, humanSymbol, maxDepth);
      board[i] = null;
      
      cellEvaluations[i] = evalScore;
    }
  }

  // Easy mode: 40% chance of making a completely random move
  if (difficulty === 'easy' && Math.random() < 0.4 && availableMoves.length > 0) {
    const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    return {
      bestMove: randomMove,
      cellEvaluations,
      nodesSearched: nodesEvaluated
    };
  }

  // Medium mode: 15% chance of making a random move to simulate human error
  if (difficulty === 'medium' && Math.random() < 0.15 && availableMoves.length > 0) {
    const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
    return {
      bestMove: randomMove,
      cellEvaluations,
      nodesSearched: nodesEvaluated
    };
  }

  // Otherwise, select the move with the highest evaluation score
  let bestScore = -Infinity;
  let bestMoves = [];

  for (let i = 0; i < 9; i++) {
    if (cellEvaluations[i] !== null) {
      if (cellEvaluations[i] > bestScore) {
        bestScore = cellEvaluations[i];
        bestMoves = [i];
      } else if (cellEvaluations[i] === bestScore) {
        bestMoves.push(i);
      }
    }
  }

  // If multiple moves share the same best score, choose one randomly
  const bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

  return {
    bestMove,
    cellEvaluations,
    nodesSearched: nodesEvaluated
  };
}

// Export for module/script access
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkWinner, getBestMove, evaluateHeuristic, WIN_PATTERNS };
}
