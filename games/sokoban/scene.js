/**
 * sokoban - 推箱子 (Sokoban) 场景 (Canvas版)
 * 将所有箱子推到目标位置
 */
const Game = require('../../utils/game-core.js');

// ========== CDN 题库加载 ==========
const CDN_BASE_sokoban = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data/sokoban';
const PUZZLE_COUNTS_sokoban = {"easy":48,"medium":38,"hard":8};
let currentPuzzleId_sokoban = 0;
let isLoading_sokoban = false;

function loadPuzzle(puzzleId) {
  if (isLoading_sokoban) return;
  isLoading_sokoban = true;
  const diff = difficulty;
  const id = puzzleId !== undefined ? puzzleId : currentPuzzleId_sokoban;
  const count = PUZZLE_COUNTS_sokoban[diff] || 1000;
  const actualId = id % count;
  const filename = diff + '/' + diff + '-' + String(actualId + 1).padStart(4, '0') + '.json';
  const cacheKey = 'cdn_sokoban_' + diff + '_' + String(actualId + 1).padStart(4, '0');

  // 本地缓存
  try {
    const cached = wx.getStorageSync(cacheKey);
    if (cached && cached.grid) {
      applyPuzzle(cached, diff, actualId);
      isLoading_sokoban = false;
      return;
    }
  } catch(e) {}

  console.info('[sokoban] CDN加载: ' + filename);
  wx.request({
    url: CDN_BASE_sokoban + '/' + filename,
    timeout: 10000,
    success(res) {
      if (res.statusCode === 200 && res.data && res.data.grid) {
        try { wx.setStorageSync(cacheKey, res.data); } catch(e) {}
        applyPuzzle(res.data, diff, actualId);
      } else {
        console.warn('[sokoban] CDN数据错误, 使用本地生成');
        _generateFallback();
      }
    },
    fail(err) {
      console.warn('[sokoban] CDN请求失败, 使用本地生成', err);
      _generateFallback();
    },
    complete() {
      isLoading_sokoban = false;
    }
  });
}

function loadLevel(data) {
  applyPuzzle(data, data.difficulty || difficulty, data.id ? data.id - 1 : 0);
}

function applyPuzzle(data, diff, id) {
 const r = data.rows || 6, c = data.cols || 6;
  // 将CDN grid(0=空,1=墙)转换为map
  map = data.grid || Array.from({length: r}, () => Array(c).fill(0));
  boxes = (data.boxes || []).map(b => ({r: b[0], c: b[1]}));
  targets = (data.goals || []).map(g => ({r: g[0], c: g[1]}));
  if (data.playerStart) { playerR = data.playerStart[0]; playerC = data.playerStart[1]; }
  moves = 0;
  isComplete = false;
  currentPuzzleId_sokoban = id;
  canvasH = map.length * cellSize;
  buildButtons();
  calcCellSize();
}

function _generateFallback() {
  parseLevel(level);
  buildButtons();
  calcCellSize();
}


const PAD = 15;

let level = 0;
let map = [];     // 地图数组
let boxes = [];   // 箱子位置 [{r, c}]
let targets = []; // 目标位置 [{r, c}]
let playerR = 0, playerC = 0;
let moves = 0;
let isComplete = false;
let backBtn = {}, resetBtn = {}, levelBtn = {};
let cellSize = 36;
let canvasH = 0;

// 关卡定义：0=空, 1=墙, 2=目标, 3=箱子, 4=玩家
// 简化格式: '#'=墙, '.'=空, 'X'=目标, '$'=箱子, '@'=玩家, '*'=箱+目标, '+'=玩+目标
const LEVELS = [
  { name: '第1关', map: [
    '#######',
    '#.....#',
    '#.$.$.#',
    '#.X.X.#',
    '#..@..#',
    '#.....#',
    '#######'
  ]},
  { name: '第2关', map: [
    '########',
    '#......#',
    '#.$#$.@#',
    '#.X.X..#',
    '#.X.X..#',
    '#......#',
    '########'
  ]},
  { name: '第3关', map: [
    '#########',
    '#.......#',
    '#.$.$.$.#',
    '#.X.X.X.#',
    '#...@...#',
    '#.X.X.X.#',
    '#.$.$.$.#',
    '#.......#',
    '#########'
  ]},
];

function parseLevel(lvlIdx) {
  const lvl = LEVELS[lvlIdx % LEVELS.length];
  const rows = lvl.map.length;
  let cols = 0;
  map = [];
  boxes = [];
  targets = [];
  playerR = 0; playerC = 0;

  for (const line of lvl.map) {
    cols = Math.max(cols, line.length);
    const row = [];
    for (const ch of line) {
      switch (ch) {
        case '#': row.push(1); break;
        case '.': row.push(0); break;
        case 'X': row.push(2); targets.push({ r: map.length, c: row.length }); break;
        case '$': row.push(0); boxes.push({ r: map.length, c: row.length }); break;
        case '@': row.push(0); playerR = map.length; playerC = row.length; break;
        case '*': row.push(2); targets.push({ r: map.length, c: row.length }); boxes.push({ r: map.length, c: row.length }); break;
        case '+': row.push(2); targets.push({ r: map.length, c: row.length }); playerR = map.length; playerC = row.length; break;
        default: row.push(0);
      }
    }
    map.push(row);
  }

  // 标准化每行长度
  for (let r = 0; r < map.length; r++) {
    while (map[r].length < cols) map[r].push(1);
  }

  moves = 0;
  isComplete = false;
  canvasH = map.length * cellSize;
}

function isWall(r, c) {
  if (r < 0 || r >= map.length || c < 0 || c >= map[0].length) return true;
  return map[r][c] === 1;
}

