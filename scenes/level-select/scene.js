/**
 * LevelSelectScene - 统一关卡选择场景
 * 支持关卡解锁/完成状态、进度保存、CDN题库加载
 * 通过 query.gameId / query.levels / query.title 传入配置
 */
const Game = require('../../utils/game-core.js');
const CDN = require('../../utils/puzzle-cdn.js');

const PAD = 15;
const COLS = 4;
const CELL_GAP = 10;
const CELL_W = (Game.BASE_W - PAD * 2 - CELL_GAP * (COLS - 1)) / COLS;
const CELL_H = CELL_W * 0.9;
const ROW_GAP = 12;
const HEADER_H = 60;  // 标题+副标题+难度
const FOOTER_H = 50;  // 底部返回

let gameId = '';          // 游戏ID
let gameTitle = '';       // 显示标题
let levels = [];          // 关卡列表
let progress = {};        // { levelId: 'locked' | 'unlocked' | 'passed' }
let currentPage = 0;      // 当前页（每页10关）
let totalPages = 1;
let scrollY = 0;
let touchStartY = 0;
let touchStartX = 0;
let isDragging = false;

// 按钮
let backBtn = {};
let prevBtn = {};
let nextBtn = {};
let modeToggleBtn = {};   // 随机模式/关卡模式切换
let isRandomMode = false;

// CDN 题库引用
let cdnData = null;
let cdnLoading = false;

const STORAGE_KEY = 'level_progress';

function loadProgress() {
  try {
    const saved = wx.getStorageSync(STORAGE_KEY);
    if (saved && saved[gameId]) {
      progress = saved[gameId];
    }
  } catch (e) {}
  // 默认全部解锁前3关
  levels.forEach((lv, i) => {
    if (!progress[lv.id]) {
      progress[lv.id] = i < 3 ? 'unlocked' : 'locked';
    }
  });
}

function saveProgress() {
  try {
    const all = wx.getStorageSync(STORAGE_KEY) || {};
    all[gameId] = progress;
    wx.setStorageSync(STORAGE_KEY, all);
  } catch (e) {}
}

function buildButtons() {
  const footerY = Game.BASE_H - FOOTER_H;
  backBtn = { x: PAD, y: 8, w: 44, h: 26, label: '←' };
  modeToggleBtn = {
    x: Game.BASE_W - PAD - 80,
    y: 8,
    w: 80,
    h: 26,
    label: isRandomMode ? '🎲 随机' : '📋 关卡'
  };
  const navY = footerY + 10;
  prevBtn = { x: PAD, y: navY, w: 60, h: 30, label: '◀' };
  nextBtn = { x: Game.BASE_W - PAD - 60, y: navY, w: 60, h: 30, label: '▶' };
}

function onEnter(query = {}) {
  gameId = query.gameId || 'unknown';
  gameTitle = query.title || '关卡选择';
  isRandomMode = query.mode === 'random';

  if (query.levels) {
    // 传入静态关卡配置
    levels = query.levels;
  } else if (query.cdnUrl) {
    // 从 CDN 加载题库
    loadFromCDN(query.cdnUrl);
  } else {
    // 自动生成关卡列表（默认30关）
    levels = [];
    for (let i = 1; i <= 30; i++) {
      levels.push({
        id: `level_${i}`,
        index: i,
        difficulty: i <= 10 ? 'easy' : (i <= 20 ? 'medium' : 'hard'),
        label: `${i}`,
      });
    }
  }

  loadProgress();
  buildButtons();
  currentPage = 0;
  totalPages = Math.ceil(levels.length / 10);
  scrollY = 0;
}

function onExit() {}

function update(dt) {}

