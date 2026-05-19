/**
 * patch-achievement.js — 为所有游戏注入成就检测
 * 通关时检查并显示成就解锁弹窗
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');
const SKIP = ['level-loader.js', 'level-select.js', 'menu.js', 'profile.js', 'confetti.js', 'sound-manager.js', 'tutorial-overlay.js', 'undo-manager.js', 'achievement-manager.js'];

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && !SKIP.includes(f));

let patched = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('achievement-manager')) {
    console.log(`⏭ ${file} — 已有achievement，跳过`);
    continue;
  }

  // 1. 添加 require
  content = content.replace(
    /const UndoManager = require\('\.\/undo-manager'\)/,
    "const UndoManager = require('./undo-manager')\nconst { AchievementManager } = require('./achievement-manager')"
  );

  // 2. 构造函数中创建成就管理器
  content = content.replace(
    /this\.undoMgr = new UndoManager\(\)/,
    "$1;\n    this.achievement = new AchievementManager()"
  );

  // 3. 在 victory=true 后检测成就
  content = content.replace(
    /this\.victory = true;\s*\n\s*this\.confetti\.start\(\)/,
    `this.victory = true;\n      this.confetti.start();\n      // 成就检测\n      let winCount = 0;\n      try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}'); winCount = p.unlocked || 0; } catch(e) {}\n      const newlyAchieved = this.achievement.check(this.gameName, winCount);\n      this._newAchievements = newlyAchieved;`
  );

  // 4. drawVictory 中显示成就弹窗（如果有新成就）
  content = content.replace(
    /this\.confetti\.draw\(\);\s*\n\s*this\.showBackButton/g,
    `this.confetti.draw();\n      if (this._newAchievements && this._newAchievements.length > 0) this._drawAchievementPopup();\n      this.showBackButton`
  );

  // 5. 添加成就弹窗绘制方法（在 showBackButton 调用前）
  // 找到 class 的最后一个 } 前插入方法
  if (!content.includes('_drawAchievementPopup')) {
    content = content.replace(
      /^(}\s*)$/,
      `  _drawAchievementPopup() {\n    const a = this._newAchievements[0];\n    const ctx = this.ctx;\n    const w = this.width;\n    const h = this.height;\n    \n    // 小弹窗在顶部\n    const popW = w * 0.7;\n    const popH = 60;\n    const popX = (w - popW) / 2;\n    const popY = h * 0.25;\n    \n    ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';\n    ctx.beginPath();\n    ctx.roundRect(popX, popY, popW, popH, 12);\n    ctx.fill();\n    ctx.strokeStyle = 'rgba(255, 215, 0, 0.5)';\n    ctx.lineWidth = 1;\n    ctx.stroke();\n    \n    ctx.fillStyle = '#FFD700';\n    ctx.font = 'bold 14px Arial';\n    ctx.textAlign = 'center';\n    ctx.fillText(a.icon + ' 成就解锁: ' + a.title, w / 2, popY + 25);\n    ctx.fillStyle = 'rgba(255,255,255,0.8)';\n    ctx.font = '12px Arial';\n    ctx.fillText(a.desc, w / 2, popY + 45);\n  }\n\n$1`
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 添加成就检测`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改`);
