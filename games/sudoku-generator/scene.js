/**
 * sudoku-generator - 数独生成器场景 (Canvas版)
 * 自动生成有效数独题目，支持不同难度
 */
const Game = require('../../utils/game-core.js');

const PAD = 15;
const GRID_SIZE = 9;
const CELL_W = (Game.BASE_W - PAD * 2) / GRID_SIZE;
const GRID_H = CELL_W * GRID_SIZE;
const GRID_Y = 80;

// 难度
const DIFFICULTIES = [
  { id: 'easy', label: '简单', name: '★☆☆', blanks: 30 },
  { id: 'medium', label: '中等', name: '★★☆', blanks: 45 },
  { id: 'hard', label: '困难', name: '★★★', blanks: 55 },
];

let grid = [];         // 解（9x9）
let puzzle = [];       // 题目（0=空格）
let userGrid = [];     // 用户输入
let selected = null;   // {r, c}
let difficulty = 'easy';
let isComplete = false;
let showAnswer = false;
let diffBtns = [];
let backBtn = {};
let resetBtn = {};
let checkBtn = {};
let answerBtn = {};
let newBtn = {};

function initGrid() {
  grid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
  userGrid = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function generateSudoku() {
  initGrid();
  fillGrid(grid, 0);
  const diffConfig = DIFFICULTIES.find(d => d.id === difficulty) || DIFFICULTIES[0];
  const puzzleGrid = grid.map(row => [...row]);
  removeNumbers(puzzleGrid, diffConfig.blanks);
  puzzle = puzzleGrid;
  userGrid = puzzle.map(row => [...row]);
  selected = null;
  isComplete = false;
  showAnswer = false;
}

function fillGrid(g, idx) {
  if (idx >= GRID_SIZE * GRID_SIZE) return true;
  const r = Math.floor(idx / GRID_SIZE);
  const c = idx % GRID_SIZE;
  const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const n of nums) {
    if (isValidPlacement(g, r, c, n)) {
      g[r][c] = n;
      if (fillGrid(g, idx + 1)) return true;
      g[r][c] = 0;
    }
  }
  return false;
}

function isValidPlacement(g, r, c, n) {
  for (let i = 0; i < GRID_SIZE; i++) {
    if (g[r][i] === n) return false;
  }
  for (let i = 0; i < GRID_SIZE; i++) {
    if (g[i][c] === n) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (g[br + i][bc + j] === n) return false;
    }
  }
  return true;
}

function removeNumbers(g, count) {
  const cells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      cells.push([r, c]);
    }
  }
  shuffle(cells);
  let removed = 0;
  for (const [r, c] of cells) {
    if (removed >= count) break;
    g[r][c] = 0;
    removed++;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildButtons() {
  const bw = 68, bh = 28;
  const gap = 8;
  const totalW = DIFFICULTIES.length * bw + (DIFFICULTIES.length - 1) * gap;
  const startX = (Game.BASE_W - totalW) / 2;

  diffBtns = DIFFICULTIES.map((d, i) => ({
    x: startX + i * (bw + gap),
    y: 28,
    w: bw,
    h: bh,
    id: d.id,
    label: d.label,
    name: d.name
  }));

  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };

  const btnY = GRID_Y + GRID_H + 12;
  const btnW = (Game.BASE_W - PAD * 2 - 16) / 3;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 34, label: '🔄 重置' };
  checkBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 34, label: '✅ 检查' };
  answerBtn = { x: PAD + (btnW + 8) * 2, y: btnY, w: btnW, h: 34, label: '💡 答案' };
  newBtn = { x: PAD, y: btnY + 40, w: Game.BASE_W - PAD * 2, h: 36, label: '🆕 新题目' };
}

function onEnter() {
  generateSudoku();
  buildButtons();
}

function onExit() {}

function update(dt) {}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  // 标题
  Game.drawText('数独生成器', Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  // 返回
  drawBackBtn();

  // 难度选择
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? Game.THEME.primary : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 12, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 棋盘
  drawSudokuGrid();

  // 按钮
  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(checkBtn, '#4ecdc4');
  drawBtn(answerBtn, '#f093fb');
  drawBtn(newBtn, Game.THEME.primary);

  // 完成提示
  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 30, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 恭喜完成！', Game.BASE_W / 2, newBtn.y - 18, {
      size: 12, bold: true, color: '#4ecdc4', align: 'center', baseline: 'middle'
    });
  }
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

