/**
 * patch-confetti.js — 为所有游戏添加通关庆祝粒子动画
 * 
 * 修改内容：
 * 1. 构造函数：添加 const Confetti = require('./confetti'); this.confetti = new Confetti(ctx, width, height);
 * 2. 胜利触发点：this.victory = true 后添加 this.confetti.start();
 * 3. draw() 中 victory/gameOver 判断：先绘制 confetti，再绘制面板
 * 4. loadLevel/重置：添加 this.confetti.stop();
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');

const gameFiles = fs.readdirSync(GAMES_DIR).filter(f => 
  f.endsWith('.js') && !['level-loader.js', 'level-select.js', 'menu.js', 'profile.js', 'confetti.js'].includes(f)
);

let patched = 0;
let skipped = 0;

for (const file of gameFiles) {
  const filePath = path.join(GAMES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // 检查是否已有confetti
  if (content.includes('confetti')) {
    console.log(`⏭ ${file} — 已有confetti，跳过`);
    skipped++;
    continue;
  }

  // 1. 添加 require — 在文件顶部（class 定义前）
  if (!content.includes("require('./confetti')")) {
    content = content.replace(
      /((?:const|let|var)\s+\w+\s*=\s*require\([^)]+\)[;\n])/,
      (match) => match + "const Confetti = require('./confetti');\n"
    );
    // 如果没找到任何require，在class前加
    if (!content.includes("require('./confetti')")) {
      content = content.replace('class ', "const Confetti = require('./confetti');\n\nclass ");
    }
  }

  // 2. 构造函数中创建 confetti 实例 — 在 this.victory = false 后
  content = content.replace(
    /this\.victory\s*=\s*false/,
    "this.victory = false;\n    this.confetti = new Confetti(this.ctx, this.width, this.height);"
  );

  // 如果没有 this.victory = false，在 this.gameName 后添加
  if (!content.includes('this.confetti')) {
    content = content.replace(
      /this\.gameName\s*=\s*['"][^'"]+['"]/,
      (match) => match + ";\n    this.confetti = new Confetti(this.ctx, this.width, this.height)"
    );
  }

  // 3. 胜利触发时启动 confetti — this.victory = true 后
  content = content.replace(
    /this\.victory\s*=\s*true/g,
    "this.victory = true;\n      this.confetti.start()"
  );

  // gameOver 触发时也启动
  content = content.replace(
    /this\.gameOver\s*=\s*true/g,
    "this.gameOver = true;\n      this.confetti.start()"
  );

  // 4. drawVictory/drawGameOver 中绘制 confetti — 在 showBackButton 前绘制
  content = content.replace(
    /this\.showBackButton\(\)/g,
    "this.confetti.draw();\n    this.showBackButton()"
  );

  // 5. loadLevel / 下一关点击时停止 confetti
  content = content.replace(
    /this\._nextBtn\s*=\s*null;\s*\n(\s*)this\._backBtn\s*=\s*null/g,
    "this._nextBtn = null;\n$1this._backBtn = null;\n$1this.confetti.stop()"
  );

  // loadLevel 中重置 confetti
  if (content.includes('loadLevel()')) {
    content = content.replace(
      /(loadLevel\(\)\s*\{)/g,
      "$1\n    if (this.confetti) this.confetti.stop();"
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`✅ ${file} — 已添加confetti`);
  patched++;
}

console.log(`\n完成：${patched} 个已修改，${skipped} 个已跳过`);
