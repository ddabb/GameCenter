/**
 * nurikabe-renderer.js — 数墙绘制函数
 */
const roundRect = require('../utils/round-rect.js');
const { formatTime } = require('./nurikabe-core');

// 背景渐变缓存
let _bgGradient = null;
let _bgGradientH = 0;

function _drawBg(ctx, W, H) {
  if (!_bgGradient || _bgGradientH !== H) {
    _bgGradient = ctx.createLinearGradient(0, 0, 0, H);
    _bgGradient.addColorStop(0, '#e0f7fa');
    _bgGradient.addColorStop(1, '#80deea');
    _bgGradientH = H;
  }
  ctx.fillStyle = _bgGradient;
  ctx.fillRect(0, 0, W, H);
}

function drawStatus(ctx, width, boardOffsetY, level, size, timer) {
  const y = boardOffsetY - 20;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  roundRect(ctx, width * 0.1, y - 12, width * 0.8, 22, 11);
  ctx.fill();
  ctx.fillStyle = '#00796b';
  ctx.font = 'bold 12px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`第${level}关 · ${size}×${size}  ⏱ ${formatTime(timer)}`, width / 2, y);
  ctx.textAlign = 'left';
}

function drawBoard(ctx, board, numbers, size, cellSize, boardOffsetX, boardOffsetY) {
  if (!board || board.length === 0 || !numbers || numbers.length === 0) return;

  // 阴影
  ctx.fillStyle = 'rgba(0, 105, 90, 0.15)';
  ctx.beginPath();
  roundRect(ctx, boardOffsetX + 3, boardOffsetY + 5, cellSize * size, cellSize * size, 12);
  ctx.fill();

  // 白色底板
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  roundRect(ctx, boardOffsetX, boardOffsetY, cellSize * size, cellSize * size, 12);
  ctx.fill();

  // 裁剪
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, boardOffsetX, boardOffsetY, cellSize * size, cellSize * size, 12);
  ctx.clip();

  for (let r = 0; r < size; r++) {
    if (!board[r]) continue;
    for (let c = 0; c < size; c++) {
      const x = boardOffsetX + c * cellSize;
      const y = boardOffsetY + r * cellSize;
      const isNumber = numbers[r] && numbers[r][c] > 0;
      const isBlack = board[r][c] === 1;

      // 格子背景
      if (isBlack) {
        const grad = ctx.createLinearGradient(x, y, x + cellSize, y + cellSize);
        grad.addColorStop(0, '#37474f');
        grad.addColorStop(1, '#263238');
        ctx.fillStyle = grad;
      } else if (isNumber) {
        ctx.fillStyle = '#e0f2f1';
      } else {
        ctx.fillStyle = '#fafffe';
      }
      ctx.fillRect(x, y, cellSize, cellSize);

      // 网格线
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);

      // 数字
      if (isNumber) {
        ctx.fillStyle = '#00695c';
        ctx.font = `bold ${Math.floor(cellSize * 0.55)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(numbers[r][c], x + cellSize / 2, y + cellSize / 2 + 1);
        ctx.textBaseline = 'alphabetic';
      }
    }
  }

  ctx.restore();
}

module.exports = {
  _drawBg,
  drawStatus,
  drawBoard
};
