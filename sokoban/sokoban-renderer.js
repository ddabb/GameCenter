/**
 * sokoban-renderer.js - 推箱子 Canvas 绘制函数
 */
const roundRect = require('../utils/round-rect.js');

function drawStatus(ctx, boardOffsetY, width, level, moves) {
  const y = boardOffsetY - 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`第${level}关 · 步数 ${moves}`, width / 2, y);
  ctx.textAlign = 'left';
}

function drawBoard(ctx, grid, boxes, player, targets, boardOffsetX, boardOffsetY, cellSize, size, animationTime, boxImage) {
  if (!grid || !grid.length) return;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      let x = boardOffsetX + c * cellSize;
      let y = boardOffsetY + r * cellSize;

      if (grid[r][c] === 1) {
        // 墙
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x, y, cellSize, cellSize);
      } else if (grid[r][c] === 2) {
        // 目标
        ctx.fillStyle = '#2a2a4a';
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.fillStyle = '#6BCB77';
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 空地
        ctx.fillStyle = '#3a3a4a';
        ctx.fillRect(x, y, cellSize, cellSize);
      }

      // 网格线
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 箱子
  for (let box of boxes) {
    let x = boardOffsetX + box.c * cellSize;
    let y = boardOffsetY + box.r * cellSize;
    let onTarget = grid[box.r][box.c] === 2;

    // 箱子阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    roundRect(ctx, x + 3, y + 4, cellSize - 4, cellSize - 4, 6);
    ctx.fill();

    // 使用图片或降级绘制
    if (boxImage) {
      const padding = 4;
      ctx.drawImage(boxImage, x + padding, y + padding,
        cellSize - padding * 2, cellSize - padding * 2);
    } else {
      if (onTarget) {
        ctx.fillStyle = _getBoxGrad(ctx, cellSize, true);
      } else {
        ctx.fillStyle = _getBoxGrad(ctx, cellSize, false);
      }
      ctx.beginPath();
      roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 6);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = (cellSize * 0.5) + 'px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('📦', x + cellSize / 2, y + cellSize / 2 + 5);
    }
  }

  // 玩家
  let px = boardOffsetX + player.c * cellSize;
  let py = boardOffsetY + player.r * cellSize;

  let pulse = Math.sin((animationTime || 0) * 2) * 2;
  ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
  ctx.beginPath();
  ctx.arc(px + cellSize / 2, py + cellSize / 2, cellSize / 2 + pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = (cellSize * 0.6) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('🧑', px + cellSize / 2, py + cellSize / 2 + cellSize * 0.15);
}

// ── 箱子渐变缓存 ──
let _boxGradCache = null;
let _boxOnTargetGradCache = null;
let _cachedCellSize = 0;

function _getBoxGrad(ctx, cellSize, onTarget) {
  if (onTarget) {
    if (!_boxOnTargetGradCache || _cachedCellSize !== cellSize) {
      _boxOnTargetGradCache = ctx.createLinearGradient(0, 0, cellSize, cellSize);
      _boxOnTargetGradCache.addColorStop(0, '#6BCB77');
      _boxOnTargetGradCache.addColorStop(1, '#4CAF50');
    }
    _cachedCellSize = cellSize;
    return _boxOnTargetGradCache;
  } else {
    if (!_boxGradCache || _cachedCellSize !== cellSize) {
      _boxGradCache = ctx.createLinearGradient(0, 0, cellSize, cellSize);
      _boxGradCache.addColorStop(0, '#CD853F');
      _boxGradCache.addColorStop(1, '#8B4513');
    }
    _cachedCellSize = cellSize;
    return _boxGradCache;
  }
}

function drawControls(ctx, boardOffsetY, cellSize, size, width) {
  let btnSize = 50;
  let btnY = boardOffsetY + size * cellSize + 20;
  let btnGap = 10;
  let btnStartX = (width - btnSize * 3 - btnGap * 2) / 2;

  let positions = [
    { r: 0, c: 1, text: '⬆️' },
    { r: 1, c: 0, text: '⬅️' },
    { r: 1, c: 2, text: '➡️' },
    { r: 1, c: 1, text: '⬇️' }
  ];

  for (let pos of positions) {
    let bx = btnStartX + pos.c * (btnSize + btnGap);
    let by = btnY + pos.r * (btnSize + btnGap);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    roundRect(ctx, bx, by, btnSize, btnSize, 12);
    ctx.fill();

    ctx.font = (btnSize * 0.5) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(pos.text, bx + btnSize / 2, by + btnSize / 2 + 8);
  }
}

module.exports = {
  drawStatus,
  drawBoard,
  drawControls
};