function drawSudokuGrid() {
  const ctx = Game.ctx;
  const gridW = CELL_W * GRID_SIZE;
  const gridH = CELL_W * GRID_SIZE;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = GRID_Y;

  // 背景
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillRect(startX, startY, gridW, gridH);
  ctx.shadowColor = 'transparent';

  // 格子
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = startX + c * CELL_W;
      const y = startY + r * CELL_W;
      const val = showAnswer ? grid[r][c] : userGrid[r][c];
      const isFixed = puzzle[r][c] !== 0;
      const isSelected = selected && selected.r === r && selected.c === c;

      // 选中背景
      if (isSelected) {
        ctx.fillStyle = '#667eea40';
        ctx.fillRect(x, y, CELL_W, CELL_W);
      }

      // 同行同列高亮
      if (selected && (selected.r === r || selected.c === c)) {
        ctx.fillStyle = 'rgba(102,126,234,0.08)';
        ctx.fillRect(x, y, CELL_W, CELL_W);
      }

      // 数字
      if (val !== 0) {
        ctx.font = `bold ${CELL_W * 0.5}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (isFixed) {
          ctx.fillStyle = '#1a1a2e';
        } else {
          ctx.fillStyle = '#667eea';
        }
        ctx.fillText(String(val), x + CELL_W / 2, y + CELL_W / 2);
      }
    }
  }

  // 网格线
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= GRID_SIZE; i++) {
    const lw = (i % 3 === 0) ? 1.5 : 0.5;
    ctx.lineWidth = lw;
    ctx.strokeStyle = (i % 3 === 0) ? '#555' : '#ddd';
    // 横线
    ctx.beginPath();
    ctx.moveTo(startX, startY + i * CELL_W);
    ctx.lineTo(startX + gridW, startY + i * CELL_W);
    ctx.stroke();
    // 竖线
    ctx.beginPath();
    ctx.moveTo(startX + i * CELL_W, startY);
    ctx.lineTo(startX + i * CELL_W, startY + gridH);
    ctx.stroke();
  }

  ctx.restore();
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
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  for (const btn of diffBtns) {
    if (Game.hitTest({ x, y }, btn)) {
      difficulty = btn.id;
      generateSudoku();
      return;
    }
  }

  if (Game.hitTest({ x, y }, resetBtn)) {
    userGrid = puzzle.map(row => [...row]);
    isComplete = false;
    showAnswer = false;
    return;
  }

  if (Game.hitTest({ x, y }, checkBtn)) {
    const correct = checkGrid();
    if (correct) {
      isComplete = true;
    } else {
      wx.showToast({ title: '还有错误，继续加油！', icon: 'none' });
    }
    return;
  }

  if (Game.hitTest({ x, y }, answerBtn)) {
    showAnswer = !showAnswer;
    return;
  }

  if (Game.hitTest({ x, y }, newBtn)) {
    generateSudoku();
    return;
  }

  // 点击棋盘格
  const gridW = CELL_W * GRID_SIZE;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = GRID_Y;
  if (x >= startX && x <= startX + gridW && y >= startY && y <= startY + gridW) {
    const c = Math.floor((x - startX) / CELL_W);
    const r = Math.floor((y - startY) / CELL_W);
    if (puzzle[r][c] === 0) {
      if (selected && selected.r === r && selected.c === c) {
        // 循环数字
        const cur = userGrid[r][c];
        userGrid[r][c] = cur >= 9 ? 0 : cur + 1;
      } else {
        selected = { r, c };
        userGrid[r][c] = userGrid[r][c] || 1;
      }
    }
  }
}

function checkGrid() {
  const temp = userGrid.map(row => [...row]);
  let valid = true;
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (temp[r][c] === 0) { valid = false; break; }
    }
    if (!valid) break;
  }
  if (!valid) return false;

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const n = userGrid[r][c];
      userGrid[r][c] = 0;
      if (!isValidPlacement(userGrid, r, c, n)) {
        userGrid[r][c] = n;
        return false;
      }
      userGrid[r][c] = n;
    }
  }
  return true;
}

module.exports = { onEnter, onExit, update, render, onTouchStart };