function render() {
  const ctx = Game.ctx;
  ctx.clearRect(0, 0, Game.canvas.width, Game.canvas.height);
  Game.drawBg();

  // 标题
  Game.drawText(gameTitle, Game.BASE_W / 2, 10, {
    size: 18, bold: true, color: Game.THEME.accent, align: 'center'
  });
  Game.drawText(`已通过 ${countPassed()} / ${levels.length} 关`, Game.BASE_W / 2, 34, {
    size: 11, color: Game.THEME.textGray, align: 'center'
  });

  // 返回
  renderBtn(backBtn, 'rgba(255,255,255,0.1)', 14);
  renderBtn(modeToggleBtn, Game.THEME.card, 12);

  // CDN 加载中
  if (cdnLoading) {
    Game.drawCard(PAD, 44, Game.BASE_W - PAD * 2, 24, 6);
    Game.drawText('正在加载题库...', Game.BASE_W / 2, 56, {
      size: 12, color: Game.THEME.textGray, align: 'center', baseline: 'middle'
    });
  }

  // 关卡网格
  const pageStart = currentPage * 10;
  const pageLevels = levels.slice(pageStart, pageStart + 10);
  const startY = HEADER_H + 10;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, startY, Game.canvas.width, Game.BASE_H - startY - FOOTER_H);
  ctx.clip();

  pageLevels.forEach((lv, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const x = PAD + col * (CELL_W + CELL_GAP);
    const y = startY + row * (CELL_H + ROW_GAP) - scrollY;

    const status = progress[lv.id] || 'locked';
    renderLevelCell(x, y, lv, status);
  });

  ctx.restore();

  // 翻页指示
  if (totalPages > 1) {
    const dots = [];
    for (let i = 0; i < totalPages; i++) {
      dots.push({
        x: Game.BASE_W / 2 - (totalPages - 1) * 8 / 2 + i * 8,
        y: Game.BASE_H - FOOTER_H - 4,
        r: i === currentPage ? 4 : 2.5,
        active: i === currentPage
      });
    }
    dots.forEach(d => {
      Game.drawCircle(d.x, d.y, d.r, {
        fill: d.active ? Game.THEME.accent : 'rgba(255,255,255,0.3)'
      });
    });

    // 翻页按钮
    const canPrev = currentPage > 0;
    const canNext = currentPage < totalPages - 1;
    renderBtn(prevBtn, canPrev ? Game.THEME.card : 'rgba(255,255,255,0.05)', 14);
    renderBtn(nextBtn, canNext ? Game.THEME.card : 'rgba(255,255,255,0.05)', 14);
    Game.drawText(`${currentPage + 1}/${totalPages}`, Game.BASE_W / 2, nextBtn.y + 15, {
      size: 11, color: Game.THEME.textGray, align: 'center', baseline: 'middle'
    });
  }
}

function renderBtn(btn, color, fontSize) {
  const ctx = Game.ctx;
  Game.roundRect(ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
  ctx.fillStyle = color;
  ctx.fill();
  Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
    size: fontSize || 12, color: '#fff', align: 'center', baseline: 'middle'
  });
}

