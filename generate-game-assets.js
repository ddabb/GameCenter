const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');

// 注册字体
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

// 生成黑白棋棋子
function drawOthelloPiece(color, size = 40) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // 棋子阴影
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.beginPath();
  ctx.arc(size/2 + 2, size/2 + 2, size/2 - 2, 0, Math.PI * 2);
  ctx.fill();
  
  // 棋子主体
  const gradient = ctx.createRadialGradient(size/2 - 5, size/2 - 5, 0, size/2, size/2, size/2);
  
  if (color === 'black') {
    gradient.addColorStop(0, '#444444');
    gradient.addColorStop(0.5, '#222222');
    gradient.addColorStop(1, '#000000');
  } else {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#eeeeee');
    gradient.addColorStop(1, '#cccccc');
  }
  
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.fill();
  
  return canvas.toBuffer('image/png');
}

// 生成推箱子游戏元素
function drawSokobanElement(type, size = 40) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  if (type === 'box') {
    // 箱子阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    roundRect(ctx, 4, 6, size - 6, size - 6, 4);
    ctx.fill();
    
    // 箱子主体
    const gradient = ctx.createLinearGradient(0, 0, size, size);
    gradient.addColorStop(0, '#ED8936');
    gradient.addColorStop(1, '#8B4513');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    roundRect(ctx, 2, 2, size - 4, size - 4, 4);
    ctx.fill();
    
    // 箱子图标
    ctx.fillStyle = '#fff';
    ctx.font = `${size * 0.5}px EmojiFont`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('📦', size/2, size/2);
    
  } else if (type === 'player') {
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.font = `${size * 0.6}px EmojiFont`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧑', size/2, size/2 + size * 0.05);
    
  } else if (type === 'target') {
    ctx.fillStyle = '#6BCB77';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/png');
}

// 生成灯塔灯泡
function drawAkariBulb(size = 30, isOn = true) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  if (isOn) {
    // 发光效果
    ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#FFD700';
  } else {
    ctx.fillStyle = '#666666';
  }
  
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
  ctx.fill();
  
  // 灯泡图标
  ctx.fillStyle = '#fff';
  ctx.font = `${size * 0.6}px EmojiFont`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💡', size/2, size/2);
  
  return canvas.toBuffer('image/png');
}

// 生成数回线段
function drawSlitherLink(type, size = 30) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  ctx.strokeStyle = '#32CD32';
  ctx.lineWidth = 4;
  
  if (type === 'horizontal') {
    ctx.beginPath();
    ctx.moveTo(2, size/2);
    ctx.lineTo(size - 2, size/2);
    ctx.stroke();
  } else if (type === 'vertical') {
    ctx.beginPath();
    ctx.moveTo(size/2, 2);
    ctx.lineTo(size/2, size - 2);
    ctx.stroke();
  } else if (type === 'dot') {
    ctx.fillStyle = '#32CD32';
    ctx.beginPath();
    ctx.arc(size/2, size/2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// 生成所有资源
console.log('开始生成游戏元素图片...\n');

// 黑白棋
const othelloDir = 'assets/images/games/othello';
if (!fs.existsSync(othelloDir)) fs.mkdirSync(othelloDir, { recursive: true });
fs.writeFileSync(`${othelloDir}/piece-black.png`, drawOthelloPiece('black'));
fs.writeFileSync(`${othelloDir}/piece-white.png`, drawOthelloPiece('white'));
console.log('✓ othello/piece-black.png');
console.log('✓ othello/piece-white.png\n');

// 推箱子
const sokobanDir = 'assets/images/games/sokoban';
if (!fs.existsSync(sokobanDir)) fs.mkdirSync(sokobanDir, { recursive: true });
fs.writeFileSync(`${sokobanDir}/box.png`, drawSokobanElement('box'));
fs.writeFileSync(`${sokobanDir}/player.png`, drawSokobanElement('player'));
fs.writeFileSync(`${sokobanDir}/target.png`, drawSokobanElement('target'));
console.log('✓ sokoban/box.png');
console.log('✓ sokoban/player.png');
console.log('✓ sokoban/target.png\n');

// 灯塔
const akariDir = 'assets/images/games/akari';
if (!fs.existsSync(akariDir)) fs.mkdirSync(akariDir, { recursive: true });
fs.writeFileSync(`${akariDir}/bulb-on.png`, drawAkariBulb(30, true));
fs.writeFileSync(`${akariDir}/bulb-off.png`, drawAkariBulb(30, false));
console.log('✓ akari/bulb-on.png');
console.log('✓ akari/bulb-off.png\n');

// 数回
const slitherDir = 'assets/images/games/slither-link';
if (!fs.existsSync(slitherDir)) fs.mkdirSync(slitherDir, { recursive: true });
fs.writeFileSync(`${slitherDir}/line-h.png`, drawSlitherLink('horizontal'));
fs.writeFileSync(`${slitherDir}/line-v.png`, drawSlitherLink('vertical'));
fs.writeFileSync(`${slitherDir}/dot.png`, drawSlitherLink('dot'));
console.log('✓ slither-link/line-h.png');
console.log('✓ slither-link/line-v.png');
console.log('✓ slither-link/dot.png\n');

console.log('✅ 游戏元素图片生成完成！');