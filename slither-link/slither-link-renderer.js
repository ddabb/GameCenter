/**
 * slither-link-renderer.js — 数回（Slither Link）渲染
 */

/**
 * 绘制棋盘状态信息
 */
function _drawStatus(ctx, width, boardOffsetY, level, rows, cols) {
  const y = boardOffsetY - 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`第${level}关 · ${rows}×${cols}`, width / 2, y);
  ctx.textAlign = 'left';
}

/**
 * 绘制背景
 */
function drawBackground(ctx, width, height) {
  if (!drawBackground._bgGradient) {
    drawBackground._bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    drawBackground._bgGradient.addColorStop(0, '#1a1a2e');
    drawBackground._bgGradient.addColorStop(1, '#16213e');
  }
  ctx.fillStyle = drawBackground._bgGradient;
  ctx.fillRect(0, 0, width, height);
}

/**
 * 绘制棋盘（格点、数字、边）
 */
function drawBoard(ctx, width, height, size, hints, hEdges, vEdges, boardOffsetX, boardOffsetY, cellSize) {
  // 绘制网格点
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c <= size; c++) {
      const x = boardOffsetX + c * cellSize;
      const y = boardOffsetY + r * cellSize;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 绘制数字提示
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (hints[r][c] !== null) {
        const x = boardOffsetX + c * cellSize + cellSize / 2;
        const y = boardOffsetY + r * cellSize + cellSize / 2;

        let count = 0;
        if (hEdges[r][c] === 1) count++;
        if (hEdges[r + 1][c] === 1) count++;
        if (vEdges[r][c] === 1) count++;
        if (vEdges[r][c + 1] === 1) count++;

        ctx.fillStyle = count === hints[r][c] ? '#6BCB77' : '#FF6B6B';
        ctx.font = 'bold ' + (cellSize * 0.5) + 'px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(hints[r][c], x, y + cellSize * 0.15);
      }
    }
  }

  // 绘制水平边
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c < size; c++) {
      if (hEdges[r][c] === 1) {
        const x1 = boardOffsetX + c * cellSize;
        const x2 = boardOffsetX + (c + 1) * cellSize;
        const y = boardOffsetY + r * cellSize;
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x1, y);
        ctx.lineTo(x2, y);
        ctx.stroke();
      }
    }
  }

  // 绘制垂直边
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size; c++) {
      if (vEdges[r][c] === 1) {
        const x = boardOffsetX + c * cellSize;
        const y1 = boardOffsetY + r * cellSize;
        const y2 = boardOffsetY + (r + 1) * cellSize;
        ctx.strokeStyle = '#4FC3F7';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x, y1);
        ctx.lineTo(x, y2);
        ctx.stroke();
      }
    }
  }
}

module.exports = { _drawStatus, drawBackground, drawBoard };
