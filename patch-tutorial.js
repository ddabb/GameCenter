/**
 * patch-tutorial.js — 为所有游戏添加新手引导
 * 
 * 修改点：
 * 1. require tutorial-overlay
 * 2. 构造函数：创建 TutorialOverlay 实例
 * 3. draw() 中：在背景后检测并绘制引导
 * 4. clickHandler 中：引导显示时拦截点击
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');
const SKIP = ['level-loader.js', 'level-select.js', 'menu.js', 'profile.js', 'confetti.js', 'sound-manager.js', 'tutorial-overlay.js'];

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.js') && !SKIP.includes(f));

let patched = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (content.includes('tutorial-overlay')) {
    console.log(`⏭ ${file} — 已有tutorial，跳过`);
    continue;
  }

  // 1. 添加 require（在 sound-manager require 后）
  content = content.replace(
    "require('./sound-manager')",
    "require('./sound-manager');\nconst TutorialOverlay = require('./tutorial-overlay')"
  );

  // 2. 构造函数中创建实例（在 confetti 实例后）
  content = content.replace(
    /(new Confetti\(this\.ctx, this\.width, this\.height\))/,
    "$1;\n    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName)"
  );

  // 3. draw() 中绘制引导 — 在 drawBackground 后插入
  content = content.replace(
    /this\.drawBackground\(\);/g,
    "this.drawBackground();\n    if (this.tutorial && this.tutorial.shouldShow()) { this.tutorial.draw(); return; }"
  );

  // 4. clickHandler 中拦截引导点击
  // 在 clickHandler 开头（touch 获取后）添加拦截
  content = content.replace(
    /(let touch = e\.touches \? e\.touches\[0\] : e;)/g,
    "$1\n      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {\n        this.tutorial.dismiss();\n        this.draw();\n        return;\n      }"
  );

  // 5. loadLevel 时重置 tutorial dismissed 状态不需要，dismissed 后就不再显示

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 已添加tutorial`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改`);
