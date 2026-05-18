/**
 * patch-share.js — 在胜利面板添加分享按钮
 * 
 * 在 showBackButton() 的 _backBtn 之后添加分享按钮
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');
const SKIP = ['level-loader.js', 'level-select.js', 'menu.js', 'profile.js',
  'confetti.js', 'sound-manager.js', 'tutorial-overlay.js', 'undo-manager.js',
  'achievement-manager.js', 'hint-manager.js', 'daily-challenge.js', 'share-card.js'];

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && !SKIP.includes(f));

let patched = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  if (content.includes('share-card')) {
    console.log(`⏭ ${file} — 已有share，跳过`);
    continue;
  }

  // 1. 添加 require（在 achievement-manager require 后）
  content = content.replace(
    /const \{ AchievementManager \} = require\('\.\/achievement-manager'\)/,
    "const { AchievementManager } = require('./achievement-manager')\nconst { ShareCard } = require('./share-card')"
  );

  // 2. 构造函数添加 shareCard 实例
  content = content.replace(
    /this\.achievement = new AchievementManager\(\)/,
    "$1;\n    this.shareCard = new ShareCard(this.ctx, this.width, this.height)"
  );

  // 3. 在 showBackButton 中 _backBtn 之后添加分享按钮
  // Find the pattern: this._backBtn = { ... };
  // After it, add share button
  content = content.replace(
    /this\._backBtn = \{ x: btnX, y: btnY \+ btnH \+ 12, w: btnW, h: btnH \};\s*\n\s*this\._victoryPanel/,
    `this._backBtn = { x: btnX, y: btnY + btnH + 12, w: btnW, h: btnH };
    
    // 分享按钮
    const shareBtnY = btnY + (btnH + 12) * 2;
    this.ctx.fillStyle = '#1976D2';
    this.roundRect(btnX, shareBtnY, btnW, 40, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 24) + 'px Arial';
    this.ctx.fillText('📤 分享战绩', this.width / 2, shareBtnY + 27);
    this._shareBtn = { x: btnX, y: shareBtnY, w: btnW, h: 40 };
    
    this._victoryPanel`
  );

  // 4. 在 clickHandler 的胜利点击处理中添加分享按钮检测
  content = content.replace(
    /(\/\/ 胜利面板按钮处理[\s\S]*?this\.switchGame\('level-select', this\.gameName\);\s*\n\s*return;\s*\n\s*\})/,
    `$1
      // 分享按钮
      if (this._shareBtn && x >= this._shareBtn.x && x <= this._shareBtn.x + this._shareBtn.w && y >= this._shareBtn.y && y <= this._shareBtn.y + this._shareBtn.h) {
        try {
          this.shareCard.generate({
            gameName: this.gameName,
            gameTitle: this.gameName,
            level: this.level
          }).then(path => ShareCard.share(path));
        } catch(e) { console.log('share failed', e); }
        return;
      }`
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 添加分享按钮`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改`);
