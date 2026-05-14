/**
 * akari - 点灯 (Light Up) 场景 (Canvas版)
 * 在白格放置灯塔，照亮所有白格
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_akari = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/akari';
const PUZZLE_COUNTS_akari = {"easy":1000,"medium":1000,"hard":1000};
let currentPuzzleId_akari = 0;
let isLoading_akari = false;

function loadPuzzle(puzzleId) {
  if (isLoading_akari) return;
  isLoading_akari = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_akari;
  const count = PUZZLE_COUNTS_akari[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_akari_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.grid) {
      applyPuzzle(cached, diff, actualId);
      isLoading_akari = false;
      return;
    }
  } catch(e) {}

  console.info('[akari] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_akari + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.grid) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[akari] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[akari] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_akari = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const CELL_W = 40;
const GRID_Y = 100;
const PAD = 15;

const CELL_WHITE = 0;
const CELL_BLACK = 1;
const CELL_BLACK_0 = 2;
const CELL_BLACK_1 = 3;
const CELL_BLACK_2 = 4;
const CELL_BLACK_3 = 5;
const CELL_BLACK_4 = 6;

let rows = 7, cols = 7;
let grid = [];
let lights = [];
let lit = [];
let isComplete = false;
let showAnswer = false;
let answerLights = [];
let timer = 0;
let timeStr = '0:00';
let difficulty = 'easy';
let backBtn = {}, resetBtn = {}, newBtn = {}, answerBtn = {};
let diffBtns = [];

function getCellSize() {
  const maxW = Game.BASE_W - PAD * 2;
  return Math.min(42, Math.floor(maxW / cols));
}

function applyPuzzle(data, diff, id) {
  const size = data.size || (diff === 'easy' ? 7 : diff === 'medium' ? 10 : 12);
  rows = size; cols = size;
  grid = data.grid.map(row => row.map(cell => {
    if (typeof cell === 'number') return cell;
    if (cell === '#' || cell === '■') return CELL_BLACK;
    const n = parseInt(cell);
    return isNaN(n) ? CELL_WHITE : CELL_BLACK_0 + n;
  }));
  answerLights = [];
  lights = Array.from({ length: rows }, () => Array(cols).fill(false));
  updateLit();
  isComplete = false;
  showAnswer = false;
  currentPuzzleId_akari = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  rows = difficulty === 'easy' ? 7 : (difficulty === 'medium' ? 10 : 12);
  cols = rows;
  grid = [];
  for (let r = 0; r < rows; r++) {
    grid.push([]);
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        if (Math.random() < 0.3) {
          grid[r].push(CELL_BLACK_0 + Math.floor(Math.random() * 5));
        } else if (Math.random() < 0.2) {
          grid[r].push(CELL_BLACK);
        } else {
          grid[r].push(CELL_WHITE);
        }
      } else {
        if (Math.random() < 0.15) {
          grid[r].push(CELL_BLACK);
        } else if (Math.random() < 0.08) {
          grid[r].push(CELL_BLACK_0 + Math.floor(Math.random() * 5));
        } else {
          grid[r].push(CELL_WHITE);
        }
      }
    }
  }
  lights = Array.from({ length: rows }, () => Array(cols).fill(false));
  updateLit();
  isComplete = false;
  showAnswer = false;
  timer = 0;
}

function updateLit() {
  lit = Array.from({ length: rows }, () => Array(cols).fill(false));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (lights[r][c]) {
        lit[r][c] = true;
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (grid[nr][nc] >= CELL_BLACK) break;
            lit[nr][nc] = true;
            nr += dr;
            nc += dc;
          }
        }
      }
    }
  }
}

function solveAkari() {
  const ans = Array.from({ length: rows }, () => Array(cols).fill(false));
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  function markLit(l, r, c) {
    l[r][c] = true;
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] < CELL_BLACK) {
        l[nr][nc] = true;
        nr += dr; nc += dc;
      }
    }
  }

  const whiteCells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] < CELL_BLACK) whiteCells.push([r, c]);
    }
  }

  function backtrack(idx, placed) {
    if (idx >= whiteCells.length) {
      // 检查所有白格被照亮
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (grid[r][c] < CELL_BLACK && !placed[r][c]) return false;
        }
      }
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          ans[r][c] = placed[r][c];
        }
      }
      return true;
    }

    const [r, c] = whiteCells[idx];
    if (grid[r][c] >= CELL_BLACK) return backtrack(idx + 1, placed);

    // 不放灯
    if (backtrack(idx + 1, placed)) return true;

    // 放灯
    placed[r][c] = true;
    const prevLit = placed.map(row => [...row]);
    markLit(placed, r, c);

    if (backtrack(idx + 1, placed)) return true;
    placed[r][c] = false;
    for (let i = 0; i < rows; i++) placed[i] = prevLit[i].slice();

    return false;
  }

  backtrack(0, Array.from({ length: rows }, () => Array(cols).fill(false)));
  return ans;
}

function checkCompletion() {
  // 灯塔互不照射
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (lights[r][c]) {
        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dr, dc] of dirs) {
          let nr = r + dr, nc = c + dc;
          while (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            if (grid[nr][nc] >= CELL_BLACK) break;
            if (lights[nr][nc]) return false;
            nr += dr; nc += dc;
          }
        }
      }
    }
  }
  // 数字黑格
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] >= CELL_BLACK_0) {
        const need = grid[r][c] - CELL_BLACK_0;
        let cnt = 0;
        if (r > 0 && lights[r - 1][c]) cnt++;
        if (r < rows - 1 && lights[r + 1][c]) cnt++;
        if (c > 0 && lights[r][c - 1]) cnt++;
        if (c < cols - 1 && lights[r][c + 1]) cnt++;
        if (cnt !== need) return false;
      }
    }
  }
  // 所有白格照亮
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] < CELL_BLACK && !lit[r][c]) return false;
    }
  }
  return true;
}

function formatTime(s) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function onEnter() {
  loadPuzzle(0);
  buildButtons();
  _startTimer();
}

function onExit() {
  _stopTimer();
}

let _timerInterval = null;
function _startTimer() {
  _stopTimer();
  _timerInterval = setInterval(() => {
    timer++;
    timeStr = formatTime(timer);
  }, 1000);
}
function _stopTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
}

function buildButtons() {
  const cellSize = getCellSize();
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

  const btnY = GRID_Y + rows * cellSize + 10;
  const btnW = (Game.BASE_W - PAD * 2 - 8) / 2;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 30, label: '🔄 重置' };
  newBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 30, label: '🆕 新题' };
  answerBtn = { x: PAD, y: btnY + 36, w: Game.BASE_W - PAD * 2, h: 30, label: '💡 答案' };
}

function update(dt) {}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`点灯 · ${timeStr}`, Game.BASE_W / 2, 10, {
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
  const gridW = cellSize * cols;
  const startX = (Game.BASE_W - gridW) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellSize;
      const y = GRID_Y + r * cellSize;
      const cell = grid[r][c];
      const isLitCell = lit[r][c];
      const hasLight = lights[r][c];

      if (cell >= CELL_BLACK) {
        // 黑格
        ctx.fillStyle = '#2d3436';
        ctx.fillRect(x, y, cellSize, cellSize);
        // 数字
        if (cell >= CELL_BLACK_0) {
          const num = cell - CELL_BLACK_0;
          ctx.font = `bold ${cellSize * 0.45}px sans-serif`;
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(num), x + cellSize / 2, y + cellSize / 2);
        }
      } else {
        // 白格
        ctx.fillStyle = isLitCell ? 'rgba(253,203,110,0.3)' : '#fff';
        ctx.fillRect(x, y, cellSize, cellSize);

        if (hasLight) {
          // 灯塔
          ctx.save();
          const cx = x + cellSize / 2, cy = y + cellSize / 2;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cellSize * 0.4);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.5, '#fdcb6e');
          grad.addColorStop(1, '#f39c12');
          Game.drawCircle(cx, cy, cellSize * 0.35, { fill: grad });
          ctx.restore();
        }
      }

      // 格子边框
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  if (isComplete) {
    Game.drawCard(PAD, answerBtn.y - 28, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 全部点亮！', Game.BASE_W / 2, answerBtn.y - 16, {
      size: 13, bold: true, color: '#fdcb6e', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(newBtn, Game.THEME.primary);
  drawBtn(answerBtn, '#f093fb');
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
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  for (const btn of diffBtns) {
    if (Game.hitTest({ x, y }, btn)) {
      difficulty = btn.id;
      loadPuzzle(0);
      return;
    }
  }

  if (Game.hitTest({ x, y }, resetBtn)) {
    lights = Array.from({ length: rows }, () => Array(cols).fill(false));
    updateLit();
    isComplete = false;
    showAnswer = false;
    return;
  }

  if (Game.hitTest({ x, y }, newBtn)) {
    loadPuzzle(0);
    return;
  }

  if (Game.hitTest({ x, y }, answerBtn)) {
    if (!showAnswer) {
      wx.showLoading({ title: '求解中...' });
      setTimeout(() => {
        answerLights = solveAkari();
        lights = answerLights.map(row => [...row]);
        updateLit();
        showAnswer = true;
        wx.hideLoading();
      }, 50);
    } else {
      showAnswer = false;
      lights = Array.from({ length: rows }, () => Array(cols).fill(false));
      updateLit();
    }
    return;
  }

  // 点击格子
  const cellSize = getCellSize();
  const gridW = cellSize * cols;
  const startX = (Game.BASE_W - gridW) / 2;

  if (x >= startX && x <= startX + gridW && y >= GRID_Y && y <= GRID_Y + rows * cellSize) {
    const c = Math.floor((x - startX) / cellSize);
    const r = Math.floor((y - GRID_Y) / cellSize);
    if (r >= 0 && r < rows && c >= 0 && c < cols) {
      if (grid[r][c] < CELL_BLACK) {
        lights[r][c] = !lights[r][c];
        updateLit();
        if (checkCompletion()) {
          isComplete = true;
        }
      }
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
