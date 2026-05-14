/**
 * nurikabe - 数方 (Nurikabe) 场景 (Canvas版)
 * 划分黑格岛屿，白格为岛屿（带数字）
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_nurikabe = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/nurikabe';
const PUZZLE_COUNTS_nurikabe = {"easy":1000,"medium":1000,"hard":1000};
let currentPuzzleId_nurikabe = 0;
let isLoading_nurikabe = false;

function loadPuzzle(puzzleId) {
  if (isLoading_nurikabe) return;
  isLoading_nurikabe = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_nurikabe;
  const count = PUZZLE_COUNTS_nurikabe[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_nurikabe_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.grid) {
      applyPuzzle(cached, diff, actualId);
      isLoading_nurikabe = false;
      return;
    }
  } catch(e) {}

  console.info('[nurikabe] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_nurikabe + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.grid) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[nurikabe] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[nurikabe] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_nurikabe = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const PAD = 15;
const CELL_EMPTY = 0;
const CELL_WALL = 1;  // 墙壁/黑格
const CELL_WHITE = 2; // 岛屿白格

let rows = 6, cols = 6;
let grid = [];     // 0=?, 1=墙壁(用户填), 2=白格(用户填)
let numbers = [];  // 岛屿数字 {r, c, val}
let isComplete = false;
let difficulty = 'easy';
let backBtn = {}, newBtn = {}, resetBtn = {};
let diffBtns = [];
let timer = 0, timeStr = '0:00';
let _timerInterval = null;

function getCellSize() {
  return Math.min(42, Math.floor((Game.BASE_W - PAD * 2) / cols));
}

function applyPuzzle(data, diff, id) {
  const size = data.size || 6;
  rows = size; cols = size;
  const cdnGrid = data.grid || [];
  // 提取数字到 numbers 数组，grid 初始化为全空
  grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
  numbers = [];
  for (let r = 0; r < rows && r < cdnGrid.length; r++) {
    for (let c = 0; c < cols && c < (cdnGrid[r] || []).length; c++) {
      const val = parseInt(cdnGrid[r][c]);
      if (!isNaN(val) && val > 0) {
        numbers.push({ r, c, val });
      }
    }
  }
  isComplete = false;
  currentPuzzleId_nurikabe = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  rows = difficulty === 'easy' ? 6 : (difficulty === 'medium' ? 7 : 8);
  cols = rows;
  grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
  numbers = [];

  // 随机放置数字岛屿
  const count = Math.floor(rows * cols * 0.12);
  for (let k = 0; k < count; k++) {
    let attempts = 0;
    while (attempts < 50) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!numbers.find(n => n.r === r && n.c === c)) {
        // 岛屿大小 1~5
        const val = Math.min(5, Math.floor(Math.random() * 4) + 1);
        numbers.push({ r, c, val, filled: 1 });
        break;
      }
      attempts++;
    }
  }

  userGrid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
  isComplete = false;
  timer = 0;
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
  const btnY = 90 + rows * cellSize + 10;
  const btnW = (Game.BASE_W - PAD * 2 - 8) / 2;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 30, label: '🔄 重置' };
  newBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 30, label: '🆕 新题' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`数方 · ${timeStr}`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? '#764ba2' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  const cellSize = getCellSize();
  const gridW = cellSize * cols;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  // 背景
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(startX, startY, gridW, rows * cellSize);

  // 格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      const isNumber = !!numbers.find(n => n.r === r && n.c === c);
      const state = userGrid[r][c];

      if (isNumber) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, cellSize, cellSize);
      } else if (state === CELL_WALL) {
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(x, y, cellSize, cellSize);
      } else {
        ctx.fillStyle = '#e8e8e8';
        ctx.fillRect(x, y, cellSize, cellSize);
      }

      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 岛屿数字
  for (const n of numbers) {
    const x = startX + n.c * cellSize;
    const y = startY + n.r * cellSize;
    ctx.font = `bold ${cellSize * 0.55}px sans-serif`;
    ctx.fillStyle = '#764ba2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(n.val), x + cellSize / 2, y + cellSize / 2);
  }

  // 3x3区域粗边框
  if (rows % 3 === 0) {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < rows / 3; i++) {
      const y = startY + i * 3 * cellSize;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + gridW, y);
      ctx.stroke();
    }
    for (let i = 1; i < cols / 3; i++) {
      const x = startX + i * 3 * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + rows * cellSize);
      ctx.stroke();
    }
  }

  // 完成提示
  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 28, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 完成！', Game.BASE_W / 2, newBtn.y - 16, {
      size: 13, bold: true, color: '#764ba2', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(newBtn, '#764ba2');
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
    userGrid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
    isComplete = false;
    return;
  }
  if (Game.hitTest({ x, y }, newBtn)) { loadPuzzle(0); buildButtons(); return; }

  const cellSize = getCellSize();
  const gridW = cellSize * cols;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  if (x >= startX && x <= startX + gridW && y >= startY && y <= startY + rows * cellSize) {
    const c = Math.floor((x - startX) / cellSize);
    const r = Math.floor((y - startY) / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      const isNum = !!numbers.find(n => n.r === r && n.c === c);
      if (!isNum) {
        // 循环: 空→墙壁→白格→空
        userGrid[r][c] = (userGrid[r][c] + 1) % 3;
      }
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
