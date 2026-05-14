/**
 * IndexScene - 游戏大厅主场景
 */
const Game = require('../../utils/game-core.js');
const CDN = require('../../utils/puzzle-cdn.js');

// CDN 题库配置（可按需扩展）
CDN.registerAllGames();

const GAMES = [
  // 数独
  { id: 'sudoku-solver', name: '数独求解', icon: '?', desc: '输入数独·自动求解', color: '#f093fb', cat: 'sudoku' },
  { id: 'sudoku-generator', name: '数独生成', icon: '?', desc: '生成随机数独题目', color: '#4ecdc4', cat: 'sudoku' },
  // 益智逻辑
  { id: 'nonogram', name: '数织', icon: '▦', desc: '根据行列提示填充', color: '#667eea', cat: 'puzzle' },
  { id: 'akari', name: '点灯', icon: '💡', desc: '照亮所有白格', color: '#f093fb', cat: 'puzzle' },
  { id: 'nurikabe', name: '数方', icon: '▣', desc: '划分数块白格黑格', color: '#764ba2', cat: 'puzzle' },
  { id: 'slither-link', name: '数回', icon: '∞', desc: '画出一条闭合回路', color: '#667eea', cat: 'puzzle' },
  { id: 'one-stroke', name: '一笔画', icon: '✒', desc: '一笔画完所有路径', color: '#f5576c', cat: 'puzzle' },
  // 棋盘逻辑
  { id: 'othello', name: '黑白棋', icon: '⚫', desc: '翻转对手棋子', color: '#2d3436', cat: 'board' },
  { id: 'battleship', name: '战舰', icon: '🚀', desc: '在网格中隐藏舰队', color: '#0984e3', cat: 'board' },
  { id: 'tents', name: '帐篷', icon: '⛺', desc: '在树旁放置帐篷', color: '#00b894', cat: 'board' },
  // 动作
  { id: 'sokoban', name: '推箱子', icon: '📦', desc: '将箱子推到目标', color: '#e17055', cat: 'action' },
  // 经典
  { id: '24point', name: '24点', icon: '24', desc: '四则运算得24', color: '#fdcb6e', cat: 'classic' },
  { id: 'number-one', name: '消消乐', icon: '⭐', desc: '消除同色方块', color: '#e84393', cat: 'classic' },
  { id: 'frog-escape', name: '青蛙跳', icon: '🐸', desc: '帮助青蛙逃离', color: '#00cec9', cat: 'classic' },
];

const CATEGORIES = [
  { id: 'sudoku', name: '数独', icon: '▣' },
  { id: 'puzzle', name: '益智', icon: '🧩' },
  { id: 'board', name: '棋盘', icon: '♟' },
  { id: 'action', name: '动作', icon: '🎮' },
  { id: 'classic', name: '经典', icon: '🏆' },
];

let buttons = [];
let catButtons = [];
let activeCat = 'all';
let scrollY = 0;
let touchStartY = 0;
// 关卡入口按钮
let levelBtn = {};
const LEVEL_BTN_W = 44;
const LEVEL_BTN_H = 26;

function buildButtons() {
  buttons = [];
  catButtons = [];
  scrollY = 0;

  const cols = 2;
  const padX = 15;
  const padY = 10;
  const cardW = (Game.BASE_W - padX * 2 - padY * (cols - 1)) / cols;
  const cardH = 90;
  const catH = 36;
  const catGap = 8;
  const startY = 20;

  // 分类标签
  let cx = padX;
  catButtons.push({ x: cx, y: startY, w: 50, h: catH, label: '全部', cat: 'all' });
  cx += 50 + catGap;
  CATEGORIES.forEach(cat => {
    const bw = cat.name.length * 18 + 20;
    catButtons.push({ x: cx, y: startY, w: bw, h: catH, label: cat.name, cat: cat.id });
    cx += bw + catGap;
  });

  // 关卡入口（右上角）
  levelBtn = {
    x: Game.BASE_W - padX - LEVEL_BTN_W,
    y: startY,
    w: LEVEL_BTN_W,
    h: LEVEL_BTN_H,
    label: '关卡'
  };

  // 游戏卡片
  const filtered = activeCat === 'all' ? GAMES : GAMES.filter(g => g.cat === activeCat);
  let cy = startY + catH + padY;
  let col = 0;
  filtered.forEach(game => {
    buttons.push({
      x: padX + col * (cardW + padY),
      y: cy,
      w: cardW,
      h: cardH,
      id: game.id,
      name: game.name,
      desc: game.desc,
      color: game.color,
      icon: game.icon
    });
    col++;
    if (col >= cols) {
      col = 0;
      cy += cardH + padY;
    }
  });
}

function onEnter() {
  buildButtons();
}

function onExit() {}

function update(dt) {}