function getBox(r, c) {
  return boxes.findIndex(b => b.r === r && b.c === c);
}

function tryMove(dr, dc) {
  if (isComplete) return;
  const nr = playerR + dr, nc = playerC + dc;
  if (isWall(nr, nc)) return;

  const boxIdx = getBox(nr, nc);
  if (boxIdx >= 0) {
    const br = nr + dr, bc = nc + dc;
    if (isWall(br, bc) || getBox(br, bc) >= 0) return;
    boxes[boxIdx] = { r: br, c: bc };
  }

  playerR = nr; playerC = nc;
  moves++;

  // 检查完成
  isComplete = boxes.every(b => targets.some(t => t.r === b.r && t.c === b.c));
}

function onEnter() {
  loadPuzzle(currentPuzzleId_sokoban);
}

function onExit() {}

function update(dt) {}

function calcCellSize() {
  const availW = Game.BASE_W - PAD * 2;
  const availH = 480;
  cellSize = Math.max(28, Math.min(Math.floor(availW / map[0].length), Math.floor(availH / map.length)));
}

function buildButtons() {
  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };
  const btnY = 90 + canvasH + 10;
  const btnW = (Game.BASE_W - PAD * 2 - 8) / 2;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 32, label: '🔄 重置' };
  levelBtn = { x: PAD + btnW + 8, y: btnY, w: btnW, h: 32, label: '🆕 下一关' };
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  const lvlName = LEVELS[level % LEVELS.length].name;
  Game.drawText(`${lvlName} · 推箱子`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });
  Game.drawText(`步数: ${moves}`, Game.BASE_W / 2, 38, {
    size: 11, color: Game.THEME.textGray, align: 'center'
  });

  drawBackBtn();

  const rows = map.length, cols = map[0].length;
  const gridW = cols * cellSize;
  const startX = (Game.BASE_W - gridW) / 2;
  const startY = 90;

  // 绘制
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = startX + c * cellSize;
      const y = startY + r * cellSize;
      const cell = map[r][c];

      if (cell === 1) {
        // 墙
        ctx.fillStyle = '#636e72';
        ctx.fillRect(x, y, cellSize, cellSize);
      } else {
        // 空地/目标
        ctx.fillStyle = (r + c) % 2 === 0 ? '#f0f0f0' : '#e8e8e8';
        ctx.fillRect(x, y, cellSize, cellSize);

        if (cell === 2) {
          // 目标
          ctx.strokeStyle = '#e17055';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 边框
      ctx.strokeStyle = '#ccc';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 箱子
  for (const b of boxes) {
    const x = startX + b.c * cellSize;
    const y = startY + b.r * cellSize;
    const onTarget = targets.some(t => t.r === b.r && t.c === b.c);

    Game.roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
    ctx.fillStyle = onTarget ? '#4ecdc4' : '#e17055';
    ctx.fill();
    ctx.strokeStyle = onTarget ? '#00b894' : '#d63031';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (onTarget) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${cellSize * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✓', x + cellSize / 2, y + cellSize / 2);
    }
  }

  // 玩家
  const px = startX + playerC * cellSize + cellSize / 2;
  const py = startY + playerR * cellSize + cellSize / 2;
  ctx.fillStyle = '#667eea';
  ctx.beginPath();
  ctx.arc(px, py, cellSize * 0.38, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#764ba2';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 完成提示
  if (isComplete) {
    Game.drawCard(PAD, levelBtn.y - 36, Game.BASE_W - PAD * 2, 28, 6);
    Game.drawText('🎉 过关！', Game.BASE_W / 2, levelBtn.y - 22, {
      size: 14, bold: true, color: '#4ecdc4', align: 'center', baseline: 'middle'
    });
  }

  drawBtn(resetBtn, 'rgba(255,255,255,0.1)');
  drawBtn(levelBtn, '#e17055');
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
  if (Game.hitTest({ x, y }, resetBtn)) { parseLevel(level); return; }
  if (Game.hitTest({ x, y }, levelBtn)) {
    currentPuzzleId_sokoban++;
    loadPuzzle(currentPuzzleId_sokoban);
    return;
  }

  // 点击控制区（棋盘下方）
  const rows = map.length;
  const canvasH2 = rows * cellSize;
  const startY = 90;
  const ctrlY = startY + canvasH2;

  if (y >= ctrlY) {
    const gridW = map[0].length * cellSize;
    const startX = (Game.BASE_W - gridW) / 2;
    const relX = x - startX;
    const relY = y - ctrlY;

    if (relX < 0 || relX > gridW || relY < 0) return;

    const col = Math.floor(relX / cellSize);
    const row = Math.floor(relY / cellSize);

    // 虚拟方向控制
    if (row === 0) {
      if (col === 0) tryMove(0, -1);       // 左
      else if (col === 2) tryMove(0, 1);   // 右
      else if (col === 1) tryMove(-1, 0); // 上
    } else if (row === 1 && col === 1) {
      tryMove(1, 0); // 下
    }
  } else {
    // 点击棋盘直接移动
    const gridW = map[0].length * cellSize;
    const startX = (Game.BASE_W - gridW) / 2;
    if (x >= startX && x <= startX + gridW && y >= startY && y <= startY + canvasH2) {
      const c = Math.floor((x - startX) / cellSize);
      const r = Math.floor((y - startY) / cellSize);
      if (r >= 0 && r < rows && c >= 0 && c < map[0].length) {
        const dr = r - playerR, dc = c - playerC;
        if (Math.abs(dr) + Math.abs(dc) === 1) {
          tryMove(dr, dc);
        }
      }
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart , loadLevel,};
