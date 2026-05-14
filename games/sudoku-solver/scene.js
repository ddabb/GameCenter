/**
 * 数独求解器场景 (Canvas版)
 * 规则：输入数独题目，点击求解
 */
const Game = require('../../utils/game-core.js');
const sudoku = require('../../utils/sudoku.js');

// CDN 数据源
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data';
const DAILY_CACHE_PREFIX = 'cdn_daily_sudoku_';
const DAILY_TS_PREFIX = 'cdn_daily_sudoku_ts_';

// ============== 布局常量 ==============
const PAD = 15;
const BOARD_SIZE = Math.min(Game.BASE_W - PAD * 2, 350);
const CELL_SIZE = BOARD_SIZE / 9;
const GRID_X = (Game.BASE_W - BOARD_SIZE) / 2;
const GRID_Y = 80;

// 数字按钮区
const NUM_BTN_SIZE = (Game.BASE_W - PAD * 2 - 8 * 6) / 5;
const NUM_START_Y = GRID_Y + BOARD_SIZE + 20;
const NUM_COLS = 5;

// 底部按钮
const BTN_Y = Game.BASE_H - 90;
const BTN_H = 42;

// ============== 状态 ==============
let board = []; // 9x9 board
let rawBoard = []; // 纯数字 9x9
let fixedCells = []; // 9x9 boolean
let candidates = []; // 9x9x9
let selectedCell = { row: -1, col: -1 };
let mode = 'daily'; // 'daily' | 'paste'
let showCandidates = false;
let solving = false;
let hasSolution = false;
let selectedDate = formatDate(new Date());
let dailyTitle = '';
let dailyLevel = '';
let dailyDifficulty = '';
let soundEnabled = true;
let pasteText = '';
let showPasteInput = false;

// 按钮热区
let numButtons = [];
let actionButtons = [];
let modeTabs = [];
let backBtn = {};

// ============== 工具函数 ==============
function pad2(v) { return String(v).padStart(2, '0'); }
function formatDate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function formatDateKey(d) { return d.replace(/-/g, ''); }
function formatDateDisplay(d) {
  const [y, m, day] = d.split('-');
  return `${y}年${Number(m)}月${Number(day)}日`;
}

function initBoard() {
  board = [];
  rawBoard = [];
  fixedCells = [];
  candidates = [];
  for (let r = 0; r < 9; r++) {
    board[r] = [];
    rawBoard[r] = [];
    fixedCells[r] = [];
    candidates[r] = [];
    for (let c = 0; c < 9; c++) {
      board[r][c] = '';
      rawBoard[r][c] = 0;
      fixedCells[r][c] = false;
      candidates[r][c] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }
  selectedCell = { row: -1, col: -1 };
  hasSolution = false;
  showCandidates = false;
}

function loadPuzzle(puzzle) {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const num = puzzle[r][c];
      rawBoard[r][c] = num;
      board[r][c] = num === 0 ? '' : String(num);
      fixedCells[r][c] = num !== 0;
    }
  }
  selectedCell = { row: -1, col: -1 };
  hasSolution = false;
}

function calcCandidates() {
  if (!showCandidates) return;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      candidates[r][c] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (rawBoard[r][c] !== 0) continue;
      const used = new Set();
      for (let i = 0; i < 9; i++) {
        if (rawBoard[r][i] !== 0) used.add(rawBoard[r][i]);
        if (rawBoard[i][c] !== 0) used.add(rawBoard[i][c]);
      }
      const br = Math.floor(r / 3) * 3;
      const bc = Math.floor(c / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (rawBoard[br + i][bc + j] !== 0) used.add(rawBoard[br + i][bc + j]);
        }
      }
      for (let n = 1; n <= 9; n++) {
        if (!used.has(n)) candidates[r][c][n - 1] = n;
      }
    }
  }
}

