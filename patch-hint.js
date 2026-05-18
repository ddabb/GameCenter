/**
 * patch-hint.js — 为有答案数据的游戏添加提示功能
 * 
 * 支持的游戏：nonogram, battleship, slither-link, akari（有answer/grid数据）
 * 不支持：nurikabe, tents, sokoban（数据目录缺少json文件）
 *          24point, merge-abc, othello（程序生成，无标准答案格式）
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');
const SKIP = ['level-loader.js', 'level-select.js', 'menu.js', 'profile.js', 
  'confetti.js', 'sound-manager.js', 'tutorial-overlay.js', 'undo-manager.js', 
  'achievement-manager.js', 'hint-manager.js'];

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && !SKIP.includes(f));

// 有答案数据且答案字段名
const answerMap = {
  'nonogram':   { answerField: 'answer',  stateField: 'grid' },
  'battleship': { answerField: 'grid',    stateField: 'grid' },  // 数据的grid就是答案
  'akari':      { answerField: 'answer',  stateField: 'grid' },
  'slither-link': { answerField: 'answer', stateField: 'hLines' }, // 简化：不提示slither-link
};

// 只给有明确答案的游戏添加
const supportedGames = ['nonogram', 'battleship', 'akari'];

let patched = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  const gameName = file.replace('.js', '');

  if (content.includes('hint-manager')) {
    console.log(`⏭ ${file} — 已有hint，跳过`);
    continue;
  }

  if (!supportedGames.includes(gameName)) {
    console.log(`⏭ ${file} — 暂不支持提示`);
    continue;
  }

  const am = answerMap[gameName];

  // 1. 添加 require
  content = content.replace(
    /const \{ AchievementManager \} = require\('\.\/achievement-manager'\)/,
    "const { AchievementManager } = require('./achievement-manager')\nconst { HintManager } = require('./hint-manager')"
  );

  // 2. 构造函数中创建 hintMgr
  content = content.replace(
    /this\.achievement = new AchievementManager\(\)/,
    "$1;\n    this.hintMgr = new HintManager(); this._levelData = null;"
  );

  // 3. loadLevel 中保存答案数据引用
  // Find: const data = require(...) and after it save to this._levelData
  content = content.replace(
    /(const data = require\([^)]+\))/,
    "$1;\n      this._levelData = data;"
  );

  // 4. 底部栏添加提示按钮（在撤销按钮旁）
  content = content.replace(
    /ctx\.fillText\('重置'/g,
    `// 提示按钮
    const hintBtnW = 60, hintBtnH = 30;
    const hintBtnX = this.width / 2 - hintBtnW / 2 + 45;
    const hintBtnY = this.height - 55;
    this.ctx.fillStyle = this.hintMgr && this.hintMgr.canHint() ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.05)';
    this.ctx.beginPath();
    this.ctx.roundRect(hintBtnX, hintBtnY, hintBtnW, hintBtnH, 8);
    this.ctx.fill();
    this.ctx.fillStyle = this.hintMgr && this.hintMgr.canHint() ? '#4CAF50' : 'rgba(255,255,255,0.3)';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('💡 ' + (this.hintMgr ? (this.hintMgr.maxHints - this.hintMgr.usedHints) : 3), hintBtnX + hintBtnW / 2, hintBtnY + 20);
    this._hintBtn = this.hintMgr && this.hintMgr.canHint() ? { x: hintBtnX, y: hintBtnY, w: hintBtnW, h: hintBtnH } : null;
    
    ctx.fillText('重置'`
  );

  // 5. clickHandler 中添加提示按钮检测（在撤销按钮检测之后）
  content = content.replace(
    /(\/\/ 撤销按钮检测[\s\S]*?return;\s*\}\s*\n)/,
    `$1      // 提示按钮检测
      if (this._hintBtn && x >= this._hintBtn.x && x <= this._hintBtn.x + this._hintBtn.w && y >= this._hintBtn.y && y <= this._hintBtn.y + this._hintBtn.h) {
        if (this._levelData && this.hintMgr) {
          const answerData = this._levelData.${am.answerField};
          const hint = this.hintMgr.getHint('${gameName}', answerData, this.${am.stateField});
          if (hint) {
            this.${am.stateField}[hint.row][hint.col] = hint.value;
            this.draw();
          }
        }
        return;
      }
      
`
  );

  // 6. drawBackground/draw 之后绘制提示高亮
  content = content.replace(
    /this\.drawGrid\(\);/,
    `this.drawGrid();
    this.hintMgr.drawHighlight(ctx, this.boardOffsetX, this.boardOffsetY, this.cellSize);`
  );

  // 7. loadLevel/reset 时重置提示计数
  content = content.replace(
    /this\.undoMgr\.clear\(\)/g,
    "this.undoMgr.clear(); if (this.hintMgr) this.hintMgr.reset()"
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 添加提示(${am.answerField} → ${am.stateField})`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改`);
