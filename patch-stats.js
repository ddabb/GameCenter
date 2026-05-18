/**
 * patch-stats.js
 * 为所有游戏添加统计数据记录功能
 * 
 * 在游戏构造函数中调用 statsManager.startGame()
 * 在胜利时调用 statsManager.endGame(true)
 */

const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');

// 需要处理的游戏
const games = [
  'akari.js', 'battleship.js', 'nonogram.js', 'nurikabe.js', 
  'sokoban.js', 'tents.js', 'slither-link.js', 'othello.js',
  '24point.js', 'merge-abc.js'
];

const STATS_REQUIRE = `const statsManager = require('./stats-manager.js').getInstance();`;

let patched = 0;

for (const file of games) {
  const filePath = path.join(gamesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 检查是否已有 statsManager
  if (content.includes('statsManager')) {
    console.log(`SKIP ${file} (already has statsManager)`);
    continue;
  }

  // 1. 在文件顶部添加 require
  if (!content.includes(STATS_REQUIRE)) {
    // 找到第一个 require 后插入
    const firstRequire = content.indexOf("require('");
    if (firstRequire !== -1) {
      const lineStart = content.lastIndexOf('\n', firstRequire) + 1;
      content = content.slice(0, lineStart) + STATS_REQUIRE + '\n' + content.slice(lineStart);
    } else {
      // 没有其他 require，在 class 前插入
      content = STATS_REQUIRE + '\n\n' + content;
    }
  }

  // 2. 在构造函数的 this.level = level 后添加 statsManager.startGame
  const constructorMatch = content.match(/constructor\s*\([^)]*\)\s*\{[\s\S]*?this\.level\s*=\s*level/);
  if (constructorMatch && !content.includes('statsManager.startGame')) {
    const matchEnd = constructorMatch.index + constructorMatch[0].length;
    content = content.slice(0, matchEnd) + ';\n    statsManager.startGame(this.gameName, level)' + content.slice(matchEnd);
  }

  // 3. 在 saveGameProgress() 调用后添加 statsManager.endGame(true)
  if (content.includes('this.saveGameProgress()') && !content.includes('statsManager.endGame')) {
    content = content.replace(
      /this\.saveGameProgress\(\)/g,
      'this.saveGameProgress(); statsManager.endGame(true)'
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`OK ${file}`);
  patched++;
}

console.log(`\nDone: ${patched}/${games.length} patched`);
