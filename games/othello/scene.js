/**
 * othello - 黑白棋 (Othello/Reversi) 场景 (Canvas版)
 * 8x8棋盘，人机对战，支持三个难度
 */
const Game = require('../../utils/game-core.js');

const PAD = 15;
const GRID_SIZE = 8;
const BLACK = 1;
const WHITE = 2;

const POSITION_WEIGHT = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100]
];

const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

let board = [];
let currentPlayer = BLACK;
let validMoves = [];
let gameOver = false;
let winner = null;
let blackCount = 2, whiteCount = 2;
let difficulty = 'medium';
let message = '黑棋先行';
let aiThinking = false;
let backBtn = {}, restartBtn = {};
let diffBtns = [];
let cellSize = 40;

function initBoard() {
  board = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  board[3][3] = WHITE; board[3][4] = BLACK;
  board[4][3] = BLACK; board[4][4] = WHITE;
  currentPlayer = BLACK;
  validMoves = getValidMoves(currentPlayer);
  gameOver = false;
  winner = null;
  blackCount = 2; whiteCount = 2;
  message = '黑棋先行';
  aiThinking = false;
}

function getValidMoves(player) {
  const moves = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === 0 && getCellsToFlip(r, c, player).length > 0) {
        moves.push({ r, c });
      }
    }
  }
  return moves;
}

function getCellsToFlip(r, c, player) {
  const opponent = player === BLACK ? WHITE : BLACK;
  const cells = [];
  for (const [dr, dc] of DIRS) {
    let nr = r + dr, nc = c + dc;
    const line = [];
    while (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
      if (board[nr][nc] === opponent) line.push({ r: nr, c: nc });
      else if (board[nr][nc] === player) { cells.push(...line); break; }
      else break;
      nr += dr; nc += dc;
    }
  }
  return cells;
}

function makeMove(r, c, player) {
  const cells = getCellsToFlip(r, c, player);
  board[r][c] = player;
  for (const cell of cells) board[cell.r][cell.c] = player;
  updateCounts();
}

function updateCounts() {
  blackCount = 0; whiteCount = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === BLACK) blackCount++;
      else if (board[r][c] === WHITE) whiteCount++;
    }
  }
}

function isGameOver() {
  return getValidMoves(BLACK).length === 0 && getValidMoves(WHITE).length === 0;
}

function getAIMove(depth) {
  const moves = getValidMoves(WHITE);
  if (moves.length === 0) return null;
  if (depth === 1) {
    let best = moves[0], bestFlips = 0;
    for (const m of moves) {
      const flips = getCellsToFlip(m.r, m.c, WHITE).length;
      if (flips > bestFlips) { bestFlips = flips; best = m; }
    }
    return best;
  }
  let bestMove = null, bestScore = -Infinity;
  for (const m of moves) {
    const oldBoard = board.map(row => [...row]);
    makeMove(m.r, m.c, WHITE);
    const score = minimax(depth - 1, -Infinity, Infinity, false);
    board = oldBoard;
    if (score > bestScore) { bestScore = score; bestMove = m; }
  }
  return bestMove;
}

function minimax(depth, alpha, beta, isMax) {
  if (depth === 0 || isGameOver()) return evaluateBoard();
  const player = isMax ? WHITE : BLACK;
  const moves = getValidMoves(player);
  if (moves.length === 0) return minimax(depth - 1, alpha, beta, !isMax);

  if (isMax) {
    let maxScore = -Infinity;
    for (const m of moves) {
      const oldBoard = board.map(row => [...row]);
      makeMove(m.r, m.c, WHITE);
      const score = minimax(depth - 1, alpha, beta, false);
      board = oldBoard;
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const m of moves) {
      const oldBoard = board.map(row => [...row]);
      makeMove(m.r, m.c, BLACK);
      const score = minimax(depth - 1, alpha, beta, true);
      board = oldBoard;
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

function evaluateBoard() {
  let score = 0;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (board[r][c] === WHITE) score += POSITION_WEIGHT[r][c];
      else if (board[r][c] === BLACK) score -= POSITION_WEIGHT[r][c];
    }
  }
  if (isGameOver()) {
    const counts = { white: 0, black: 0 };
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (board[r][c] === WHITE) counts.white++;
        else if (board[r][c] === BLACK) counts.black++;
      }
    }
    score += (counts.white - counts.black) * 100;
  }
  return score;
}

function aiTurn() {
  if (gameOver || currentPlayer !== WHITE) return;
  aiThinking = true;
  message = '白棋思考中...';
  const depthMap = { easy: 1, medium: 3, hard: 5 };
  const depth = depthMap[difficulty] || 3;
  setTimeout(() => {
    const move = getAIMove(depth);
    aiThinking = false;
    if (move) {
      makeMove(move.r, move.c, WHITE);
      validMoves = getValidMoves(BLACK);
      if (isGameOver()) endGame();
      else {
        currentPlayer = BLACK;
        message = '黑棋回合';
      }
    } else {
      validMoves = getValidMoves(BLACK);
      if (validMoves.length === 0) endGame();
      else {
        message = '白棋跳过，黑棋继续';
        currentPlayer = BLACK;
      }
    }
  }, 200);
}

