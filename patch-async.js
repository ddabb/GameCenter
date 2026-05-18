const fs = require('fs');
const path = require('path');

const gamesDir = 'F:\\SelfJob\\Puzzle\\SolvePuzzle\\games';
const gameFiles = [
  'akari.js',
  'battleship.js',
  'nonogram.js',
  'nurikabe.js',
  'slither-link.js',
  'sokoban.js',
  'tents.js',
  '24point.js',
  'merge-abc.js',
  'othello.js'
];

let patched = 0;

gameFiles.forEach(file => {
  const filePath = path.join(gamesDir, file);
  if (!fs.existsSync(filePath)) { return; }
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // 1. loadLevel( → async loadLevel(  （避免重复加 async）
  const newContent = content.replace(/\bloadLevel\s*\(/g, (match, offset) => {
    const before = content.substring(Math.max(0, offset - 30), offset);
    if (before.match(/async\s+$/)) { return match; }  // 已经有 async
    return 'async loadLevel(';
  });
  if (newContent !== content) { content = newContent; changed = true; }

  // 2. LevelLoader.load( → await LevelLoader.load(  （避免重复加 await）
  const newContent2 = content.replace(/LevelLoader\.load\(/g, (match, offset) => {
    const before = content.substring(Math.max(0, offset - 20), offset);
    if (before.match(/await\s+$/)) { return match; }
    return 'await LevelLoader.load(';
  });
  if (newContent2 !== content) { content = newContent2; changed = true; }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    patched++;
    console.log('已修补: ' + file);
  } else {
    console.log('无需修改: ' + file);
  }
});

console.log('\n完成！共修补 ' + patched + ' 个文件');
