/**
 * tents-renderer.js — 帐篷绘制函数
 */
const roundRect = require('../utils/round-rect.js');
const { countRowTents, countColTents } = require('./tents-core');

// 缓存渐变
let _bgGradient = null;
let _bgGradientH = 0;

function drawBackground(ctx, width, height, animationTime) {
  if (!_bgGradient || _bgGradientH !== height) {
    _bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    _bgGradient.addColorStop(0, '#1B4332');
    _bgGradient.addColorStop(1, '#0D2818');
    _bgGradientH = height;
  }
  ctx.fillStyle = _bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 星空点缀
  for (let i = 0; i < 20; i++) {
    const sx = (i * 43 + animationTime * 5) % width;
    const sy = (i * 67) % (height * 0.4);
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(animationTime + i) * 0.2})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStatus(ctx, width, headerBar, statusBarHeight, level, size) {
  const topY = (headerBar ? headerBar.boardStartY : statusBarHeight + 79);
  const y = topY + 20;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`第${level}关 · ${size}×${size}`, width / 2, y);
  ctx.textAlign = 'left';
}

function drawBoard(ctx, board, tents, size, cellSize, boardOffsetX, boardOffsetY, rowHints, colHints, animationTime) {
  // 列提示
  for (let c = 0; c < size; c++) {
    const x = boardOffsetX + c * cellSize + cellSize / 2;
    const count = countColTents(tents, size, c);
    const hint = colHints[c];
    ctx.font = 'bold ' + (cellSize * 0.35) + 'px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillStyle = (count === hint) ? '#6BCB77' : '#FF6B6B';
    ctx.fillText(`${count}/${hint}`, x, boardOffsetY - 10);
  }

  // 行提示
  for (let r = 0; r < size; r++) {
    const y = boardOffsetY + r * cellSize + cellSize / 2;
    const count = countRowTents(tents, r);
    const hint = rowHints[r];
    ctx.font = 'bold ' + (cellSize * 0.35) + 'px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillStyle = (count === hint) ? '#6BCB77' : '#FF6B6B';
    ctx.fillText(`${count}/${hint}`, boardOffsetX - 20, y + 5);
  }

  // 棋盘阴影
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  roundRect(ctx, boardOffsetX + 3, boardOffsetY + 4, cellSize * size, cellSize * size, 8);
  ctx.fill();

  // 草地渐变
  if (!drawBoard._grassGradient || drawBoard._grassGradient._cs !== cellSize) {
    drawBoard._grassGradient = ctx.createLinearGradient(0, 0, cellSize, cellSize);
    drawBoard._grassGradient.addColorStop(0, '#2D5A27');
    drawBoard._grassGradient.addColorStop(1, '#1A3A18');
    drawBoard._grassGradient._cs = cellSize;
  }

  // 帐篷渐变
  if (!drawBoard._tentGradient || drawBoard._tentGradient._cs !== cellSize) {
    drawBoard._tentGradient = ctx.createLinearGradient(0, 0, 0, cellSize);
    drawBoard._tentGradient.addColorStop(0, '#F5F5DC');
    drawBoard._tentGradient.addColorStop(1, '#D2B48C');
    drawBoard._tentGradient._cs = cellSize;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = boardOffsetX + c * cellSize;
      const y = boardOffsetY + r * cellSize;

      // 草地
      ctx.fillStyle = drawBoard._grassGradient;
      ctx.fillRect(x, y, cellSize, cellSize);

      // 树
      if (board[r][c] === 1) {
        const tx = x + cellSize / 2;
        const ty = y + cellSize / 2;
        const pulse = Math.sin(animationTime) * 2;

        ctx.fillStyle = '#5D4037';
        ctx.fillRect(tx - 4, ty + pulse, 8, 18);

        ctx.fillStyle = '#1B5E20';
        ctx.beginPath();
        ctx.arc(tx, ty - 5 + pulse, cellSize * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.beginPath();
        ctx.arc(tx - 5, ty - 10 + pulse, cellSize * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }

      // 帐篷
      if (tents[r][c] === 1) {
        const tx = x + cellSize / 2;
        const ty = y + cellSize / 2;
        const pulse = Math.sin(animationTime * 2) * 1;

        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.moveTo(tx, y + 8 + pulse);
        ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
        ctx.lineTo(x + 5, y + cellSize - 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = drawBoard._tentGradient;
        ctx.beginPath();
        ctx.moveTo(tx, y + 8 + pulse);
        ctx.lineTo(x + cellSize - 5, y + cellSize - 5);
        ctx.lineTo(x + 5, y + cellSize - 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#8B4513';
        ctx.fillRect(tx - 4, y + cellSize - 15, 8, 10);
      }

      // 网格线
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }
}

module.exports = {
  drawBackground,
  drawStatus,
  drawBoard
};