function endGame() {
  gameOver = true;
  if (blackCount > whiteCount) { winner = BLACK; message = `黑胜！${blackCount} vs ${whiteCount}`; }
  else if (whiteCount > blackCount) { winner = WHITE; message = `白胜！${whiteCount} vs ${blackCount}`; }
  else { winner = null; message = `平局！${blackCount} vs ${whiteCount}`; }
}

function onEnter() {
  initBoard();
  buildButtons();
  calcCellSize();
}

function onExit() {}

function update(dt) {}

function calcCellSize() {
  cellSize = Math.min(40, Math.floor((Game.BASE_W - PAD * 2) / GRID_SIZE));
}

function buildButtons() {
  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };
  const bw = 60, bh = 26;
  const diffs = ['easy', 'medium', 'hard'];
  const labels = { easy: '简单', medium: '中等', hard: '困难' };
  const totalW = diffs.length * bw + 8 * (diffs.length - 1);
  const startX = (Game.BASE_W - totalW) / 2;
  diffBtns = diffs.map((d, i) => ({
    x: startX + i * (bw + 8),
    y: 38,
    w: bw,
    h: bh,
    id: d,
    label: labels[d]
  }));

  const boardH = GRID_SIZE * cellSize;
  const btnY = 90 + boardH + 10;
  restartBtn = { x: PAD, y: btnY, w: Game.BASE_W - PAD * 2, h: 34, label: '🔄 重新开始' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText('黑白棋', Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });
  Game.drawText(`${blackCount} vs ${whiteCount}  |  ${message}`, Game.BASE_W / 2, 38, {
    size: 10, color: Game.THEME.textGray, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? '#2d3436' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  const gridW = GRID_SIZE * cellSize;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  // 棋盘背景
  ctx.fillStyle = '#00b894';
  ctx.fillRect(startX, startY, gridW, gridW);

  // 格子
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      ctx.fillStyle = (r + c) % 2 === 0 ? '#00b894' : '#00a884';
      ctx.fillRect(x, y, cellSize, cellSize);

      // 合法落子提示
      if (!gameOver && currentPlayer === BLACK && validMoves.some(m => m.r === r && m.c === c)) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // 棋子
      if (board[r][c] !== 0) {
        const cx = x + cellSize / 2, cy = y + cellSize / 2;
        const radius = cellSize * 0.42;
        const color = board[r][c] === BLACK ? '#1a1a2e' : '#fff';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        Game.drawCircle(cx, cy, radius, { fill: color, stroke: '#555', strokeWidth: 1 });
      }
    }
  }

  // 完成提示
  if (gameOver) {
    const color = winner === BLACK ? '#f5576c' : winner === WHITE ? '#fff' : '#aaa';
    Game.drawCard(PAD, restartBtn.y - 36, Game.BASE_W - PAD * 2, 28, 6);
    Game.drawText(message, Game.BASE_W / 2, restartBtn.y - 22, {
      size: 13, bold: true, color, align: 'center', baseline: 'middle'
    });
  }

  drawBtn(restartBtn, '#2d3436');
}

function drawBackBtn() {
  const ctx = Game.ctx;
  Game.roundRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  Game.drawText(backBtn.label, backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2, {
    size: 14, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function drawBtn(btn, color) {
  const ctx = Game.ctx;
  Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
  ctx.fillStyle = color;
  ctx.fill();
  Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
    size: 12, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function onTouchStart(x, y) {
  if (Game.hitTest({ x, y }, backBtn)) { Game.switchScene('index'); return; }
  for (const btn of diffBtns) {
    if (Game.hitTest({ x, y }, btn)) {
      difficulty = btn.id;
      initBoard();
      buildButtons();
      return;
    }
  }
  if (Game.hitTest({ x, y }, restartBtn)) { initBoard(); buildButtons(); return; }
  if (gameOver || aiThinking || currentPlayer !== BLACK) return;

  const gridW = GRID_SIZE * cellSize;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  if (x >= startX && x <= startX + gridW && y >= startY && y <= startY + gridW) {
    const c = Math.floor((x - startX) / cellSize);
    const r = Math.floor((y - startY) / cellSize);
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      const isValid = validMoves.some(m => m.r === r && m.c === c);
      if (isValid) {
        makeMove(r, c, BLACK);
        validMoves = getValidMoves(WHITE);
        if (isGameOver()) endGame();
        else {
          currentPlayer = WHITE;
          aiTurn();
        }
      }
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart };
