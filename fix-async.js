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
  'othello.js'
];

let fixed = 0;

gameFiles.forEach(file => {
  const filePath = path.join(gamesDir, file);
  if (!fs.existsSync(filePath)) { return; }
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // 修复1：调用处的 this.async loadLevel() → this.loadLevel()
  newContent = newContent.replace(/this\.async\s+loadLevel\s*\(/g, 'this.loadLevel(');

  // 修复2：确保方法定义是 async loadLevel() （只在行首或逗号/空格后加 async）
  // 匹配 ^  loadLevel(  或  , loadLevel(  或 { loadLevel(  等定义位置
  newContent = newContent.replace(/^(\s*)(?<!async )loadLevel\s*\(/gm, '$1async loadLevel(');

  if (newContent !== content) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    fixed++;
    console.log('已修复: ' + file);
  } else {
    console.log('无需修复: ' + file);
  }
});

console.log('\n完成！共修复 ' + fixed + ' 个文件');
