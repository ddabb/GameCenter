/**
 * tents - 帐篷 (Tents) 场景 (Canvas版)
 * 在树旁放置帐篷，每个树一个帐篷，帐篷不相邻
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_tents = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/tents';
const PUZZLE_COUNTS_tents = {"easy":1000,"medium":0,"hard":0};
let currentPuzzleId_tents = 0;
let isLoading_tents = false;

function loadPuzzle(puzzleId) {
  if (isLoading_tents) return;
  isLoading_tents = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_tents;
  const count = PUZZLE_COUNTS_tents[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_tents_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.grid) {
      applyPuzzle(cached, diff, actualId);
      isLoading_tents = false;
      return;
    }
  } catch(e) {}

  console.info('[tents] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_tents + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.grid) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[tents] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[tents] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_tents = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const PAD = 15;
const CELL_TREE = 1;
const CELL_EMPTY = 0;

let rows = 6, cols = 6;
let grid = [];       // 树 grid[r][c]
let tents = [];     // 帐篷 tents[r][c]
let isComplete = false;
let difficulty = 'easy';
let backBtn = {}, newBtn = {}, resetBtn = {}, ansBtn = {};
let diffBtns = [];
let timer = 0, timeStr = '0:00';
let _timerInterval = null;

function getCellSize() {
  return Math.min(42, Math.floor((Game.BASE_W - PAD * 2 - 40) / cols));
}

function applyPuzzle(data, diff, id) {
  const size = data.size || 5;
  rows = size; cols = size;
  grid = data.grid || [];
  tents = data.tents || {};
  treeCount = data.treeCount || 0;
  rowCounts = data.rowCounts || [];
  colCounts = data.colCounts || [];
  playerTents = {};
  isComplete = false;
  currentPuzzleId_tents = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  rows = difficulty === 'easy' ? 6 : (difficulty === 'medium' ? 8 : 10);
  cols = rows;
  grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
  tents = Array.from({ length: rows }, () => Array(cols).fill(false));

  const treeCount = Math.floor(rows * cols * 0.18);
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push([r, c]);
    }
  }
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  for (let i = 0; i < treeCount; i++) {
    grid[cells[i][0]][cells[i][1]] = CELL_TREE;
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
  ansBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 30, label: '💡 答案' };
  newBtn = { x: PAD, y: btnY + 36, w: Game.BASE_W - PAD * 2, h: 30, label: '🆕 新题' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`帐篷 · ${timeStr}`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? '#00b894' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  const cellSize = getCellSize();
  const gridStartX = PAD + 20;
  const gridStartY = 90;

  // 画格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = gridStartX + c * cellSize;
      const y = gridStartY + r * cellSize;

      ctx.fillStyle = '#fff';
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);

      if (grid[r][c] === CELL_TREE) {
        // 树
        ctx.fillStyle = '#00b894';
        ctx.font = `${cellSize * 0.7}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🌲', x + cellSize / 2, y + cellSize / 2);
      } else if (tents[r][c]) {
        // 帐篷
        ctx.font = `${cellSize * 0.7}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⛺', x + cellSize / 2, y + cellSize / 2);
      }
    }
  }

  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 28, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 帐篷放好！', Game.BASE_W / 2, newBtn.y - 16, {
      size: 13, bold: true, color: '#00b894', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(ansBtn, '#f093fb');
  drawBtn(newBtn, '#00b894');
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
    tents = Array.from({ length: rows }, () => Array(cols).fill(false));
    isComplete = false;
    return;
  }
  if (Game.hitTest({ x, y }, ansBtn)) {
    // 简单求解：每个树旁边随机放一个帐篷
    tents = Array.from({ length: rows }, () => Array(cols).fill(false));
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === CELL_TREE) {
          for (const [dr, dc] of dirs) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols &&
                grid[nr][nc] === CELL_EMPTY && !tents[nr][nc]) {
              tents[nr][nc] = true;
              break;
            }
          }
        }
      }
    }
    return;
  }
  if (Game.hitTest({ x, y }, newBtn)) { loadPuzzle(0); buildButtons(); return; }

  const cellSize = getCellSize();
  const gridStartX = PAD + 20;
  const gridStartY = 90;

  if (x >= gridStartX && x <= gridStartX + cols * cellSize &&
      y >= gridStartY && y <= gridStartY + rows * cellSize) {
    const c = Math.floor((x - gridStartX) / cellSize);
    const r = Math.floor((y - gridStartY) / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === CELL_EMPTY) {
      tents[r][c] = !tents[r][c];

      // 检查完成
      // 1. 每棵树必须有帐篷相邻
      let ok = true;
      for (let r = 0; r < rows && ok; r++) {
        for (let c = 0; c < cols && ok; c++) {
          if (grid[r][c] === CELL_TREE) {
            const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
            let hasTent = false;
            for (const [dr, dc] of dirs) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tents[nr][nc]) {
                hasTent = true;
                break;
              }
            }
            if (!hasTent) ok = false;
          }
        }
      }
      // 2. 帐篷不相邻
      for (let r = 0; r < rows && ok; r++) {
        for (let c = 0; c < cols && ok; c++) {
          if (tents[r][c]) {
            const dirs8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
            for (const [dr, dc] of dirs8) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && tents[nr][nc]) {
                ok = false;
                break;
              }
            }
          }
        }
      }
      if (ok) isComplete = true;
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
