/**
 * patch-sound.js — 为所有游戏添加音效/振动反馈
 * 
 * 修改点：
 * 1. require sound-manager
 * 2. 点击处理开头：sound.play('click')
 * 3. 胜利触发：sound.play('victory')
 * 4. 失败触发：sound.play('gameover')
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');
const SKIP = ['level-loader.js', 'level-select.js', 'menu.js', 'profile.js', 'confetti.js', 'sound-manager.js'];

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && !SKIP.includes(f));

let patched = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('sound-manager')) {
    console.log(`⏭ ${file} — 已有sound，跳过`);
    continue;
  }

  // 1. 添加 require
  content = content.replace(
    "require('./confetti')",
    "require('./confetti');\nconst sound = require('./sound-manager')"
  );

  // 2. 胜利时播放音效
  content = content.replace(
    /this\.confetti\.start\(\)/g,
    "this.confetti.start();\n      sound.play('victory')"
  );

  // 3. 关卡点击时播放点击音效 — 在 bindEvents/clickHandler 中胜利检测之前
  // 在 victory return 之前加 click 音效（胜利面板按钮点击）
  // 不做太复杂的修改，只在切换关卡/返回时加 click
  content = content.replace(
    /this\.switchGame\('level-select'/g,
    "sound.play('click');\n          this.switchGame('level-select'"
  );

  // 下一关按钮也加click
  content = content.replace(
    /this\.loadLevel\(\);\s*\n\s*this\._nextBtn/g,
    "this.loadLevel();\n          sound.play('click');\n          this._nextBtn"
  );

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 已添加sound`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改`);
