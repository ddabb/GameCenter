/**
 * 批量给游戏添加：左上角返回按钮 + 通关面板（下一关/返回选关）
 * 处理两种模式：this.victory 和 this.gameOver
 */

const fs = require('fs');
const path = require('path');

const GAMES_DIR = path.join(__dirname, 'games');

// 需要 patch 的文件（已完成的：akari, slither-link, nonogram, othello）
const TARGETS = [
  'nurikabe.js',
  'battleship.js',
  'tents.js',
  '24point.js',
  'merge-abc.js',
  'sokoban.js',
];

// 通用通关面板代码（注入到文件 destroy() 之前）
const VICTORY_HELPERS = `

  showBackButton() {
    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    // 半透明遮罩
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 面板背景
    this.roundRect(panelX, panelY, panelW, panelH, 16);
    this.ctx.fillStyle = '#1e2a4a';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 标题
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 恭喜通关！', this.width / 2, panelY + 50);

    this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('关卡 ' + this.level, this.width / 2, panelY + 80);

    // 下一关按钮
    const btnW = 180, btnH = 42, btnX = (this.width - btnW) / 2;
    this.roundRect(btnX, panelY + 100, btnW, btnH, 21);
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 17px Arial';
    this.ctx.fillText('下一关', this.width / 2, panelY + 126);
    this._nextBtn = { x: btnX, y: panelY + 100, w: btnW, h: btnH };

    // 返回选关按钮
    this.roundRect(btnX, panelY + 152, btnW, btnH, 21);
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('返回选关', this.width / 2, panelY + 178);
    this._backBtn = { x: btnX, y: panelY + 152, w: btnW, h: btnH };
  }

  roundRect(x, y, w, h, r) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.arcTo(x + w, y, x + w, y + r, r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.arcTo(x, y + h, x, y + h - r, r);
    this.ctx.lineTo(x, y + r);
    this.ctx.arcTo(x, y, x + r, y, r);
    this.ctx.closePath();
  }
`;

function patchFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  let patched = false;

  // 1. 检查是否有 this.victory 或 this.gameOver
  const hasVictory = content.includes('this.victory');
  const hasGameOver = content.includes('this.gameOver');

  // 2. 在 drawHeader() 里加左上角返回按钮（如果有的话）
  if (content.includes('drawHeader()')) {
    // 在 drawHeader 方法开头加返回按钮绘制
    content = content.replace(
      /(drawHeader\(\)\s*\{)/,
      '$1\n    // 左上角返回按钮\n    this.ctx.fillStyle = \'rgba(255, 255, 255, 0.9)\';\n    this.ctx.font = \'bold 18px Arial\';\n    this.ctx.textAlign = \'left\';\n    this.ctx.fillText(\'← 返回\', 15, 38);\n'
    );
    patched = true;
    console.log(`  [${fileName}] patched drawHeader()`);
  }

  // 3. 修改 bindEvents 里的通关/返回逻辑
  // 模式A: this.victory
  if (hasVictory) {
    // 替换通关分支
    const oldVictoryBlock = /if\s*\(\s*this\.victory\s*\)\s*\{[^}]*this\.switchGame\s*\(\s*['"]menu['"]\s*\)[^}]*return;/;
    if (content.match(oldVictoryBlock)) {
      content = content.replace(
        oldVictoryBlock,
        `// 通关面板\n      if (this.victory) {\n        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {\n          this.level++;\n          this.loadLevel();\n          this._nextBtn = null;\n          this._backBtn = null;\n          return;\n        }\n        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {\n          this.switchGame('level-select', this.gameName);\n          return;\n        }\n        if (!this._nextBtn || !this._backBtn) {\n          this.showBackButton();\n        }\n        return;\n      }`
      );
      patched = true;
      console.log(`  [${fileName}] patched bindEvents (victory)`);
    }

    // 加 this.gameName（如果构造函数里没有）
    if (!content.includes('this.gameName')) {
      content = content.replace(
        /(constructor\s*\([^)]*\)\s*\{)/,
        '$1\n    this.gameName = \'' + path.basename(fileName, '.js') + '\';\n'
      );
      console.log(`  [${fileName}] added this.gameName`);
    }

    // drawVictory → 委托 showBackButton
    if (content.includes('drawVictory()')) {
      content = content.replace(
        /drawVictory\s*\(\s*\)\s*\{[^}]*\}/s,
        `drawVictory() {\n    if (!this._nextBtn || !this._backBtn) {\n      this.showBackButton();\n    }\n  }`
      );
      console.log(`  [${fileName}] patched drawVictory()`);
    }
  }

  // 模式B: this.gameOver（如 othello）
  if (hasGameOver && !hasVictory) {
    // 替换 gameOver 分支
    const oldGameOverBlock = /if\s*\(\s*this\.gameOver\s*\)\s*\{[^}]*this\.switchGame\s*\(\s*['"]menu['"]\s*\)[^}]*return;/;
    if (content.match(oldGameOverBlock)) {
      content = content.replace(
        oldGameOverBlock,
        `// 通关面板\n      if (this.gameOver) {\n        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {\n          this.level++;\n          this.loadLevel();\n          this._nextBtn = null;\n          this._backBtn = null;\n          return;\n        }\n        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {\n          this.switchGame('level-select', this.gameName);\n          return;\n        }\n        if (!this._nextBtn || !this._backBtn) {\n          this.showBackButton();\n        }\n        return;\n      }`
      );
      patched = true;
      console.log(`  [${fileName}] patched bindEvents (gameOver)`);
    }

    // drawGameOver → 委托 showBackButton
    if (content.includes('drawGameOver()')) {
      content = content.replace(
        /drawGameOver\s*\(\s*\)\s*\{[^}]*\}/s,
        `drawGameOver() {\n    if (!this._nextBtn || !this._backBtn) {\n      this.showBackButton();\n    }\n  }`
      );
      console.log(`  [${fileName}] patched drawGameOver()`);
    }
  }

  // 4. 在 destroy() 前注入 showBackButton + roundRect
  if (!content.includes('showBackButton()') && content.includes('destroy()')) {
    content = content.replace(
      /(destroy\s*\(\s*\)\s*\{)/,
      VICTORY_HELPERS + '\n  $1'
    );
    patched = true;
    console.log(`  [${fileName}] injected showBackButton + roundRect`);
  }

  if (patched) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fileName} patched successfully\n`);
  } else {
    console.log(`⚠️  ${fileName} - no patterns matched, skipped\n`);
  }
}

TARGETS.forEach(f => {
  const fp = path.join(GAMES_DIR, f);
  if (fs.existsSync(fp)) {
    console.log(`Patching: ${f}`);
    patchFile(fp);
  } else {
    console.log(`❌ Not found: ${f}`);
  }
});
