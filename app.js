/**
 * Nexus Tactics - Tic-Tac-Toe AI Game Logic
 * Manages game state, user interactions, audio synthesis, and minimax search reporting.
 */

// --- Global State ---
let board = Array(9).fill(null);
let humanSymbol = 'X';
let aiSymbol = 'O';
let isHumanTurn = true;
let gameActive = true;
let difficulty = 'unbeatable';
let soundEnabled = true;
let visualizerEnabled = true;

// Match history and statistics
let stats = { human: 0, draws: 0, ai: 0 };
let matchHistory = [];
let boardStates = []; // Stack of { board: Array, isHumanTurn: boolean } for Undo

// --- Audio Synthesizer (Web Audio API) ---
const soundEffects = {
  ctx: null,
  
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playClick(isAI = false) {
    if (!soundEnabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    if (isAI) {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, this.ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    }
  },

  playWin() {
    if (!soundEnabled) return;
    this.init();
    
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (major arpeggio)
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.08 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.5);
    });
  },

  playLoss() {
    if (!soundEnabled) return;
    this.init();
    
    const now = this.ctx.currentTime;
    const notes = [311.13, 261.63, 196.00]; // Eb4, C4, G3 (descending dark minor chord)
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, now);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.14 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.5);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.55);
    });
  },

  playDraw() {
    if (!soundEnabled) return;
    this.init();
    
    const now = this.ctx.currentTime;
    const notes = [440, 392, 349.23]; // A4, G4, F4 (soft melancholic resolution)
    
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.4);
    });
  },

  playError() {
    if (!soundEnabled) return;
    this.init();
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
};

// Winning line rendering mapping
const LINE_COORDINATES = {
  '0,1,2': { x1: 15, y1: 50, x2: 285, y2: 50 },
  '3,4,5': { x1: 15, y1: 150, x2: 285, y2: 150 },
  '6,7,8': { x1: 15, y1: 250, x2: 285, y2: 250 },
  '0,3,6': { x1: 50, y1: 15, x2: 50, y2: 285 },
  '1,4,7': { x1: 150, y1: 15, x2: 150, y2: 285 },
  '2,5,8': { x1: 250, y1: 15, x2: 250, y2: 285 },
  '0,4,8': { x1: 20, y1: 20, x2: 280, y2: 280 },
  '2,4,6': { x1: 280, y1: 20, x2: 20, y2: 280 }
};

// --- DOM References ---
const cells = document.querySelectorAll('.cell');
const boardElement = document.getElementById('game-board');
const turnAnnouncer = document.getElementById('turn-announcer');
const turnText = document.getElementById('turn-text');
const pulseIndicator = turnAnnouncer.querySelector('.pulse-indicator');
const undoBtn = document.getElementById('undo-btn');
const restartBtn = document.getElementById('restart-btn');
const resetStatsBtn = document.getElementById('reset-stats-btn');
const difficultySelect = document.getElementById('difficulty-select');
const sideBtns = document.querySelectorAll('.side-btn');
const visualizerToggle = document.getElementById('visualizer-toggle');
const soundToggle = document.getElementById('sound-toggle');
const themeToggle = document.getElementById('theme-toggle');

// Scoreboard Elements
const humanScoreEl = document.getElementById('stat-human-score');
const drawsScoreEl = document.getElementById('stat-draws-score');
const aiScoreEl = document.getElementById('stat-ai-score');

// Analytics elements
const metricNodesEl = document.getElementById('metric-nodes');
const metricTimeEl = document.getElementById('metric-time');
const metricHeuristicEl = document.getElementById('metric-heuristic');
const aiThoughtLogEl = document.getElementById('ai-thought-log');
const historyBodyEl = document.getElementById('history-body');

// Winning Line elements
const winLineSvg = document.getElementById('win-line-svg');
const winLine = document.getElementById('win-line');

// --- Initialization ---
function initApp() {
  loadData();
  setupEventListeners();
  resetGame();
  renderScoreboard();
  renderHistory();
}

