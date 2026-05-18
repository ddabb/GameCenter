/**
 * patch-undo.js — 为所有游戏添加撤销功能
 * 
 * 策略：在每个游戏的 clickHandler 中，操作前保存状态快照到底部栏
 * 
 * 各游戏状态变量映射：
 *   akari: lights 数组
 *   battleship: grid 数组
 *   nonogram: grid 数组
 *   nurikabe: board, marks 数组
 *   tents: board 数组 (tents放置状态)
 *   slither-link: hLines, vLines
 *   sokoban: grid 数组
 *   24point: 无grid，暂不支持
 *   othello: board 数组
 *   merge-abc: grid 数组
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');
const SKIP = ['level-loader.js', 'level-select.js', 'menu.js', 'profile.js', 'confetti.js', 'sound-manager.js', 'tutorial-overlay.js', 'undo-manager.js'];

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && !SKIP.includes(f));

// 各游戏需要保存的状态变量（深拷贝）
const stateMap = {
  'akari': ['lights'],
  'battleship': ['grid'],
  'nonogram': ['grid'],
  'nurikabe': ['board', 'marks'],
  'tents': ['board'],
  'slither-link': ['hLines', 'vLines'],
  'sokoban': ['grid'],
  'othello': ['board'],
  'merge-abc': ['grid'],
  '24point': [] // 24点用算式输入，暂不支持撤销
};

// 各游戏底部栏方法名
const bottomBarMethod = {
  'akari': 'drawBottomBar',
  'battleship': 'drawBottomBar',
  'nonogram': 'drawBottomBar',
  'nurikabe': 'drawBottomBar',
  'tents': 'drawBottomBar',
  'slither-link': 'drawBottomBar',
  'sokoban': 'drawBottomBar',
  'othello': 'drawBottomBar',
  'merge-abc': 'drawBottomBar',
  '24point': 'drawBottomBar'
};

let patched = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('undo-manager')) {
    console.log(`⏭ ${file} — 已有undo，跳过`);
    continue;
  }

  const gameName = file.replace('.js', '');
  const states = stateMap[gameName] || [];

  // Skip 24point — 算式输入型，撤销意义不大
  if (gameName === '24point') {
    console.log(`⏭ ${file} — 24点暂不支持撤销`);
    continue;
  }

  // 1. 添加 require
  content = content.replace(
    /const TutorialOverlay = require\('\.\/tutorial-overlay'\)/,
    "const TutorialOverlay = require('./tutorial-overlay')\nconst UndoManager = require('./undo-manager')"
  );

  // 2. 构造函数中创建 undoMgr
  content = content.replace(
    /this\.tutorial = new TutorialOverlay\([^)]+\)/,
    "$1;\n    this.undoMgr = new UndoManager()"
  );

  // 3. loadLevel/reset 时清空 undo 历史
  content = content.replace(
    /this\.confetti\.stop\(\)/g,
    "this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear()"
  );

  // 4. 生成状态保存代码
  const saveCode = states.map(s => `...stateObj, ${s}: JSON.parse(JSON.stringify(this.${s}))`).join(', ');
  const stateObj = states.length > 0 
    ? `this.undoMgr.save({ ${saveCode} })`
    : '';

  // 5. 在操作前保存 — 找到 clickHandler 中"实际的格子操作"位置
  // 通用策略：在 tutorial 检查之后、第一个实质性操作之前插入
  // 用一个标记注释来插入
  const saveSnippet = '\n      // === UNDO SAVE POINT ===\n      ' + stateObj;
  content = content.replace(
    /this\.tutorial\.dismiss\(\); this\.draw\(\); return;\s*\}/g,
    (match) => match + saveSnippet
  );

  // 6. drawBottomBar 中添加撤销按钮（在重置按钮旁）
  const btmMethod = bottomBarMethod[gameName];
  if (btmMethod && content.includes(btmMethod)) {
    // 在 drawBottomBar 中查找"重置"按钮位置，在其左侧添加撤销按钮
    content = content.replace(
      /ctx\.fillText\('重置'/g,
      `// 撤销按钮
    const undoBtnW = 60, undoBtnH = 30;
    const undoBtnX = this.width / 2 - undoBtnW / 2 - 45;
    const undoBtnY = this.height - 55;
    this.ctx.fillStyle = this.undoMgr && this.undoMgr.canUndo() ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)';
    this.ctx.beginPath();
    this.ctx.roundRect(undoBtnX, undoBtnY, undoBtnW, undoBtnH, 8);
    this.ctx.fill();
    this.ctx.fillStyle = this.undoMgr && this.undoMgr.canUndo() ? '#fff' : 'rgba(255,255,255,0.3)';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('↩ 撤销', undoBtnX + undoBtnW / 2, undoBtnY + 20);
    this._undoBtn = this.undoMgr && this.undoMgr.canUndo() ? { x: undoBtnX, y: undoBtnY, w: undoBtnW, h: undoBtnH } : null;
    
    ctx.fillText('重置'`
    );
  }

  // 7. clickHandler 中添加撤销按钮点击检测
  content = content.replace(
    /if \(this\.tutorial && this\.tutorial\.shouldShow\(\)/g,
    `// 撤销按钮检测
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w && y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state) {
          ${states.map(s => `this.${s} = state.${s};`).join('\n          ')}
          this.draw();
        }
        return;
      }
      
      if (this.tutorial && this.tutorial.shouldShow()`
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 添加撤销(${states.join(', ')})`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改`);