function buildButtons() {
  modeTabs = [
    { x: PAD, y: 28, w: 100, h: 30, label: '每日数独', mode: 'daily' },
    { x: PAD + 108, y: 28, w: 80, h: 30, label: '粘贴题目', mode: 'paste' }
  ];

  numButtons = [];
  const numW = (Game.BASE_W - PAD * 2 - 4 * 8) / 5;
  const numH = 44;
  for (let n = 1; n <= 9; n++) {
    const col = (n - 1) % 5;
    const row = Math.floor((n - 1) / 5);
    numButtons.push({
      x: PAD + col * (numW + 8),
      y: NUM_START_Y + row * (numH + 6),
      w: numW,
      h: numH,
      label: String(n),
      num: n,
      type: 'num'
    });
  }
  // 候选数、清除、重置
  const extras = [
    { label: showCandidates ? '💡' : '🔴', type: 'candidates' },
    { label: '清', type: 'clear' },
    { label: '重置', type: 'reset' },
    { label: '↩', type: 'undo' },
  ];
  const extraW = (Game.BASE_W - PAD * 2 - 3 * 8) / 4;
  extras.forEach((ex, i) => {
    numButtons.push({
      x: PAD + i * (extraW + 8),
      y: NUM_START_Y + 2 * (numH + 6),
      w: extraW,
      h: numH,
      label: ex.label,
      type: ex.type
    });
  });

  actionButtons = [
    { x: PAD, y: BTN_Y, w: 80, h: BTN_H, label: '清空', color: '#6c757d' },
    { x: PAD + 88, y: BTN_Y, w: 100, h: BTN_H, label: solving ? '求解中...' : '🔍 求解', color: '#ff7f4d' },
    { x: Game.BASE_W - PAD - 80, y: BTN_Y, w: 80, h: BTN_H, label: soundEnabled ? '🔊' : '🔇', color: '#667eea' },
  ];

  backBtn = { x: PAD, y: 10, w: 50, h: 28, label: '←返回' };
}

function parsePuzzle(text) {
  text = text.trim().replace(/\s/g, '');
  if (/^[0-9.]{81}$/.test(text)) {
    const p = [];
    for (let i = 0; i < 9; i++) p[i] = [];
    for (let i = 0; i < 81; i++) {
      const ch = text[i];
      p[Math.floor(i / 9)][i % 9] = (ch === '.' || ch === '0') ? 0 : parseInt(ch);
    }
    return p;
  }
  return null;
}

function loadDailySudoku(dateStr) {
  const cacheKey = DAILY_CACHE_PREFIX + formatDateKey(dateStr);
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.puzzle) {
    selectedDate = dateStr;
    dailyTitle = cached.name || formatDateDisplay(dateStr);
    dailyLevel = cached.level || '';
    dailyDifficulty = cached.difficulty || '';
    loadPuzzle(cached.puzzle);
    return;
  }

  wx.showLoading({ title: '加载中...' });
  wx.request({
    url: `${CDN_BASE}/sudoku/${formatDateKey(dateStr)}.json`,
    timeout: 8000,
    success: (res) => {
      wx.hideLoading();
      if (res.statusCode === 200 && res.data && res.data.puzzle) {
        wx.setStorageSync(cacheKey, res.data);
        selectedDate = dateStr;
        dailyTitle = res.data.name || formatDateDisplay(dateStr);
        dailyLevel = res.data.level || '';
        dailyDifficulty = res.data.difficulty || '';
        loadPuzzle(res.data.puzzle);
      } else {
        generateRandom(dateStr);
      }
    },
    fail: () => {
      wx.hideLoading();
      generateRandom(dateStr);
    }
  });
}

function generateRandom(dateStr) {
  try {
    const full = sudoku.generateFullBoard();
    const puzzle = sudoku.createPuzzle(full, 40);
    selectedDate = dateStr;
    dailyTitle = formatDateDisplay(dateStr) + ' 数独';
    dailyLevel = '★★☆☆☆';
    dailyDifficulty = '中等';
    loadPuzzle(puzzle);
  } catch (e) {
    // 本地备用
    const backup = [
      [5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],[0,9,8,0,0,0,0,6,0],
      [8,0,0,0,6,0,0,0,3],[4,0,0,8,0,3,0,0,1],[7,0,0,0,2,0,0,0,6],
      [0,6,0,0,0,0,2,8,0],[0,0,0,4,1,9,0,0,5],[0,0,0,0,8,0,0,7,9]
    ];
    selectedDate = dateStr;
    dailyTitle = formatDateDisplay(dateStr) + ' 数独';
    dailyLevel = '★☆☆☆☆';
    dailyDifficulty = '简单';
    loadPuzzle(backup);
  }
}

function solveSudoku() {
  if (solving) return;
  solving = true;
  buildButtons(); // rebuild to show solving state

  setTimeout(() => {
    if (!sudoku.isValidInput(rawBoard)) {
      solving = false;
      wx.showToast({ title: '输入无效', icon: 'none' });
      buildButtons();
      return;
    }
    const copy = rawBoard.map(r => [...r]);
    if (!sudoku.solve(copy)) {
      solving = false;
      wx.showToast({ title: '无解', icon: 'none' });
      buildButtons();
      return;
    }
    // 应用解
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!fixedCells[r][c]) {
          rawBoard[r][c] = copy[r][c];
          board[r][c] = String(copy[r][c]);
          candidates[r][c] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        }
      }
    }
    hasSolution = true;
    solving = false;
    wx.showToast({ title: '✅ 求解成功', icon: 'none' });
    buildButtons();
  }, 50);
}

// ============== 场景接口 ==============
function onEnter() {
  initBoard();
  mode = 'daily';
  buildButtons();
  loadDailySudoku(selectedDate);
}