// Load configurations and score from LocalStorage
function loadData() {
  const savedStats = localStorage.getItem('nexus_stats');
  if (savedStats) stats = JSON.parse(savedStats);

  const savedHistory = localStorage.getItem('nexus_history');
  if (savedHistory) matchHistory = JSON.parse(savedHistory);

  const savedDifficulty = localStorage.getItem('nexus_difficulty');
  if (savedDifficulty) {
    difficulty = savedDifficulty;
    difficultySelect.value = difficulty;
  }

  const savedSide = localStorage.getItem('nexus_human_side');
  if (savedSide) {
    humanSymbol = savedSide;
    aiSymbol = humanSymbol === 'X' ? 'O' : 'X';
    sideBtns.forEach(btn => {
      if (btn.dataset.side === humanSymbol) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  const savedSound = localStorage.getItem('nexus_sound');
  if (savedSound !== null) {
    soundEnabled = savedSound === 'true';
    updateSoundButtonUI();
  }

  const savedVisualizer = localStorage.getItem('nexus_visualizer');
  if (savedVisualizer !== null) {
    visualizerEnabled = savedVisualizer === 'true';
    visualizerToggle.checked = visualizerEnabled;
    updateVisualizerUI();
  }
}

// Set up DOM interaction event listeners
function setupEventListeners() {
  cells.forEach(cell => {
    cell.addEventListener('click', handleCellClick);
    cell.addEventListener('mouseenter', handleCellMouseEnter);
    cell.addEventListener('mouseleave', handleCellMouseLeave);
  });

  restartBtn.addEventListener('click', () => {
    soundEffects.playClick();
    resetGame();
  });

  undoBtn.addEventListener('click', handleUndo);

  resetStatsBtn.addEventListener('click', () => {
    soundEffects.playClick();
    stats = { human: 0, draws: 0, ai: 0 };
    matchHistory = [];
    localStorage.setItem('nexus_stats', JSON.stringify(stats));
    localStorage.setItem('nexus_history', JSON.stringify(matchHistory));
    renderScoreboard();
    renderHistory();
  });

  difficultySelect.addEventListener('change', (e) => {
    soundEffects.playClick();
    difficulty = e.target.value;
    localStorage.setItem('nexus_difficulty', difficulty);
    aiThoughtLogEl.textContent = `Difficulty tuned to: ${difficulty.toUpperCase()}.`;
    
    // Recalculate cell badges if visualizer is open
    if (gameActive && isHumanTurn) {
      calculateAndShowMinimaxScores();
    }
  });

  sideBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      soundEffects.playClick();
      const chosenSide = btn.dataset.side;
      if (chosenSide === humanSymbol) return;

      sideBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      humanSymbol = chosenSide;
      aiSymbol = humanSymbol === 'X' ? 'O' : 'X';
      localStorage.setItem('nexus_human_side', humanSymbol);

      resetGame();
    });
  });

  visualizerToggle.addEventListener('change', (e) => {
    soundEffects.playClick();
    visualizerEnabled = e.target.checked;
    localStorage.setItem('nexus_visualizer', visualizerEnabled);
    updateVisualizerUI();
    if (visualizerEnabled && gameActive && isHumanTurn) {
      calculateAndShowMinimaxScores();
    }
  });

  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem('nexus_sound', soundEnabled);
    updateSoundButtonUI();
    // Play test click if sound just enabled
    if (soundEnabled) {
      soundEffects.init();
      soundEffects.playClick();
    }
  });

  themeToggle.addEventListener('click', () => {
    soundEffects.playClick();
    document.body.classList.toggle('theme-light');
    const isLight = document.body.classList.contains('theme-light');
    localStorage.setItem('nexus_theme', isLight ? 'light' : 'dark');
  });

  // Restore saved theme
  const savedTheme = localStorage.getItem('nexus_theme');
  if (savedTheme === 'light') {
    document.body.classList.add('theme-light');
  }
}

