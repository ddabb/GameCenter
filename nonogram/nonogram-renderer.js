/**
 * nonogram-renderer.js — 数织 Canvas 绘制函数
 *
 * 所有函数接收 ctx 和渲染所需的状态参数，不持有内部状态。
 * 依赖 nonogram-core.js 提供的 roundRect 工具函数。
 */

const { roundRect } = require('./nonogram-core');

function drawStatus(ctx, width, level, mode, statusY) {
  const modeText = mode === 'fill' ? '填充模式' : '标记模式';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`第${level}关 · ${modeText}`, width / 2, statusY);
  ctx.textAlign = 'left';
}

function drawModeButtons(ctx, width, mode, statusBarHeight, modeBtnY) {
  const btnW = 80, btnH = 32;
  const gap = 10;
  const totalW = btnW * 2 + gap;
  const startX = (width - totalW) / 2;
  const y = modeBtnY || (statusBarHeight + 45);

  const modes = [
    { id: 'fill', text: '🖊️ 填充', color: '#6BCB77' },
    { id: 'mark', text: '❌ 标记', color: '#FF6B6B' }
  ];

  modes.forEach((modeItem, i) => {
    const x = startX + i * (btnW + gap);
    const isActive = mode === modeItem.id;

    ctx.fillStyle = isActive ? modeItem.color : 'rgba(255,255,255,0.1)';
    roundRect(ctx, x, y, btnW, btnH, 16);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(modeItem.text, x + btnW / 2, y + 21);
  });
  ctx.textAlign = 'left';

  return {
    fillBtn: { x: startX, y, w: btnW, h: btnH },
    markBtn: { x: startX + btnW + gap, y, w: btnW, h: btnH }
  };
}

function drawHints(ctx, colHints, rowHints, size, cellSize, boardOffsetX, boardOffsetY, hintFontSize) {
  const fontSize = hintFontSize || Math.max(10, Math.floor(cellSize * 0.64));
  ctx.font = 'bold ' + fontSize + 'px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';

  for (let c = 0; c < size; c++) {
    const hints = colHints[c] || [];
    const x = boardOffsetX + c * cellSize + cellSize / 2;
    for (let i = 0; i < hints.length; i++) {
      const y = boardOffsetY - (hints.length - i) * (fontSize + 2);
      ctx.fillText(hints[i], x, y);
    }
  }

  ctx.textAlign = 'right';
  for (let r = 0; r < size; r++) {
    const hints = rowHints[r] || [];
    const y = boardOffsetY + r * cellSize + cellSize / 2 + fontSize / 3;
    const x = boardOffsetX - 5;
    ctx.fillText(hints.join(' '), x, y);
  }
  ctx.textAlign = 'left';
}

let _fillGradient = null;

function drawBoard(ctx, grid, size, cellSize, boardOffsetX, boardOffsetY) {
  const bx = boardOffsetX;
  const by = boardOffsetY;
  const cs = cellSize;
  const n = size;

  // Board background
  ctx.fillStyle = '#2a2a4a';
  ctx.fillRect(bx, by, cs * n, cs * n);

  // Filled cells gradient
  if (!_fillGradient || _fillGradient._cs !== cs) {
    _fillGradient = ctx.createLinearGradient(0, 0, cs, cs);
    _fillGradient.addColorStop(0, '#6BCB77');
    _fillGradient.addColorStop(1, '#4CAF50');
    _fillGradient._cs = cs;
  }
  for (let r = 0; r < n; r++) {
    if (!grid[r]) continue;
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 1) {
        const x = bx + c * cs;
        const y = by + r * cs;
        ctx.fillStyle = _fillGradient;
        ctx.fillRect(x + 2, y + 2, cs - 4, cs - 4);
      }
    }
  }

  // Mark X
  ctx.strokeStyle = '#FF6B6B';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let r = 0; r < n; r++) {
    if (!grid[r]) continue;
    for (let c = 0; c < n; c++) {
      if (grid[r][c] === 2) {
        const x = bx + c * cs;
        const y = by + r * cs;
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + cs - 4, y + cs - 4);
        ctx.moveTo(x + cs - 4, y + 4);
        ctx.lineTo(x + 4, y + cs - 4);
      }
    }
  }
  ctx.stroke();

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    ctx.moveTo(bx, by + i * cs);
    ctx.lineTo(bx + n * cs, by + i * cs);
    ctx.moveTo(bx + i * cs, by);
    ctx.lineTo(bx + i * cs, by + n * cs);
  }
  ctx.stroke();

  // Outer border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, n * cs, n * cs);
}

function drawAchievementPopup(ctx, width, height, newAchievements) {
  if (!newAchievements || newAchievements.length === 0) return;
  newAchievements.forEach(a => {
    const text = a.title || a.name;
    const cx = width / 2, cy = height * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(cx - 120, cy - 30, 240, 60);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 成就解锁!', cx, cy - 8);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial';
    ctx.fillText(text, cx, cy + 14);
  });
  ctx.textAlign = 'left';
}

module.exports = {
  drawStatus,
  drawModeButtons,
  drawHints,
  drawBoard,
  drawAchievementPopup,
};