function onExit() {}

function update(dt) {}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  // 顶部
  Game.drawText('数独求解器', Game.BASE_W / 2, 14, {
    size: 16, bold: true, color: Game.THEME.accent, align: 'center'
  });

  // 返回按钮
  Game.roundRect(ctx, backBtn.x, backBtn.y, backBtn.w, backBtn.h, 6);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  Game.drawText('←', backBtn.x + backBtn.w / 2, backBtn.y + backBtn.h / 2, {
    size: 14, color: '#fff', align: 'center', baseline: 'middle'
  });

  // 模式标签
  modeTabs.forEach(tab => {
    const active = tab.mode === mode;
    Game.roundRect(ctx, tab.x, tab.y, tab.w, tab.h, 8);
    ctx.fillStyle = active ? Game.THEME.primary : 'rgba(255,255,255,0.08)';
    ctx.fill();
    Game.drawText(tab.label, tab.x + tab.w / 2, tab.y + tab.h / 2, {
      size: 10, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 每日数独标题
  if (mode === 'daily') {
    Game.drawText(dailyTitle, Game.BASE_W / 2, 66, {
      size: 11, color: Game.THEME.textGray, align: 'center'
    });
    if (dailyLevel) {
      Game.drawText(dailyLevel + ' · ' + dailyDifficulty, Game.BASE_W / 2, 80, {
        size: 9, color: Game.THEME.warning, align: 'center'
      });
    }
  }

  // 粘贴模式
  if (mode === 'paste') {
    if (showPasteInput) {
      // 简易提示：点击"导入"按钮粘贴内容
      Game.drawCard(PAD, 60, Game.BASE_W - PAD * 2, 50, 8);
      Game.drawText('在下方按钮区粘贴81位字符串', Game.BASE_W / 2, 85, {
        size: 10, color: Game.THEME.textGray, align: 'center'
      });
    }
  }

  // ============== 绘制棋盘 ==============
  const bx = GRID_X;
  const by = mode === 'paste' ? 120 : (dailyTitle ? 95 : 65);
  const bw = BOARD_SIZE;

  // 棋盘背景
  Game.roundRect(ctx, bx, by, bw, bw, 4);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // 绘制格子
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cx = bx + c * CELL_SIZE;
      const cy = by + r * CELL_SIZE;
      const cell = board[r][c];
      const fixed = fixedCells[r][c];
      const selected = selectedCell.row === r && selectedCell.col === c;
      const hasVal = cell !== '';

      // 单元格背景
      if (selected) {
        ctx.fillStyle = 'rgba(102, 126, 234, 0.25)';
        ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
      } else if (fixed) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
      } else if (showCandidates && candidates[r][c].some(v => v > 0)) {
        ctx.fillStyle = 'rgba(78, 205, 196, 0.05)';
        ctx.fillRect(cx, cy, CELL_SIZE, CELL_SIZE);
      }

      // 绘制内容
      if (hasVal) {
        const isFixed = fixedCells[r][c];
        ctx.font = `bold ${CELL_SIZE * 0.55}px sans-serif`;
        ctx.fillStyle = isFixed ? '#2c3e50' : '#4ecdc4';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell, cx + CELL_SIZE / 2, cy + CELL_SIZE / 2);
      } else if (showCandidates) {
        // 绘制候选数
        const cand = candidates[r][c];
        const subSize = CELL_SIZE / 3;
        for (let n = 1; n <= 9; n++) {
          const idx = n - 1;
          const sr = Math.floor((n - 1) / 3);
          const sc = (n - 1) % 3;
          if (cand[idx] === n) {
            ctx.font = `${Math.max(7, subSize * 0.45)}px sans-serif`;
            ctx.fillStyle = '#4ecdc4';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(n), cx + sc * subSize + subSize / 2, cy + sr * subSize + subSize / 2);
          }
        }
      }

      // 绘制网格线
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(cx, cy, CELL_SIZE, CELL_SIZE);
      // 粗线
      if (c === 2 || c === 5) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + CELL_SIZE, cy);
        ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE);
        ctx.stroke();
      }
      if (r === 2 || r === 5) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy + CELL_SIZE);
        ctx.lineTo(cx + CELL_SIZE, cy + CELL_SIZE);
        ctx.stroke();
      }
    }
  }

  // 外边框
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bw);

  // 选中的格子信息
  if (selectedCell.row >= 0) {
    const selInfo = `第${selectedCell.row + 1}行 第${selectedCell.col + 1}列`;
    Game.drawText(selInfo, Game.BASE_W / 2, NUM_START_Y - 8, {
      size: 9, color: Game.THEME.textGray, align: 'center'
    });
  }

  // ============== 数字按钮 ==============
  numButtons.forEach(btn => {
    if (btn.type === 'num') {
      Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = selectedCell.row >= 0 ? '#f8f9fa' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
        size: 16, bold: true, color: selectedCell.row >= 0 ? '#333' : '#555', align: 'center', baseline: 'middle'
      });
    } else if (btn.type === 'candidates') {
      Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = showCandidates ? '#2980b9' : 'rgba(52, 152, 219, 0.3)';
      ctx.fill();
      Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
        size: 16, align: 'center', baseline: 'middle'
      });
    } else if (btn.type === 'clear') {
      Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = '#e74c3c';
      ctx.fill();
      Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
        size: 14, bold: true, color: '#fff', align: 'center', baseline: 'middle'
      });
    } else if (btn.type === 'reset') {
      Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = '#95a5a6';
      ctx.fill();
      Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
        size: 12, bold: true, color: '#fff', align: 'center', baseline: 'middle'
      });
    } else if (btn.type === 'undo') {
      Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 8);
      ctx.fillStyle = '#667eea';
      ctx.fill();
      Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
        size: 14, bold: true, color: '#fff', align: 'center', baseline: 'middle'
      });
    }
  });

  // ============== 底部按钮 ==============
  actionButtons.forEach((btn, i) => {
    Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 10);
    ctx.fillStyle = btn.color;
    ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 13, bold: true, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 粘贴模式：输入框区域
  if (mode === 'paste') {
    // 绘制一个"粘贴输入"提示区
    const inputY = NUM_START_Y - 5;
    Game.drawCard(PAD, inputY, Game.BASE_W - PAD * 2, 38, 8);
    Game.drawText('粘贴81位字符串 (0或.为空)', Game.BASE_W / 2, inputY + 19, {
      size: 10, color: Game.THEME.textGray, align: 'center', baseline: 'middle'
    });
  }
}

