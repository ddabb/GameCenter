/**
 * frog-escape - 青蛙跳场景 (Canvas版)
 * 经典青蛙跳河游戏，帮助青蛙跳到荷叶上
 */
const Game = require('../../utils/game-core.js');

const PAD = 15;
const ROWS = 5;
const COLS = 6;
const CELL_W = (Game.BASE_W - PAD * 2) / COLS;
const CELL_H = 52;
const GRID_Y = 90;

// CELL类型: 0=空地, 1=荷叶, 2=障碍(石头)
const TYPE_EMPTY = 0;
const TYPE_LILY = 1;
const TYPE_ROCK = 2;

let grid = [];  // grid[row][col]
let frogR = 0, frogC = 2; // 青蛙位置
let goalR = 4; // 目标行
let moveCount = 0;
let isComplete = false;
let level = 1;
let backBtn = {};
let resetBtn = {};
let newBtn = {};

function generateLevel(lvl) {
  grid = [];
  for (let r = 0; r < ROWS; r++) {
    grid.push([]);
    for (let c = 0; c < COLS; c++) {
      if (r === goalR) {
        // 目标行：一定有荷叶
        grid[r].push(TYPE_LILY);
      } else if (r === 0) {
        // 第一行：全是空地
        grid[r].push(TYPE_EMPTY);
      } else {
        const rand = Math.random();
        if (rand < 0.3) grid[r].push(TYPE_ROCK);
        else if (rand < 0.7) grid[r].push(TYPE_LILY);
        else grid[r].push(TYPE_EMPTY);
      }
    }
  }
  // 确保起点是空地
  grid[frogR][frogC] = TYPE_EMPTY;
  // 确保目标行有荷叶
  grid[goalR][frogC] = TYPE_LILY;
  moveCount = 0;
  isComplete = false;
}

function buildButtons() {
  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };
  const btnY = GRID_Y + ROWS * CELL_H + 14;
  const btnW = (Game.BASE_W - PAD * 2 - 10) / 2;
  resetBtn = { x: PAD, y: btnY, w: btnW, h: 32, label: '🔄 重置' };
  newBtn = { x: PAD + btnW + 10, y: btnY, w: btnW, h: 32, label: '🆕 下一关' };
}

function onEnter() {
  generateLevel(level);
  buildButtons();
}

function onExit() {}

function update(dt) {}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  Game.drawText(`青蛙跳 · 第${level}关`, Game.BASE_W / 2, 10, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });
  Game.drawText(`步数: ${moveCount}`, Game.BASE_W / 2, 38, {
    size: 11, color: Game.THEME.textGray, align: 'center'
  });

  // 返回
  drawBackBtn();

  // 游戏区域背景
  const gridW = CELL_W * COLS;
  const startX = (Game.BASE_W - gridW) / 2;

  // 画行
  for (let r = 0; r < ROWS; r++) {
    const y = GRID_Y + r * CELL_H;
    const isGoal = r === goalR;

    for (let c = 0; c < COLS; c++) {
      const x = startX + c * CELL_W;
      const cell = grid[r][c];

      // 行背景色
      if (isGoal) {
        ctx.fillStyle = 'rgba(0, 206, 201, 0.1)';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
      }
      ctx.fillRect(x, y, CELL_W, CELL_H);

      // 行分割线
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + gridW, y);
      ctx.stroke();

      if (cell === TYPE_LILY) {
        // 荷叶
        ctx.save();
        Game.roundRect(ctx, x + 4, y + 6, CELL_W - 8, CELL_H - 10, 12);
        ctx.fillStyle = '#00b894';
        ctx.fill();
        ctx.restore();
      } else if (cell === TYPE_ROCK) {
        // 石头
        Game.roundRect(ctx, x + 4, y + 8, CELL_W - 8, CELL_H - 14, 6);
        ctx.fillStyle = '#636e72';
        ctx.fill();
      }
    }
    // 行分隔
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(startX, y + CELL_H);
    ctx.lineTo(startX + gridW, y + CELL_H);
    ctx.stroke();
  }

  // 青蛙
  if (!isComplete) {
    const fx = startX + frogC * CELL_W + CELL_W / 2;
    const fy = GRID_Y + frogR * CELL_H + CELL_H / 2;
    // 身体
    Game.drawCircle(fx, fy + 2, CELL_W * 0.35, { fill: '#00cec9' });
    // 头
    Game.drawCircle(fx, fy - 6, CELL_W * 0.22, { fill: '#00cec9' });
    // 眼睛
    Game.drawCircle(fx - 4, fy - 8, 2, { fill: '#fff' });
    Game.drawCircle(fx + 4, fy - 8, 2, { fill: '#fff' });
  }

  // 完成提示
  if (isComplete) {
    Game.drawCard(PAD, newBtn.y - 36, Game.BASE_W - PAD * 2, 28, 8);
    Game.drawText('🐸 到达彼岸！', Game.BASE_W / 2, newBtn.y - 22, {
      size: 14, bold: true, color: '#00cec9', align: 'center', baseline: 'middle'
    });
  }

  // 按钮
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
    size: 12, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function tryMove(dr, dc) {
  if (isComplete) return;
  const nr = frogR + dr;
  const nc = frogC + dc;
  if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
  if (grid[nr][nc] === TYPE_ROCK) return;
  frogR = nr;
  frogC = nc;
  moveCount++;

  if (frogR === goalR) {
    isComplete = true;
    level++;
  }
}

function onTouchStart(x, y) {
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  if (Game.hitTest({ x, y }, resetBtn)) {
    generateLevel(level);
    return;
  }

  if (Game.hitTest({ x, y }, newBtn)) {
    generateLevel(level);
    return;
  }

  // 点击控制区
  const ctrlY = GRID_Y + ROWS * CELL_H + 60;
  const ctrlH = 60;
  if (y >= ctrlY) {
    // 方向控制：点击棋盘左中右区域
    const gridW = CELL_W * COLS;
    const startX = (Game.BASE_W - gridW) / 2;
    const relX = x - startX;
    const col = Math.floor(relX / CELL_W);

    if (y < ctrlY + ctrlH / 2) {
      // 上半区
      if (frogC === col) tryMove(-1, 0);
      else tryMove(-1, col > frogC ? 1 : -1);
    } else {
      // 下半区
      if (frogC === col) tryMove(1, 0);
      else tryMove(1, col > frogC ? 1 : -1);
    }
  }
}

module.exports = { onEnter, onExit, update, render, onTouchStart };
