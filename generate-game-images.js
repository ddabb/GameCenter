const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');

function registerEmojiFonts() {
  const fontPaths = [
    'C:\\Windows\\Fonts\\seguiemj.ttf',
    'C:\\Windows\\Fonts\\NotoColorEmoji.ttf',
    'C:\\Windows\\Fonts\\symbola.ttf',
  ];
  
  for (const fontPath of fontPaths) {
    if (fs.existsSync(fontPath)) {
      try {
        registerFont(fontPath, { family: 'EmojiFont' });
        return true;
      } catch (e) {}
    }
  }
  return false;
}

registerEmojiFonts();

const gameConfigs = [
  { name: 'one-stroke',    title: '一笔画',    icon: '✍️', color: '#F6AD55', bgColor: '#DD6B20' },
  { name: 'othello',       title: '黑白棋',    icon: '⚫', color: '#4A5568', bgColor: '#2D3748' },
  { name: 'frog-escape',   title: '找青蛙',    icon: '🐸', color: '#48BB78', bgColor: '#38A169' },
  { name: 'akari',         title: '灯塔',      icon: '💡', color: '#ECC94B', bgColor: '#D69E2E' },
  { name: 'sokoban',       title: '推箱子',    icon: '📦', color: '#ED8936', bgColor: '#CD853F' },
  { name: 'nurikabe',      title: '数墙',      icon: '🧱', color: '#718096', bgColor: '#4A5568' },
  { name: 'tents',         title: '帐篷',      icon: '⛺', color: '#38A169', bgColor: '#2F855A' },
  { name: '24point',       title: '24点',      icon: '🧮', color: '#E53E3E', bgColor: '#C53030' },
  { name: 'slither-link', title: '数回',      icon: '🔗', color: '#3182CE', bgColor: '#2B6CB0' },
  { name: 'nonogram',      title: '数织',      icon: '🎨', color: '#805AD5', bgColor: '#6B46C1' },
  { name: 'battleship',    title: '海战',      icon: '🚢', color: '#00B5D8', bgColor: '#00A3C4' },
  { name: 'merge-abc',     title: '拼字母',    icon: '🔤', color: '#D69E2E', bgColor: '#B7791F' },
];

function drawGameCardWithText(game, size = 128) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 渐变背景
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, game.color);
  gradient.addColorStop(1, game.bgColor);
  
  // 圆角卡片
  const radius = 14;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // 绘制图标（居中显示）
  const iconSize = Math.floor(size * 0.45); // 图标大小
  ctx.fillStyle = '#ffffff';
  ctx.font = `${iconSize}px "EmojiFont", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  
  ctx.fillText(game.icon, size / 2, size / 2);
  
  ctx.shadowColor = 'transparent';
  
  return canvas.toBuffer('image/png');
}

console.log('开始重新生成包含文字的菜单卡片...\n');

gameConfigs.forEach(game => {
  const dir = `assets/images/games/${game.name}`;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 生成包含文字的菜单卡片
  const cardBuffer = drawGameCardWithText(game, 128);
  fs.writeFileSync(`${dir}/menu-card.png`, cardBuffer);
  console.log(`✓ ${game.name}/menu-card.png`);
});

console.log('\n✅ 所有菜单卡片重新生成完成！');
console.log('现在需要修改 menu.js 移除额外的文字绘制');