function onTouchStart(x, y) {
  // 返回
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  // 模式切换
  for (const tab of modeTabs) {
    if (Game.hitTest({ x, y }, tab)) {
      mode = tab.mode;
      showPasteInput = mode === 'paste';
      buildButtons();
      return;
    }
  }

  // 粘贴模式提示
  if (mode === 'paste') {
    // 提示用户使用微信聊天记录粘贴
  }

  // 数字按钮
  for (const btn of numButtons) {
    if (!Game.hitTest({ x, y }, btn)) continue;

    if (btn.type === 'num') {
      if (selectedCell.row < 0) {
        wx.showToast({ title: '请先点击格子', icon: 'none' });
        return;
      }
      const { row, col } = selectedCell;
      if (fixedCells[row][col]) {
        wx.showToast({ title: '固定格不能修改', icon: 'none' });
        return;
      }
      rawBoard[row][col] = btn.num;
      board[row][col] = String(btn.num);
      hasSolution = false;
      if (showCandidates) calcCandidates();
      return;
    }

    if (btn.type === 'candidates') {
      showCandidates = !showCandidates;
      if (showCandidates) calcCandidates();
      buildButtons();
      return;
    }

    if (btn.type === 'clear') {
      if (selectedCell.row < 0) {
        wx.showToast({ title: '请先点击格子', icon: 'none' });
        return;
      }
      const { row, col } = selectedCell;
      if (!fixedCells[row][col]) {
        rawBoard[row][col] = 0;
        board[row][col] = '';
        hasSolution = false;
        if (showCandidates) calcCandidates();
      }
      return;
    }

    if (btn.type === 'reset') {
      if (mode === 'daily') {
        loadDailySudoku(selectedDate);
      } else {
        initBoard();
      }
      return;
    }
  }

  // 棋盘点击
  const bx = GRID_X;
  const by = mode === 'paste' ? 120 : (dailyTitle ? 95 : 65);
  const boardW = BOARD_SIZE;
  if (x >= bx && x <= bx + boardW && y >= by && y <= by + boardW) {
    const col = Math.floor((x - bx) / CELL_SIZE);
    const row = Math.floor((y - by) / CELL_SIZE);
    if (row >= 0 && row < 9 && col >= 0 && col < 9) {
      selectedCell = { row, col };
    }
    return;
  }

  // 底部操作按钮
  if (y >= actionButtons[0].y && y <= actionButtons[0].y + actionButtons[0].h) {
    for (const btn of actionButtons) {
      if (!Game.hitTest({ x, y }, btn)) continue;
      if (btn.label.includes('清空')) {
        initBoard();
        return;
      }
      if (btn.label.includes('求解')) {
        solveSudoku();
        return;
      }
      if (btn.label.includes('🔊') || btn.label.includes('🔇')) {
        soundEnabled = !soundEnabled;
        buildButtons();
        return;
      }
    }
  }
}

function onTouchMove(x, y) {}
function onTouchEnd(x, y) {}

module.exports = {
  onEnter,
  onExit,
  update,
  render,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
};
