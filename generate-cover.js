const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');

// 注册中文字体
const fontFiles = {
  'Microsoft YaHei': 'C:\\Windows\\Fonts\\msyh.ttc',
  'SimHei': 'C:\\Windows\\Fonts\\simhei.ttf',
};
for (const [family, path] of Object.entries(fontFiles)) {
  if (fs.existsSync(path)) {
    try {
      registerFont(path, { family });
      console.log(`✓ 注册字体: ${family}`);
    } catch (e) {
      console.log(`✗ 字体注册失败: ${family} - ${e.message}`);
    }
  }
}

const W = 650;
const H = 250;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// ========== 1. 背景 ==========
// 深色渐变背景
const bgGradient = ctx.createLinearGradient(0, 0, W, H);
bgGradient.addColorStop(0, '#0F172A');
bgGradient.addColorStop(0.5, '#1A2332');
bgGradient.addColorStop(1, '#162032');
ctx.fillStyle = bgGradient;
ctx.fillRect(0, 0, W, H);

// 顶部装饰光条
const topGlow = ctx.createLinearGradient(0, 0, 0, 60);
topGlow.addColorStop(0, 'rgba(99, 141, 255, 0.12)');
topGlow.addColorStop(1, 'rgba(99, 141, 255, 0)');
ctx.fillStyle = topGlow;
ctx.fillRect(0, 0, W, 60);

// 底部装饰线
ctx.fillStyle = 'rgba(99, 141, 255, 0.2)';
ctx.fillRect(0, H - 3, W, 3);

// 点缀圆点装饰
ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
for (let i = 0; i < 30; i++) {
  const rx = Math.random() * W;
  const ry = Math.random() * H;
  const rr = 1 + Math.random() * 2;
  ctx.beginPath();
  ctx.arc(rx, ry, rr, 0, Math.PI * 2);
  ctx.fill();
}

// ========== 2. 左侧文字区域 ==========
const leftX = 36;
const titleY = 78;

// 主标题
ctx.fillStyle = '#FFFFFF';
ctx.font = `bold 44px "Microsoft Ya Hei", "SimHei", "Microsoft YaHei", sans-serif`;
ctx.fillText('经典益智合集', leftX, titleY);

// 标题下金色装饰线
const titleWidth = 310;
const lineY = titleY + 14;
const lineGrad = ctx.createLinearGradient(leftX, 0, leftX + titleWidth, 0);
lineGrad.addColorStop(0, '#F59E0B');
lineGrad.addColorStop(0.5, '#FBBF24');
lineGrad.addColorStop(1, '#D97706');
ctx.fillStyle = lineGrad;
ctx.fillRect(leftX, lineY, titleWidth, 3);

// 副标题
ctx.fillStyle = '#CBD5E1';
ctx.font = `18px "Microsoft Ya Hei", "SimHei", "Microsoft YaHei", sans-serif`;
ctx.fillText('13款经典益智游戏 · 27000+关卡', leftX, lineY + 36);

// 标签行
const tagY = lineY + 68;
const tags = ['数独', '推箱子', '一笔画', '24点', '黑白棋', '更多', '数织'];
ctx.font = `13px "Microsoft Ya Hei", "SimHei", "Microsoft YaHei", sans-serif`;

let tagX = leftX;
for (let i = 0; i < tags.length; i++) {
  const tag = tags[i];
  ctx.fillStyle = 'rgba(148, 163, 184, 0.15)';
  const tw = ctx.measureText(tag).width + 16;
  ctx.beginPath();
  ctx.roundRect(tagX, tagY, tw, 26, 13);
  ctx.fill();

  ctx.fillStyle = '#94A3B8';
  ctx.fillText(tag, tagX + 8, tagY + 18);

  tagX += tw + 8;
}

// ========== 3. 右侧游戏卡片网格区域 ==========
const gridOriginX = 378;
const gridOriginY = 22;
const cardW = 58;
const cardH = 58;
const gap = 10;
const cols = 4;
const rows = 3;

const gameCards = [
  { name: 'akari',       icon: '💡',  bg: '#D69E2E' },
  { name: 'battleship',  icon: '🚢',  bg: '#0EA5E9' },
  { name: 'nonogram',    icon: '🎨',  bg: '#8B5CF6' },
  { name: 'sokoban',     icon: '📦',  bg: '#F97316' },
  { name: 'nurikabe',    icon: '🧱',  bg: '#64748B' },
  { name: 'slither-link',icon: '🔗',  bg: '#3B82F6' },
  { name: 'tents',       icon: '⛺',  bg: '#22C55E' },
  { name: '24point',     icon: '🧮',  bg: '#EF4444' },
  { name: 'othello',     icon: '⚫',  bg: '#334155' },
  { name: 'one-stroke',  icon: '✍️',  bg: '#DD6B20' },
  { name: 'merge-abc',   icon: '🔤',  bg: '#B45309' },
  { name: 'sweep-frog',  icon: '🐸',  bg: '#16A34A' },
];

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.arcTo(x + w, y, x + w, y + r[1], r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
  ctx.lineTo(x + r[3], y + h);
  ctx.arcTo(x, y + h, x, y + h - r[3], r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.arcTo(x, y, x + r[0], y, r[0]);
  ctx.closePath();
}

// 绘制每个游戏卡片
for (let i = 0; i < gameCards.length; i++) {
  const card = gameCards[i];
  const row = Math.floor(i / cols);
  const col = i % cols;
  const cx = gridOriginX + col * (cardW + gap);
  const cy = gridOriginY + row * (cardH + gap);

  // 卡片背景
  ctx.fillStyle = card.bg;
  roundRect(ctx, cx, cy, cardW, cardH, [10, 10, 10, 10]);
  ctx.fill();

  // 卡片内部微光
  const innerGlow = ctx.createRadialGradient(cx + cardW / 2, cy + 8, 0, cx + cardW / 2, cy + cardH / 2, cardW * 0.8);
  innerGlow.addColorStop(0, 'rgba(255,255,255,0.15)');
  innerGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = innerGlow;
  roundRect(ctx, cx, cy, cardW, cardH, [10, 10, 10, 10]);
  ctx.fill();

  // 卡片阴影效果（底部暗边）- 简化实现
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.roundRect(cx + 2, cy + cardH * 0.75, cardW - 4, cardH * 0.25 - 2, [0, 0, 8, 8]);
  ctx.fill();

  // 图标
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `24px "Segoe UI Emoji", "EmojiFont", "Arial", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.icon, cx + cardW / 2, cy + cardH / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

// ========== 导出 ==========
// 先尝试不同质量级别，控制文件大小在 80KB 以内
const outputPath = 'cover.jpg';

for (let quality = 0.7; quality >= 0.3; quality -= 0.05) {
  const buffer = canvas.toBuffer('image/jpeg', { quality });
  const sizeKB = buffer.length / 1024;
  console.log(`  质量=${quality.toFixed(2)} → ${sizeKB.toFixed(1)} KB`);
  if (sizeKB <= 80) {
    fs.writeFileSync(outputPath, buffer);
    console.log(`\n✅ 封面已生成: ${outputPath} (${sizeKB.toFixed(1)} KB, 质量=${quality.toFixed(2)})`);
    break;
  }
}