function renderLevelCell(x, y, lv, status) {
  const ctx = Game.ctx;
  const isLocked = status === 'locked';
  const isPassed = status === 'passed';

  // 背景
  Game.roundRect(ctx, x, y, CELL_W, CELL_H, 10);
  ctx.fillStyle = isLocked
    ? 'rgba(0,0,0,0.3)'
    : (isPassed ? 'rgba(78,205,196,0.15)' : 'rgba(255,255,255,0.06)');
  ctx.fill();

  // 边框
  if (isPassed) {
    ctx.strokeStyle = '#4ecdc480';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 关卡号
  const iconText = isLocked ? '🔒' : (isPassed ? '✅' : lv.difficulty === 'hard' ? '⭐⭐⭐' : lv.difficulty === 'medium' ? '⭐⭐' : '⭐');
  Game.drawText(iconText, x + CELL_W / 2, y + CELL_H * 0.35, {
    size: 16, align: 'center', baseline: 'middle', color: isLocked ? '#555' : '#fff'
  });

  // 标签
  Game.drawText(isLocked ? '' : lv.label, x + CELL_W / 2, y + CELL_H * 0.65, {
    size: 14, bold: !isLocked, align: 'center', baseline: 'middle',
    color: isLocked ? '#444' : (isPassed ? '#4ecdc4' : '#fff')
  });
}

function countPassed() {
  return Object.values(progress).filter(s => s === 'passed').length;
}

function loadFromCDN(cdnUrl) {
  cdnLoading = true;
  wx.request({
    url: cdnUrl,
    method: 'GET',
    success(res) {
      if (res.statusCode === 200 && res.data) {
        cdnData = res.data;
        if (Array.isArray(res.data)) {
          levels = res.data.map((item, i) => ({
            id: `level_${i + 1}`,
            index: i + 1,
            data: item,
            difficulty: item.difficulty || (i < 10 ? 'easy' : i < 20 ? 'medium' : 'hard'),
            label: item.label || `第${i + 1}关`,
          }));
          totalPages = Math.ceil(levels.length / 10);
        }
        loadProgress();
      }
    },
    fail() {
      wx.showToast({ title: '题库加载失败', icon: 'none' });
    },
    complete() {
      cdnLoading = false;
    }
  });
}

function startLevel(lv) {
  const status = progress[lv.id] || 'locked';
  if (status === 'locked') {
    wx.showToast({ title: '请先通关前面的关卡', icon: 'none' });
    return;
  }

  // 切换到 Canvas 游戏场景
  if (Game.scenes && Game.scenes[gameId]) {
    Game.switchScene(gameId);
    setTimeout(() => {
      const scene = Game.scenes[gameId];
      if (scene && scene.loadLevel) {
        scene.loadLevel(lv);
      }
    }, 50);
  } else {
    try {
      const scene = require(`../../games/${gameId}/scene.js`);
      Game.registerScene(gameId, scene);
      Game.switchScene(gameId);
      setTimeout(() => {
        const sc = Game.scenes[gameId];
        if (sc && sc.loadLevel) {
          sc.loadLevel(lv);
        }
      }, 50);
    } catch (e) {
      console.error(`[LevelSelect] 加载游戏失败: ${gameId}`, e);
      wx.showToast({ title: '游戏加载失败', icon: 'none' });
    }
  }
}

/**
 * 完成关卡（游戏调用此函数通知关卡完成）
 */
function completeLevel(levelId, stars = 3) {
  const idx = levels.findIndex(l => l.id === levelId);
  if (idx < 0) return;

  progress[levelId] = 'passed';
  // 解锁下一关
  if (idx + 1 < levels.length) {
    const nextId = levels[idx + 1].id;
    if (progress[nextId] === 'locked') {
      progress[nextId] = 'unlocked';
    }
  }
  saveProgress();
}

/**
 * 获取当前进度（供游戏场景调用）
 */
function getProgress() {
  return { ...progress };
}

function onTouchStart(x, y) {
  touchStartY = y;
  touchStartX = x;
  isDragging = false;
}

function onTouchMove(x, y) {
  const dy = y - touchStartY;
  if (Math.abs(dy) > 5) isDragging = true;
  scrollY += dy;
  scrollY = Math.max(0, scrollY);
  touchStartY = y;
}

function onTouchEnd(x, y) {
  if (isDragging) {
    // 惯性
    return;
  }

  // 按钮检测（点击非拖动）
  if (Game.hitTest({ x, y }, backBtn)) {
    Game.switchScene('index');
    return;
  }

  if (Game.hitTest({ x, y }, modeToggleBtn)) {
    isRandomMode = !isRandomMode;
    buildButtons();
    return;
  }

  if (totalPages > 1) {
    if (Game.hitTest({ x, y }, prevBtn) && currentPage > 0) {
      currentPage--;
      scrollY = 0;
      return;
    }
    if (Game.hitTest({ x, y }, nextBtn) && currentPage < totalPages - 1) {
      currentPage++;
      scrollY = 0;
      return;
    }
  }

  // 关卡点击检测
  const pageStart = currentPage * 10;
  const pageLevels = levels.slice(pageStart, pageStart + 10);
  const startY = HEADER_H + 10;

  pageLevels.forEach((lv, i) => {
    const row = Math.floor(i / COLS);
    const col = i % COLS;
    const cx = PAD + col * (CELL_W + CELL_GAP);
    const cy = startY + row * (CELL_H + ROW_GAP) - scrollY;

    const rect = { x: cx, y: cy, w: CELL_W, h: CELL_H };
    if (Game.hitTest({ x, y }, rect)) {
      startLevel(lv);
    }
  });
}

// 导出
module.exports = {
  onEnter,
  onExit,
  update,
  render,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  // 供游戏场景调用的方法
  completeLevel,
  getProgress,
  getCurrentLevel: () => levels[currentPage * 10],
};
