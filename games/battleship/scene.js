/**
 * battleship - 战舰 (Battleship) 场景 (Canvas版)
 * 根据行列提示，找出所有战舰位置
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_battleship = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/battleship';
const PUZZLE_COUNTS_battleship = {"easy":1000,"medium":1000,"hard":1000};
let currentPuzzleId_battleship = 0;
let isLoading_battleship = false;

function loadPuzzle(puzzleId) {
  if (isLoading_battleship) return;
  isLoading_battleship = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_battleship;
  const count = PUZZLE_COUNTS_battleship[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_battleship_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.grid) {
      applyPuzzle(cached, diff, actualId);
      isLoading_battleship = false;
      return;
    }
  } catch(e) {}

  console.info('[battleship] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_battleship + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.grid) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[battleship] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[battleship] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_battleship = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const PAD = 15;
const CELL_SHIP = 1; // 战舰格
const CELL_EMPTY = 0;
const CELL_WATER = 2; // 水

let rows = 6, cols = 6;
let grid = [];      // 答案 grid[r][c] = CELL_SHIP/CELL_EMPTY
let userGrid = []; // 用户 grid[r][c] = 0/1/2
let rowHints = [], colHints = [];
let isComplete = false;
let difficulty = 'easy';
let backBtn = {}, newBtn = {}, resetBtn = {}, showAnsBtn = {};
let diffBtns = [];
let timer = 0, timeStr = '0:00';
let _timerInterval = null;

function getCellSize() {
  return Math.min(38, Math.floor((Game.BASE_W - PAD * 2 - 40) / cols));
}

function applyPuzzle(data, diff, id) {
  const size = data.size || 6;
  rows = size; cols = size;
  grid = data.grid || [];
  rowHints = data.rowCounts || data.colHints || [];
  colHints = data.colCounts || data.colHints || [];
  userGrid = Array.from({ length: rows }, () => Array(cols).fill(0));
  isComplete = false;
  currentPuzzleId_battleship = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  rows = difficulty === 'easy' ? 6 : (difficulty === 'medium' ? 8 : 10);
  cols = rows;
  grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
  userGrid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));

  const ships = difficulty === 'easy' ? [3, 2, 2, 1, 1]
    : difficulty === 'medium' ? [4, 3, 2, 2, 1, 1]
    : [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

  for (const len of ships) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 100) {
      attempts++;
      const horiz = Math.random() > 0.5;
      const r = Math.floor(Math.random() * (horiz ? rows : rows - len + 1));
      const c = Math.floor(Math.random() * (horiz ? cols - len + 1 : cols));
      let ok = true;
      for (let i = 0; i < len && ok; i++) {
        const nr = horiz ? r : r + i;
        const nc = horiz ? c + i : c;
        if (nr >= rows || nc >= cols || grid[nr][nc] === CELL_SHIP) ok = false;
        for (let dr = -1; dr <= 1 && ok; dr++) {
          for (let dc = -1; dc <= 1 && ok; dc++) {
            const er = nr + dr, ec = nc + dc;
            if (er >= 0 && er < rows && ec >= 0 && ec < cols && grid[er][ec] === CELL_SHIP) ok = false;
          }
        }
      }
      if (ok) {
        for (let i = 0; i < len; i++) {
          const nr = horiz ? r : r + i;
          const nc = horiz ? c + i : c;
          grid[nr][nc] = CELL_SHIP;
        }
        placed = true;
      }
    }
  }

  rowHints = Array.from({ length: rows }, () => 0);
  colHints = Array.from({ length: cols }, () => 0);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === CELL_SHIP) { rowHints[r]++; colHints[c]++; }
    }
  }

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
  showAnsBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 30, label: '💡 提示' };
  newBtn = { x: PAD, y: btnY + 36, w: Game.BASE_W - PAD * 2, h: 30, label: '🆕 新题' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`战舰 · ${timeStr}`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? '#0984e3' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  const cellSize = getCellSize();
  const hintW = 28;
  const gridStartX = PAD + hintW;
  const gridStartY = 90;

  // 列提示
  for (let c = 0; c < cols; c++) {
    const x = gridStartX + c * cellSize;
    const hint = colHints[c];
    if (hint > 0) {
      ctx.font = `bold ${cellSize * 0.4}px sans-serif`;
      ctx.fillStyle = '#0984e3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(hint), x + cellSize / 2, gridStartY - cellSize / 2);
    }
  }

  // 行提示
  for (let r = 0; r < rows; r++) {
    const y = gridStartY + r * cellSize;
    const hint = rowHints[r];
    if (hint > 0) {
      ctx.font = `bold ${cellSize * 0.4}px sans-serif`;
      ctx.fillStyle = '#0984e3';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(hint), gridStartX - cellSize / 2, y + cellSize / 2);
    }
  }

  // 格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gridStartX + c * cellSize;
      const y = gridStartY + r * cellSize;
      const state = userGrid[r][c];

      ctx.fillStyle = state === CELL_SHIP ? '#0984e3'
        : state === CELL_WATER ? 'rgba(255,255,255,0.05)' : '#fff';
      ctx.fillRect(x, y, cellSize, cellSize);

      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);

      if (state === CELL_SHIP) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize / 3);
      } else if (state === CELL_WATER) {
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + cellSize - 4, y + cellSize - 4);
        ctx.moveTo(x + cellSize - 4, y + 4);
        ctx.lineTo(x + 4, y + cellSize - 4);
        ctx.stroke();
      }
    }
  }

  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 28, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 全部找到！', Game.BASE_W / 2, newBtn.y - 16, {
      size: 13, bold: true, color: '#0984e3', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(showAnsBtn, '#f093fb');
  drawBtn(newBtn, '#0984e3');
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
  if (Game.hitTest({ x, y }, showAnsBtn)) {
    userGrid = grid.map(row => [...row]);
    return;
  }
  if (Game.hitTest({ x, y }, newBtn)) { loadPuzzle(0); buildButtons(); return; }

  const cellSize = getCellSize();
  const hintW = 28;
  const gridStartX = PAD + hintW;
  const gridStartY = 90;

  if (x >= gridStartX && x <= gridStartX + cols * cellSize &&
      y >= gridStartY && y <= gridStartY + rows * cellSize) {
    const c = Math.floor((x - gridStartX) / cellSize);
    const r = Math.floor((y - gridStartY) / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      userGrid[r][c] = (userGrid[r][c] + 1) % 3;
      // 检查完成
      let complete = true;
      for (let rr = 0; rr < rows && complete; rr++) {
        for (let cc = 0; cc < cols && complete; cc++) {
          if (userGrid[rr][cc] === CELL_SHIP && grid[rr][cc] !== CELL_SHIP) complete = false;
          if (userGrid[rr][cc] !== CELL_SHIP && grid[rr][cc] === CELL_SHIP) complete = false;
        }
      }
      if (complete) isComplete = true;
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