// Update sound toggle icon
function updateSoundButtonUI() {
  if (soundEnabled) {
    soundToggle.classList.add('active');
    soundToggle.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>
    `;
  } else {
    soundToggle.classList.remove('active');
    soundToggle.innerHTML = `
      <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>
    `;
  }
}

// Update board visualizer css activation
function updateVisualizerUI() {
  if (visualizerEnabled) {
    boardElement.classList.add('visualizer-active');
  } else {
    boardElement.classList.remove('visualizer-active');
    // Clear existing badges
    const badges = document.querySelectorAll('.minimax-badge');
    badges.forEach(b => b.remove());
  }
}

// --- Game Flow Methods ---
function resetGame() {
  board = Array(9).fill(null);
  boardStates = [];
  gameActive = true;
  winLineSvg.style.display = 'none';
  
  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
    // Remove any badges
    const badge = cell.querySelector('.minimax-badge');
    if (badge) badge.remove();
  });

  isHumanTurn = (humanSymbol === 'X');
  updateTurnAnnouncer();
  updateUndoButton();

  // Reset metrics
  metricNodesEl.textContent = '0';
  metricTimeEl.textContent = '0.0 ms';
  metricHeuristicEl.textContent = '-';

  if (!isHumanTurn) {
    aiThoughtLogEl.textContent = `Nexus AI preparing first strike as ${aiSymbol}...`;
    makeAIMoveDelayed();
  } else {
    aiThoughtLogEl.textContent = `Nexus AI online. Your move as ${humanSymbol}.`;
    calculateAndShowMinimaxScores();
  }
}

function updateTurnAnnouncer() {
  if (!gameActive) return;
  
  if (isHumanTurn) {
    turnText.textContent = `Your Turn (${humanSymbol})`;
    pulseIndicator.className = `pulse-indicator ${humanSymbol === 'X' ? 'glow-blue' : 'glow-pink'}`;
  } else {
    turnText.textContent = `AI is thinking (${aiSymbol})...`;
    pulseIndicator.className = `pulse-indicator ${aiSymbol === 'X' ? 'glow-blue' : 'glow-pink'}`;
  }
}

function updateUndoButton() {
  // If AI goes first (Human = O), and human hasn't played yet, there are no states human can undo to.
  // Undo works by undoing both AI move and human move, meaning we need at least 2 saved states (if human is X)
  // or at least 2 saved states (if human is O, we revert to the board state right after AI's first move).
  if (!gameActive) {
    undoBtn.disabled = boardStates.length === 0;
  } else {
    if (humanSymbol === 'X') {
      undoBtn.disabled = boardStates.length < 2; // need human move + AI response to undo both
    } else {
      // AI went first. The 1st state in stack is AI's 1st move.
      // Human must make at least 1 move (generating states index 1: human move, index 2: AI response).
      // So we need at least 3 states to undo (reverting to index 0: AI's first move).
      undoBtn.disabled = boardStates.length < 3;
    }
  }
}

// Hover previews
function handleCellMouseEnter(e) {
  if (!gameActive || !isHumanTurn) return;
  const cell = e.target;
  const index = parseInt(cell.dataset.index);
  
  if (board[index] === null) {
    cell.classList.add(humanSymbol === 'X' ? 'hover-x' : 'hover-o');
  }
}

function handleCellMouseLeave(e) {
  const cell = e.target;
  cell.classList.remove('hover-x', 'hover-o');
}

// User Move click handler
function handleCellClick(e) {
  const cell = e.target;
  const index = parseInt(cell.dataset.index);

  if (!gameActive || !isHumanTurn || board[index] !== null) {
    if (board[index] !== null && gameActive) {
      soundEffects.playError();
    }
    return;
  }

  // Clear hover guides
  cell.classList.remove('hover-x', 'hover-o');

  // Push state before action
  saveState();

  // Execute move
  board[index] = humanSymbol;
  cell.textContent = humanSymbol;
  cell.classList.add(humanSymbol === 'X' ? 'x-cell' : 'o-cell');
  
  soundEffects.playClick(false);
  
  // Remove temporary badge evaluations
  const badges = document.querySelectorAll('.minimax-badge');
  badges.forEach(b => b.remove());

  // Check Game Ending
  if (checkGameEnd()) return;

  // Switch Turn
  isHumanTurn = false;
  updateTurnAnnouncer();
  updateUndoButton();
  
  // Trigger AI Response
  makeAIMoveDelayed();
}

// AI Turn Execution (with delayed response to feel natural)
function makeAIMoveDelayed() {
  aiThoughtLogEl.textContent = `Analyzing game tree... searching optimal paths.`;
  
  // Pulse turn announcer glow
  pulseIndicator.classList.add('thinking-pulse');

  setTimeout(() => {
    if (!gameActive) return;

    const startTime = performance.now();
    const result = getBestMove(board, aiSymbol, humanSymbol, difficulty);
    const endTime = performance.now();
    
    const timeTaken = (endTime - startTime).toFixed(2);
    
    // Execute AI Move
    const aiMove = result.bestMove;
    if (aiMove !== undefined && aiMove !== null && board[aiMove] === null) {
      // Save state before AI plays
      saveState();

      board[aiMove] = aiSymbol;
      
      const targetCell = document.getElementById(`board-cell-${aiMove}`);
      targetCell.textContent = aiSymbol;
      targetCell.classList.add(aiSymbol === 'X' ? 'x-cell' : 'o-cell');
      
      soundEffects.playClick(true);
      
      // Update stats reports
      metricNodesEl.textContent = result.nodesSearched.toLocaleString();
      metricTimeEl.textContent = `${timeTaken} ms`;
      
      // Update thought descriptions based on evaluations
      updateEngineLog(result, aiMove);

      if (checkGameEnd()) return;

      // Swap Turn back
      isHumanTurn = true;
      updateTurnAnnouncer();
      updateUndoButton();
      
      // Recalculate Visualizer badges for available human moves
      calculateAndShowMinimaxScores();
    }
  }, 600); // 600ms delays gives a comfortable "thinking" feeling
}

// Populate the log with game theory commentary
function updateEngineLog(result, movePlayed) {
  const score = result.cellEvaluations[movePlayed];
  metricHeuristicEl.textContent = score !== null ? score : '-';

  let logMsg = '';
  if (difficulty === 'unbeatable') {
    if (score > 0) {
      logMsg = `Target locked. Nexus AI predicts forced win in ${10 - score} moves. Placed ${aiSymbol} at sq ${movePlayed + 1}.`;
    } else if (score < 0) {
      logMsg = `Defensive correction. AI block forced at sq ${movePlayed + 1} (Score: ${score}).`;
    } else {
      logMsg = `Optimal branch detected. Placed ${aiSymbol} at sq ${movePlayed + 1} to maintain draw equilibrium.`;
    }
  } else {
    logMsg = `${difficulty.toUpperCase()} Agent placed ${aiSymbol} at sq ${movePlayed + 1} after scanning ${result.nodesSearched} nodes.`;
  }
  aiThoughtLogEl.textContent = logMsg;
}

// Compute future paths to draw badges overlay inside cell elements
function calculateAndShowMinimaxScores() {
  if (!visualizerEnabled || !gameActive || !isHumanTurn) return;

  // Clear existing badges
  const existingBadges = document.querySelectorAll('.minimax-badge');
  existingBadges.forEach(b => b.remove());

  // Run a dry minimax scan from the current board state but from AI's perspective
  // Wait, let's evaluate cells relative to the HUMAN'S potential score if they place their mark there!
  // To make it educational, we simulate placing the Human's symbol in each empty slot,
  // and run minimax to see what score that cell receives.
  // - High positive score (X wins/favored)
  // - Negative score (O wins/favored)
  // - 0 (Draw)
  
  // Let's run a dry calculation. Since human plays next:
  // For each empty square, simulate human move, then run minimax with AI playing next.
  // This tells us the minimax value of that branch!
  
  // Set depth limit based on difficulty to show what the active agent is actually calculating!
  let maxDepth = 9;
  if (difficulty === 'easy') maxDepth = 1;
  else if (difficulty === 'medium') maxDepth = 2;

  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = humanSymbol;
      // Human has moved. Next search node is AI's turn (Maximizing AI score, so isMaximizing = true)
      const val = minimax(board, 0, -Infinity, Infinity, (aiSymbol === 'X'), aiSymbol, humanSymbol, maxDepth);
      board[i] = null;

      // Draw badge in cell i
      const cellElement = document.getElementById(`board-cell-${i}`);
      const badge = document.createElement('span');
      badge.className = 'minimax-badge';
      
      // Format score relative to who is playing.
      // Let's make it intuitive: if the result favors human, show +val, if draw show 0, if AI show -val.
      // Minimax scores: AI wins = positive (+10 to +2), Human wins = negative (-10 to -2)
      // Let's display:
      // - If val < 0: Human wins. Show positive value (e.g. "+Win" or "+8") to show it's GOOD for Human!
      // - If val > 0: AI wins. Show negative value (e.g. "-10" or "AI Win") showing it's BAD for Human.
      // - If val === 0: Show "0" (Draw).
      // Let's refine:
      if (val < 0) {
        // Good for human
        badge.textContent = `+${Math.abs(val)}`;
        badge.classList.add('score-positive'); // Green
      } else if (val > 0) {
        // Good for AI
        badge.textContent = `-${val}`;
        badge.classList.add('score-negative'); // Red
      } else {
        badge.textContent = '0';
        badge.classList.add('score-neutral'); // Grey
      }
      
      cellElement.appendChild(badge);
    }
  }
}

// --- Game Ending Detection ---
function checkGameEnd() {
  const winner = checkWinner(board);
  if (!winner) return false;

  gameActive = false;
  pulseIndicator.className = 'pulse-indicator'; // Remove pulse

  if (winner === 'draw') {
    stats.draws++;
    soundEffects.playDraw();
    turnText.textContent = "Match resolved: Draw Equilibrium";
    aiThoughtLogEl.textContent = "Search complete. Game tree resolved to a draw (0 utility).";
    logMatch('Draw', board.filter(c => c !== null).length);
  } else if (winner === humanSymbol) {
    stats.human++;
    soundEffects.playWin();
    turnText.textContent = "Match resolved: You Defeated AI!";
    aiThoughtLogEl.textContent = "System Alert: Suboptimal path executed. Human victory detected.";
    triggerWinOverlay(winner);
    logMatch('Human Win', board.filter(c => c !== null).length);
  } else {
    stats.ai++;
    soundEffects.playLoss();
    turnText.textContent = "Match resolved: AI Dominance";
    aiThoughtLogEl.textContent = "Search complete. AI reached optimal terminal state. Win secured.";
    triggerWinOverlay(winner);
    logMatch('AI Win', board.filter(c => c !== null).length);
  }

  // Update localStorage and UI elements
  localStorage.setItem('nexus_stats', JSON.stringify(stats));
  renderScoreboard();
  updateUndoButton();
  return true;
}

// Stroke winning cells and overlay strike svg line
function triggerWinOverlay(winnerSymbol) {
  // Find which pattern won
  let winningPattern = null;
  for (let i = 0; i < WIN_PATTERNS.length; i++) {
    const [a, b, c] = WIN_PATTERNS[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      winningPattern = WIN_PATTERNS[i];
      break;
    }
  }

  if (winningPattern) {
    // Add glow styles to cells
    winningPattern.forEach(idx => {
      document.getElementById(`board-cell-${idx}`).classList.add('winner-cell');
    });

    // Draw SVG Line
    const key = winningPattern.join(',');
    const coords = LINE_COORDINATES[key];
    if (coords) {
      winLine.setAttribute('x1', coords.x1);
      winLine.setAttribute('y1', coords.y1);
      winLine.setAttribute('x2', coords.x2);
      winLine.setAttribute('y2', coords.y2);
      
      // Match line color with winner glow
      const winColor = winnerSymbol === humanSymbol ? 'var(--color-x)' : 'var(--color-o)';
      winLine.setAttribute('stroke', winColor);
      
      // Animate line
      winLineSvg.style.display = 'block';
    }
  }
}

// Log history records
function logMatch(outcome, movesCount) {
  const matchNum = matchHistory.length + 1;
  const record = {
    id: matchNum,
    outcome: outcome,
    difficulty: difficulty,
    moves: movesCount
  };
  
  matchHistory.unshift(record); // Prepend to show latest first
  if (matchHistory.length > 10) matchHistory.pop(); // Cap at 10 items
  
  localStorage.setItem('nexus_history', JSON.stringify(matchHistory));
  renderHistory();
}

function renderScoreboard() {
  humanScoreEl.textContent = stats.human;
  drawsScoreEl.textContent = stats.draws;
  aiScoreEl.textContent = stats.ai;
}

function renderHistory() {
  if (matchHistory.length === 0) {
    historyBodyEl.innerHTML = `
      <tr class="no-history">
        <td colspan="4">No battles logged yet</td>
      </tr>
    `;
    return;
  }

  historyBodyEl.innerHTML = matchHistory.map(match => {
    let outcomeClass = 'history-draw';
    if (match.outcome === 'Human Win') outcomeClass = 'history-win';
    else if (match.outcome === 'AI Win') outcomeClass = 'history-loss';
    
    return `
      <tr>
        <td>#${match.id}</td>
        <td class="${outcomeClass}">${match.outcome}</td>
        <td class="capitalize">${match.difficulty}</td>
        <td>${match.moves} moves</td>
      </tr>
    `;
  }).join('');
}

// --- State Undo Stack Handling ---
function saveState() {
  // Push copy of board and turn
  boardStates.push({
    board: [...board],
    isHumanTurn: isHumanTurn
  });
}

function handleUndo() {
  if (boardStates.length === 0) return;
  soundEffects.playClick();

  // If game has ended, human can undo last moves to continue playing
  // We pop the states stack to reverse
  if (!gameActive) {
    gameActive = true;
    winLineSvg.style.display = 'none';
    cells.forEach(c => c.classList.remove('winner-cell'));
  }

  // To undo a human move, we also need to undo the AI's response (which followed it).
  // So we pop twice.
  // 1. Pop AI response
  // 2. Pop Human move (to restore state before human click)
  
  if (boardStates.length >= 2) {
    // Pop twice
    boardStates.pop(); // Remove AI move state
    const previousState = boardStates.pop(); // Remove human move state (we restore to what was BEFORE human clicked)
    
    board = previousState.board;
    isHumanTurn = previousState.isHumanTurn;
  } else if (boardStates.length === 1 && humanSymbol === 'X') {
    // Human went first, made 1 move, and is undoing it (no AI move yet)
    const previousState = boardStates.pop();
    board = previousState.board;
    isHumanTurn = previousState.isHumanTurn;
  }

  // Synchronize board UI
  board.forEach((val, idx) => {
    const cell = document.getElementById(`board-cell-${idx}`);
    cell.textContent = val !== null ? val : '';
    
    cell.className = 'cell';
    if (val === 'X') cell.classList.add('x-cell');
    else if (val === 'O') cell.classList.add('o-cell');
  });

  updateTurnAnnouncer();
  updateUndoButton();
  
  aiThoughtLogEl.textContent = "Undo operation executed. Timelines synced.";
  
  // Redraw badges
  calculateAndShowMinimaxScores();
}

// Start application
window.addEventListener('DOMContentLoaded', initApp);
