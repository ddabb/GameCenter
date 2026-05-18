// patch-progress.js
// 为所有游戏添加进度持久化：saveGameProgress() 方法 + 胜利时调用

const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');

// saveGameProgress 方法模板
const SAVE_PROGRESS_METHOD = `
  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName;
      const saved = tt.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      // 解锁下一关
      if (this.level >= progress.unlocked) {
        progress.unlocked = this.level + 1;
      }
      // 记录通关（1星，后续可扩展星级评分）
      if (!progress.stars[this.level]) {
        progress.stars[this.level] = 1;
      }
      tt.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {
      console.log('保存进度失败', e);
    }
  }`;

// 需要处理的游戏文件及其胜利触发行
const games = [
  { file: 'akari.js', trigger: 'this.victory = this.checkVictory();' },
  { file: 'battleship.js', trigger: 'this.victory = true;' },
  { file: 'nonogram.js', trigger: 'this.victory = true;' },
  { file: 'slither-link.js', trigger: 'this.victory = true;' },
  { file: 'sokoban.js', trigger: 'this.victory = true;' },
  { file: 'nurikabe.js', trigger: 'this.victory = true;' },
  { file: 'tents.js', trigger: 'this.victory = true;' },
  { file: '24point.js', trigger: 'this.victory = true;' },
  { file: 'othello.js', trigger: 'this.gameOver = true;' },
  { file: 'merge-abc.js', trigger: 'this._gameOver = true;' },
];

let patched = 0;

for (const game of games) {
  const filePath = path.join(gamesDir, game.file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // 检查是否已有 saveGameProgress
  if (content.includes('saveGameProgress()')) {
    console.log(`SKIP ${game.file} (already has saveGameProgress)`);
    continue;
  }

  // 1. 在胜利触发行后添加 this.saveGameProgress() 调用
  // 找到触发行，在下一行加调用
  const triggerLine = game.trigger;
  if (content.includes(triggerLine)) {
    content = content.replace(
      triggerLine,
      triggerLine + '\n      this.saveGameProgress();'
    );
  } else {
    console.log(`WARN ${game.file}: trigger not found: ${triggerLine}`);
    continue;
  }

  // 2. 在 destroy() 方法前插入 saveGameProgress() 方法定义
  const destroyMatch = content.lastIndexOf('  destroy()');
  if (destroyMatch === -1) {
    console.log(`WARN ${game.file}: destroy() not found`);
    continue;
  }

  content = content.slice(0, destroyMatch) + SAVE_PROGRESS_METHOD + '\n\n' + content.slice(destroyMatch);

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`OK ${game.file}`);
  patched++;
}

console.log(`\nDone: ${patched}/${games.length} patched`);
