/**
 * nonogram - 数织 (Nonogram / Picross) 场景 (Canvas版)
 * 根据行列提示填充格子
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_nonogram = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/nonogram';
const PUZZLE_COUNTS_nonogram = {"easy":1000,"medium":1000,"hard":1000};
let currentPuzzleId_nonogram = 0;
let isLoading_nonogram = false;

function loadPuzzle(puzzleId) {
  if (isLoading_nonogram) return;
  isLoading_nonogram = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_nonogram;
  const count = PUZZLE_COUNTS_nonogram[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_nonogram_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.answer) {
      applyPuzzle(cached, diff, actualId);
      isLoading_nonogram = false;
      return;
    }
  } catch(e) {}

  console.info('[nonogram] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_nonogram + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.answer) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[nonogram] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[nonogram] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_nonogram = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const PAD = 15;
const MAX_SIZE = 10;
const CELL_HINT_W = 60;
const CELL_HINT_H = 60;

let rows = 6, cols = 6;
let grid = [];       // 0=空, 1=填充
let userGrid = [];   // 0=空, 1=填充, 2=标记X
let solution = [];   // 解
let isComplete = false;
let difficulty = 'easy';
let backBtn = {}, newBtn = {}, resetBtn = {};
let diffBtns = [];
let timer = 0, timeStr = '0:00';
let _timerInterval = null;

function getCellSize() {
  const availW = Game.BASE_W - PAD * 2 - CELL_HINT_W;
  const availH = 400 - CELL_HINT_H;
  return Math.max(22, Math.min(Math.floor(availW / cols), Math.floor(availH / rows)));
}

function applyPuzzle(data, diff, id) {
  const size = data.size || 5;
  rows = size; cols = size;
  answer = data.answer || data.grid || [];
  rowHints = data.rowHints || [];
  colHints = data.colHints || [];
  playerGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
  isComplete = false;
  currentPuzzleId_nonogram = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  rows = difficulty === 'easy' ? 6 : (difficulty === 'medium' ? 8 : 10);
  cols = rows;
  grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  userGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
  solution = Array.from({ length: rows }, () => Array(cols).fill(0));

  // 随机生成解
  const fillRate = difficulty === 'easy' ? 0.45 : (difficulty === 'medium' ? 0.5 : 0.55);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      solution[r][c] = Math.random() < fillRate ? 1 : 0;
    }
  }
  // 生成行列提示
  for (let r = 0; r < rows; r++) {
    const counts = [];
    let cnt = 0;
    for (let c = 0; c < cols; c++) {
      if (solution[r][c] === 1) cnt++;
      else if (cnt > 0) { counts.push(cnt); cnt = 0; }
    }
    if (cnt > 0) counts.push(cnt);
    grid[r] = counts.length > 0 ? counts : [0];
  }
  isComplete = false;
  timer = 0;
}

function calcColHints() {
  const hints = [];
  for (let c = 0; c < cols; c++) {
    const counts = [];
    let cnt = 0;
    for (let r = 0; r < rows; r++) {
      if (solution[r][c] === 1) cnt++;
      else if (cnt > 0) { counts.push(cnt); cnt = 0; }
    }
    if (cnt > 0) counts.push(cnt);
    hints.push(counts.length > 0 ? counts : [0]);
  }
  return hints;
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function onEnter() {
  loadPuzzle(0);
  buildButtons();
  _timerInterval = setInterval(() => {
    if (!isComplete) { timer++; timeStr = formatTime(timer); }
  }, 1000);
}

function onExit() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

function update(dt) {}

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

  const cellSize = getCellSize();
  const totalH = CELL_HINT_H + rows * cellSize;
  const btnY = 90 + totalH + 10;
  const btnW = (Game.BASE_W - PAD * 2 - 8) / 2;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 30, label: '🔄 重置' };
  newBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 30, label: '🆕 新题' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`数织 · ${timeStr}`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? Game.THEME.primary : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  const cellSize = getCellSize();
  const gridStartX = PAD + CELL_HINT_W;
  const gridStartY = 90 + CELL_HINT_H;
  const colHints = calcColHints();
  const maxRowHints = Math.max(...grid.map(r => r.length));

  // 列提示
  for (let c = 0; c < cols; c++) {
    const hints = colHints[c];
    const x = gridStartX + c * cellSize;
    const totalH = hints.length * 14;
    const startY = gridStartY - totalH - 4;
    for (let hi = 0; hi < hints.length; hi++) {
      Game.drawText(String(hints[hi]), x + cellSize / 2, startY + hi * 14, {
        size: 10, color: Game.THEME.textGray, align: 'center'
      });
    }
  }

  // 行提示
  for (let r = 0; r < rows; r++) {
    const hints = grid[r];
    const y = gridStartY + r * cellSize;
    const x = PAD + CELL_HINT_W - 8;
    for (let hi = 0; hi < hints.length; hi++) {
      const hx = x - (hints.length - hi) * 14;
      Game.drawText(String(hints[hi]), hx, y + cellSize / 2, {
        size: 10, color: Game.THEME.textGray, align: 'center', baseline: 'middle'
      });
    }
  }

  // 格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gridStartX + c * cellSize;
      const y = gridStartY + r * cellSize;
      const state = userGrid[r][c];

      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, cellSize, cellSize);

      if (state === 1) {
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
      } else if (state === 2) {
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + cellSize - 4, y + cellSize - 4);
        ctx.moveTo(x + cellSize - 4, y + 4);
        ctx.lineTo(x + 4, y + cellSize - 4);
        ctx.stroke();
      }

      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 3x3区域粗边框
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < rows / 3; i++) {
    const y = gridStartY + i * 3 * cellSize;
    ctx.beginPath();
    ctx.moveTo(gridStartX, y);
    ctx.lineTo(gridStartX + cols * cellSize, y);
    ctx.stroke();
  }
  for (let i = 1; i < cols / 3; i++) {
    const x = gridStartX + i * 3 * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, gridStartY);
    ctx.lineTo(x, gridStartY + rows * cellSize);
    ctx.stroke();
  }

  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 28, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 完成！', Game.BASE_W / 2, newBtn.y - 16, {
      size: 13, bold: true, color: '#667eea', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(newBtn, Game.THEME.primary);
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
    size: 11, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function onTouchStart(x, y) {
  if (Game.hitTest({ x, y }, backBtn)) { Game.switchScene('index'); return; }
  for (const btn of diffBtns) {
    if (Game.hitTest({ x, y }, btn)) {
      difficulty = btn.id;
      loadPuzzle(0);
      buildButtons();
      return;
    }
  }
  if (Game.hitTest({ x, y }, resetBtn)) {
    userGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
    isComplete = false;
    return;
  }
  if (Game.hitTest({ x, y }, newBtn)) { loadPuzzle(0); buildButtons(); return; }

  const cellSize = getCellSize();
  const gridStartX = PAD + CELL_HINT_W;
  const gridStartY = 90 + CELL_HINT_H;

  if (x >= gridStartX && x <= gridStartX + cols * cellSize &&
      y >= gridStartY && y <= gridStartY + rows * cellSize) {
    const c = Math.floor((x - gridStartX) / cellSize);
    const r = Math.floor((y - gridStartY) / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      userGrid[r][c] = (userGrid[r][c] + 1) % 3; // 0→1→2→0
      // 检查完成
      let complete = true;
      for (let rr = 0; rr < rows && complete; rr++) {
        for (let cc = 0; cc < cols && complete; cc++) {
          if (userGrid[rr][cc] === 1 && solution[rr][cc] !== 1) complete = false;
          if (userGrid[rr][cc] !== 1 && solution[rr][cc] === 1) complete = false;
        }
      }
      if (complete) isComplete = true;
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
