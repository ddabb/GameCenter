/**
 * number-one - 消消乐场景 (Canvas版)
 * 点击相邻同色方块消除得分
 */
const Game = require('../../utils/game-core.js');

const PAD = 15;
const COLS = 8;
const ROWS = 10;
const CELL_W = (Game.BASE_W - PAD * 2) / COLS;
const CELL_H = 36;
const GRID_Y = 80;

// 颜色
const COLORS = ['#f5576c', '#4ecdc4', '#667eea', '#fdcb6e', '#e84393', '#00b894'];
const COLOR_COUNT = 5;

let grid = [];
let score = 0;
let combo = 0;
let message = '';
let messageTimer = 0;
let backBtn = {};
let newBtn = {};
let gridRects = [];

function generateGrid() {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push([]);
    for (let c = 0; c < COLS; c++) {
      grid[r].push(Math.floor(Math.random() * COLOR_COUNT));
    }
  }
  score = 0;
  combo = 0;
  message = '';
  buildRects();
}

function buildRects() {
  gridRects = [];
  const gridW = CELL_W * COLS;
  const startX = (Game.BASE_W - gridW) / 2;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      gridRects.push({
        x: startX + c * CELL_W,
        y: GRID_Y + r * CELL_H,
        w: CELL_W,
        h: CELL_H,
        r: r,
        c: c
      });
    }
  }
}

function dropDown() {
  for (let c = 0; c < COLS; c++) {
    let writeRow = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (grid[r][c] >= 0) {
        if (writeRow !== r) {
          grid[writeRow][c] = grid[r][c];
          grid[r][c] = -1;
        }
        writeRow--;
      }
    }
    while (writeRow >= 0) {
      grid[writeRow][c] = Math.floor(Math.random() * COLOR_COUNT);
      writeRow--;
    }
  }
}

function findGroup(startR, startC, color) {
  const visited = new Set();
  const group = [];
  const stack = [[startR, startC]];

  while (stack.length > 0) {
    const [r, c] = stack.pop();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
    if (grid[r][c] !== color || color < 0) continue;

    visited.add(key);
    group.push([r, c]);

    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return group;
}

function onEnter() {
  generateGrid();
  buildButtons();
}

function onExit() {}

function buildButtons() {
  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };
  newBtn = { x: PAD, y: GRID_Y + ROWS * CELL_H + 12, w: Game.BASE_W - PAD * 2, h: 36, label: '🔄 新游戏' };
}

function update(dt) {
  if (messageTimer > 0) messageTimer -= dt;
}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText('消消乐', Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  Game.drawText(`得分: ${score}`, Game.BASE_W / 2, 38, {
    size: 12, color: Game.THEME.textGray, align: 'center'
  });

  // 返回
  drawBackBtn();

  // 格子
  const gridW = CELL_W * COLS;
  const startX = (Game.BASE_W - gridW) / 2;

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = startX + c * CELL_W;
      const y = GRID_Y + r * CELL_H;
      const colorIdx = grid[r][c];

      if (colorIdx < 0) continue;

      const color = COLORS[colorIdx];
      Game.roundRect(ctx, x + 1, y + 1, CELL_W - 2, CELL_H - 2, 6);
      ctx.fillStyle = color;
      ctx.fill();

      // 阴影高光
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x + 2, y + 2, CELL_W - 4, CELL_H / 2 - 2);
      ctx.restore();
    }
  }

  // 消息
  if (message && messageTimer > 0) {
    const alpha = Math.min(1, messageTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    Game.drawCard(PAD, GRID_Y + ROWS * CELL_H - 50, Game.BASE_W - PAD * 2, 30, 8);
    Game.drawText(message, Game.BASE_W / 2, GRID_Y + ROWS * CELL_H - 35, {
      size: 14, bold: true, color: '#4ecdc4', align: 'center', baseline: 'middle'
    });
    ctx.restore();
  }

  // 新游戏
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
    size: 13, color: '#fff', align: 'center', baseline: 'middle'
  });
}

let lastTouch = null;

function onTouchStart(x, y) {
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  if (Game.hitTest({ x, y }, newBtn)) {
    generateGrid();
    return;
  }

  const gridW = CELL_W * COLS;
  const startX = (Game.BASE_W - gridW) / 2;

  if (x >= startX && x <= startX + gridW && y >= GRID_Y && y <= GRID_Y + ROWS * CELL_H) {
    const c = Math.floor((x - startX) / CELL_W);
    const r = Math.floor((y - GRID_Y) / CELL_H);
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
      const color = grid[r][c];
      if (color < 0) return;

      const group = findGroup(r, c, color);
      if (group.length >= 2) {
        const pts = group.length * (group.length - 1);
        score += pts;
        combo++;
        message = `+${pts}分 ${group.length}连消！`;

        for (const [gr, gc] of group) {
          grid[gr][gc] = -1;
        }
        messageTimer = 1.5;
        dropDown();
      }
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart };
