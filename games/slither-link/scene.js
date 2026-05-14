/**
 * slither-link - 数回 (Slitherlink) 场景 (Canvas版)
 * 在格点间画线，形成闭合回路
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_slither_link = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/slither-link';
const PUZZLE_COUNTS_slither_link = {"easy":200,"medium":0,"hard":0};
let currentPuzzleId_slither_link = 0;
let isLoading_slither_link = false;

function loadPuzzle(puzzleId) {
  if (isLoading_slither_link) return;
  isLoading_slither_link = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_slither_link;
  const count = PUZZLE_COUNTS_slither_link[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_slither_link_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.grid) {
      applyPuzzle(cached, diff, actualId);
      isLoading_slither_link = false;
      return;
    }
  } catch(e) {}

  console.info('[slither-link] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_slither_link + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.grid) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[slither-link] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[slither-link] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_slither_link = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}


const PAD = 15;
let rows = 5, cols = 5;
let grid = [];     // grid[r][c] = 数字 0-3
let vLines = [];   // vLines[r][c] = 上边是否有线 (r从0到rows, c从0到cols-1)
let hLines = [];   // hLines[r][c] = 左边是否有线 (r从0到rows-1, c从0到cols)
let isComplete = false;
let difficulty = 'easy';
let backBtn = {}, newBtn = {}, resetBtn = {};
let diffBtns = [];
let timer = 0, timeStr = '0:00';
let _timerInterval = null;

function getCellSize() {
  const avail = Game.BASE_W - PAD * 2 - 8;
  return Math.min(50, Math.floor(avail / cols));
}

function applyPuzzle(data, diff, id) {
  const size = data.size || 5;
  rows = size; cols = size;
  grid = data.grid || [];
  // 初始化空的线条数组（玩家自己画线）
  vLines = Array.from({ length: rows + 1 }, () => Array(cols).fill(false));
  hLines = Array.from({ length: rows }, () => Array(cols + 1).fill(false));
  isComplete = false;
  currentPuzzleId_slither_link = id;
  timer = 0;
  buildButtons();
}

function _generateFallback() {
  rows = difficulty === 'easy' ? 5 : (difficulty === 'medium' ? 6 : 7);
  cols = rows;

  grid = Array.from({ length: rows }, () => Array(cols).fill(0));
  vLines = Array.from({ length: rows + 1 }, () => Array(cols).fill(false));
  hLines = Array.from({ length: rows }, () => Array(cols + 1).fill(false));

  // 生成一个简单回路
  const path = generateSimpleLoop(rows, cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 计算四周线数
      let cnt = 0;
      if (path.has(`${r},${c}-${r-1},${c}`) || path.has(`${r-1},${c}-${r},${c}`)) cnt++;
      if (path.has(`${r},${c}-${r+1},${c}`) || path.has(`${r+1},${c}-${r},${c}`)) cnt++;
      if (path.has(`${r},${c}-${r},${c-1}`) || path.has(`${r},${c-1}-${r},${c}`)) cnt++;
      if (path.has(`${r},${c}-${r},${c+1}`) || path.has(`${r},${c+1}-${r},${c}`)) cnt++;
      grid[r][c] = cnt;
    }
  }

  isComplete = false;
  timer = 0;
}

function generateSimpleLoop(n, m) {
  const path = new Set();
  // 简单矩形
  for (let c = 0; c < m - 1; c++) { path.add(`0,${c}-0,${c+1}`); }
  for (let r = 0; r < n - 1; r++) { path.add(`${r},${m-1}-${r+1},${m-1}`); }
  for (let c = m - 1; c > 0; c--) { path.add(`${n-1},${c}-${n-1},${c-1}`); }
  for (let r = n - 1; r > 0; r--) { path.add(`${r},0-${r-1},0`); }

  // 随机添加/删除几条线
  for (let i = 0; i < 5; i++) {
    const r = Math.floor(Math.random() * n);
    const c = Math.floor(Math.random() * m);
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < n && nc >= 0 && nc < m) {
      const key = `${r},${c}-${nr},${nc}`;
      const rev = `${nr},${nc}-${r},${c}`;
      if (path.has(key) || path.has(rev)) {
        path.delete(key); path.delete(rev);
      } else {
        path.add(key);
      }
    }
  }
  return path;
}

function checkCompletion() {
  // 检查所有边线是否构成闭合回路
  let lineCount = 0;
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (vLines[r][c]) lineCount++;
    }
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      if (hLines[r][c]) lineCount++;
    }
  }
  if (lineCount === 0) return false;

  // BFS检查回路
  // 找到一条线的端点
  let startR = -1, startC = -1, isV = false;
  outer: for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (vLines[r][c]) { startR = r; startC = c; isV = true; break outer; }
    }
  }
  if (startR < 0) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        if (hLines[r][c]) { startR = r; startC = c; isV = false; break; }
      }
    }
  }
  if (startR < 0) return false;

  // 简单检查：所有线必须连成一条闭合路径
  const visited = new Set();
  const queue = [`${startR},${startC},${isV ? 'v' : 'h'}`];
  visited.add(queue[0]);

  while (queue.length > 0) {
    const [r, c, type] = queue.shift().split(',');
    const rr = parseInt(r), cc = parseInt(c);
    // 找相邻线
    const neighbors = [];
    if (type === 'v') {
      if (rr > 0 && vLines[rr - 1][cc]) neighbors.push([rr - 1, cc, 'v']);
      if (rr < rows && vLines[rr + 1][cc]) neighbors.push([rr + 1, cc, 'v']);
      if (hLines[rr] && hLines[rr][cc]) neighbors.push([rr, cc, 'h']);
      if (hLines[rr] && hLines[rr][cc + 1]) neighbors.push([rr, cc + 1, 'h']);
    } else {
      if (cc > 0 && hLines[rr][cc - 1]) neighbors.push([rr, cc - 1, 'h']);
      if (cc < cols && hLines[rr][cc + 1]) neighbors.push([rr, cc + 1, 'h']);
      if (rr > 0 && vLines[rr][cc]) neighbors.push([rr, cc, 'v']);
      if (rr < rows && vLines[rr + 1][cc]) neighbors.push([rr + 1, cc, 'v']);
    }
    for (const [nr, nc, nt] of neighbors) {
      const key = `${nr},${nc},${nt}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(key);
      }
    }
  }

  // 检查数字约束
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let cnt = 0;
      if (vLines[r][c]) cnt++;
      if (vLines[r + 1][c]) cnt++;
      if (hLines[r][c]) cnt++;
      if (hLines[r][c + 1]) cnt++;
      if (grid[r][c] >= 0 && cnt !== grid[r][c]) return false;
    }
  }

  return visited.size === lineCount;
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
  const btnY = 90 + (rows + 1) * cellSize + 10;
  const btnW = (Game.BASE_W - PAD * 2 - 8) / 2;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 30, label: '🔄 重置' };
  newBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 30, label: '🆕 新题' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`数回 · ${timeStr}`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  drawBackBtn();
  diffBtns.forEach(btn => {
    const isActive = btn.id === difficulty;
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    ctx.fillStyle = isActive ? '#667eea' : 'rgba(255,255,255,0.1)';
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 11, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  const cellSize = getCellSize();
  const gridW = (cols + 1) * cellSize;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  // 背景
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(startX, startY, gridW, gridW);

  // 画竖线
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + (c + 1) * cellSize;
      const y = startY + r * cellSize;
      ctx.strokeStyle = vLines[r][c] ? '#667eea' : '#444';
      ctx.lineWidth = vLines[r][c] ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + cellSize);
      ctx.stroke();
    }
  }

  // 画横线
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + (r + 1) * cellSize;
      ctx.strokeStyle = hLines[r][c] ? '#667eea' : '#444';
      ctx.lineWidth = hLines[r][c] ? 3 : 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + cellSize, y);
      ctx.stroke();
    }
  }

  // 画交点
  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      ctx.fillStyle = '#555';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 数字
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      if (grid[r][c] > 0) {
        ctx.font = `bold ${cellSize * 0.5}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(grid[r][c]), x + cellSize / 2, y + cellSize / 2);
      }
    }
  }

  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 28, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('🎉 完成！', Game.BASE_W / 2, newBtn.y - 16, {
      size: 13, bold: true, color: '#667eea', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(newBtn, '#667eea');
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
    vLines = Array.from({ length: rows + 1 }, () => Array(cols).fill(false));
    hLines = Array.from({ length: rows }, () => Array(cols + 1).fill(false));
    isComplete = false;
    return;
  }
  if (Game.hitTest({ x, y }, newBtn)) { loadPuzzle(0); buildButtons(); return; }

  const cellSize = getCellSize();
  const gridW = (cols + 1) * cellSize;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  if (x >= startX && x <= startX + gridW && y >= startY && y <= startY + gridW) {
    const cx = x - startX;
    const cy = y - startY;

    // 判断点击的是哪条边
    const edgeSize = cellSize / 4;
    let handled = false;

    // 检查竖线
    for (let r = 0; r <= rows && !handled; r++) {
      for (let c = 0; c < cols && !handled; c++) {
        const lx = startX + (c + 1) * cellSize;
        const ly = startY + r * cellSize;
        if (Math.abs(cx - (c + 1) * cellSize) < edgeSize && cy >= ly && cy <= ly + cellSize) {
          vLines[r][c] = !vLines[r][c];
          handled = true;
        }
      }
    }

    // 检查横线
    for (let r = 0; r < rows && !handled; r++) {
      for (let c = 0; c <= cols && !handled; c++) {
        const ly = startY + (r + 1) * cellSize;
        if (Math.abs(cy - (r + 1) * cellSize) < edgeSize && cx >= c * cellSize && cx <= (c + 1) * cellSize) {
          hLines[r][c] = !hLines[r][c];
          handled = true;
        }
      }
    }

    if (checkCompletion()) isComplete = true;
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
