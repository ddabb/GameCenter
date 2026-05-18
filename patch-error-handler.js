// patch-error-handler.js
// 为所有从 data/ 目录加载关卡的游戏添加 try-catch 错误处理

const fs = require('fs');
const path = require('path');

const gamesDir = path.join(__dirname, 'games');

// 需要处理的游戏文件
const patches = [
  {
    file: 'battleship.js',
    // 在 loadLevel() 中包裹 require 到 try-catch
    oldCode: `    const data = require(\`../data/battleship/easy-\${safeLevel}.json\`);`,
    newCode: `    let data;
    try {
      data = require(\`../data/battleship/easy-\${safeLevel}.json\`);
    } catch(e) {
      console.log('关卡数据加载失败 level=' + this.level, e);
      this.switchGame('level-select', this.gameName);
      return;
    }`
  },
  {
    file: 'nonogram.js',
    oldCode: `    const data = require(\`../data/nonogram/nonogram-\${safeLevel}.json\`);`,
    newCode: `    let data;
    try {
      data = require(\`../data/nonogram/nonogram-\${safeLevel}.json\`);
    } catch(e) {
      console.log('关卡数据加载失败 level=' + this.level, e);
      this.switchGame('level-select', this.gameName);
      return;
    }`
  },
  {
    file: 'nurikabe.js',
    oldCode: `    const data = require(\`../data/nurikabe/easy-\${safeLevel}.json\`);`,
    newCode: `    let data;
    try {
      data = require(\`../data/nurikabe/easy-\${safeLevel}.json\`);
    } catch(e) {
      console.log('关卡数据加载失败 level=' + this.level, e);
      this.switchGame('level-select', this.gameName);
      return;
    }`
  },
  {
    file: 'slither-link.js',
    oldCode: `    const data = require(\`../data/slither-link/easy/easy-\${safeLevel}.json\`);`,
    newCode: `    let data;
    try {
      data = require(\`../data/slither-link/easy/easy-\${safeLevel}.json\`);
    } catch(e) {
      console.log('关卡数据加载失败 level=' + this.level, e);
      this.switchGame('level-select', this.gameName);
      return;
    }`
  },
  {
    file: 'sokoban.js',
    oldCode: `    const data = require(\`../data/sokoban/easy/easy-\${safeLevel}.json\`);`,
    newCode: `    let data;
    try {
      data = require(\`../data/sokoban/easy/easy-\${safeLevel}.json\`);
    } catch(e) {
      console.log('关卡数据加载失败 level=' + this.level, e);
      this.switchGame('level-select', this.gameName);
      return;
    }`
  },
  {
    file: 'tents.js',
    oldCode: `    const data = require(\`../data/tents/easy/easy-\${safeLevel}.json\`);`,
    newCode: `    let data;
    try {
      data = require(\`../data/tents/easy/easy-\${safeLevel}.json\`);
    } catch(e) {
      console.log('关卡数据加载失败 level=' + this.level, e);
      this.switchGame('level-select', this.gameName);
      return;
    }`
  },
];

let patched = 0;
for (const patch of patches) {
  const filePath = path.join(gamesDir, patch.file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes(patch.oldCode)) {
    console.log(`SKIP ${patch.file} (oldCode not found)`);
    continue;
  }
  
  if (content.includes('关卡数据加载失败')) {
    console.log(`SKIP ${patch.file} (already patched)`);
    continue;
  }
  
  content = content.replace(patch.oldCode, patch.newCode);
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`OK ${patch.file}`);
  patched++;
}

console.log(`\nDone: ${patched}/${patches.length} patched`);