function render() {
  Game.drawBg();

  // 标题
  Game.drawText('GeZiPuzzle', Game.BASE_W / 2, 12, {
    size: 22, bold: true, color: Game.THEME.accent, align: 'center'
  });
  Game.drawText('格子游戏合集', Game.BASE_W / 2, 38, {
    size: 11, color: Game.THEME.textGray, align: 'center'
  });

  // 分类标签
  catButtons.forEach(btn => {
    const isActive = (btn.cat === activeCat);
    Game.roundRect(Game.ctx, btn.x, btn.y, btn.w, btn.h, btn.h / 2);
    Game.ctx.fillStyle = isActive ? Game.THEME.primary : 'rgba(255,255,255,0.1)';
    Game.ctx.fill();
    Game.drawText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, {
      size: 12, bold: isActive, color: '#fff', align: 'center', baseline: 'middle'
    });
  });

  // 关卡按钮
  Game.roundRect(Game.ctx, levelBtn.x, levelBtn.y, levelBtn.w, levelBtn.h, levelBtn.h / 2);
  Game.ctx.fillStyle = Game.THEME.card;
  Game.ctx.fill();
  Game.drawText(levelBtn.label, levelBtn.x + levelBtn.w / 2, levelBtn.y + levelBtn.h / 2, {
    size: 11, bold: false, color: '#fff', align: 'center', baseline: 'middle'
  });

  // 游戏卡片
  const catEndY = catButtons[catButtons.length - 1].y + catButtons[catButtons.length - 1].h + 10;
  Game.ctx.save();
  Game.ctx.beginPath();
  Game.ctx.rect(0, catEndY, Game.canvas.width, Game.canvas.height - catEndY);
  Game.ctx.clip();

  buttons.forEach(btn => {
    const y = btn.y + scrollY;
    if (y + btn.h < catEndY || y > Game.BASE_H) return;

    // 卡片背景
    Game.roundRect(Game.ctx, btn.x, y, btn.w, btn.h, 12);
    Game.ctx.fillStyle = 'rgba(255,255,255,0.06)';
    Game.ctx.fill();
    Game.ctx.strokeStyle = btn.color + '60';
    Game.ctx.lineWidth = 1;
    Game.ctx.stroke();

    // 颜色条
    Game.roundRect(Game.ctx, btn.x, y, 4, btn.h, 2);
    Game.ctx.fillStyle = btn.color;
    Game.ctx.fill();

    // 图标
    Game.drawText(btn.icon, btn.x + 24, y + btn.h / 2 - 12, {
      size: 22, align: 'center', baseline: 'middle', color: '#fff'
    });

    // 名称
    Game.drawText(btn.name, btn.x + 44, y + 22, {
      size: 14, bold: true, color: '#fff'
    });

    // 描述
    Game.drawText(btn.desc, btn.x + 44, y + 44, {
      size: 10, color: Game.THEME.textGray
    });
  });

  Game.ctx.restore();
}

function onTouchStart(x, y) {
  touchStartY = y;

  // 关卡入口按钮
  if (Game.hitTest({ x, y }, levelBtn)) {
    const Audio = Game.Audio();
    if (Audio) Audio.playSfx('tap');
    // 打开关卡选择（默认第一个有题库的游戏）
    const levelSelectScene = Game.scenes['level-select'];
    if (levelSelectScene && levelSelectScene.onEnter) {
      levelSelectScene.onEnter({
        gameId: 'sudoku-generator',
        title: '数独·关卡',
        mode: 'level',
      });
      Game.switchScene('level-select');
    }
    return;
  }

  // 检查分类按钮
  for (const btn of catButtons) {
    if (Game.hitTest({ x, y }, btn)) {
      const Audio = Game.Audio();
      if (Audio) Audio.playSfx('tap');
      activeCat = btn.cat;
      buildButtons();
      return;
    }
  }

  // 检查游戏卡片
  for (const btn of buttons) {
    if (Game.hitTest({ x, y: y - scrollY }, btn)) {
      const Audio = Game.Audio();
      if (Audio) Audio.playSfx('tap');
      // 加载对应游戏场景
      loadGame(btn.id);
      return;
    }
  }
}

function onTouchMove(x, y) {
  const dy = y - touchStartY;
  scrollY += dy;
  scrollY = Math.max(0, scrollY); // 只允许向下滚动
  touchStartY = y;
}

function onTouchEnd(x, y) {}

function loadGame(id) {
  try {
    const scene = require(`../games/${id}/scene.js`);
    Game.registerScene(id, scene);
    Game.switchScene(id);
  } catch (e) {
    console.error(`加载游戏失败: ${id}`, e);
    wx.showToast({ title: '游戏加载中...', icon: 'none' });
  }
}

/**
 * 加载指定游戏的关卡选择
 * @param {string} id - 游戏ID
 * @param {string} title - 显示标题
 * @param {string} cdnUrl - CDN题库地址（可选）
 * @param {Array} levels - 静态关卡配置（可选）
 */
function loadLevelSelect(id, title, cdnUrl, levels) {
  const levelSelectScene = Game.scenes['level-select'];
  if (levelSelectScene && levelSelectScene.onEnter) {
    levelSelectScene.onEnter({
      gameId: id,
      title: title || GAMES.find(g => g.id === id)?.name || id,
      cdnUrl,
      levels,
    });
    Game.switchScene('level-select');
  }
}

module.exports = {
  onEnter,
  onExit,
  update,
  render,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
};
