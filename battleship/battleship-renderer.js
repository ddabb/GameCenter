/**
 * battleship-renderer.js — 战舰谜题 Canvas 绘制函数
 *
 * 所有函数接收 ctx 和渲染所需的状态参数，不持有内部状态。
 * 依赖 battleship-core.js 提供常量（CELL_EMPTY/CELL_SHIP/CELL_WATER）。
 */

const { roundRect, formatTime, CELL_EMPTY, CELL_SHIP, CELL_WATER } = require('./battleship-core');

let _bgGradient = null;

function drawBackground(ctx, width, height) {
  if (!_bgGradient) {
    _bgGradient = ctx.createLinearGradient(0, 0, width, height);
    _bgGradient.addColorStop(0, '#1a1a2e');
    _bgGradient.addColorStop(1, '#16213e');
  }
  ctx.fillStyle = _bgGradient;
  ctx.fillRect(0, 0, width, height);
}

function drawHeader(ctx, width, statusBarHeight) {
  const y0 = statusBarHeight + 25;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, 15, y0 + 8, 70, 32, 8);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText('← 返回', 50, y0 + 29);

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText('指尖谜题:🚢 战舰', width / 2, y0 + 30);
  ctx.textAlign = 'left';
}

function drawStatus(ctx, width, boardOffsetY, difficulty, level, timer, shipCount, totalShips) {
  const difficultyText = difficulty === 'easy' ? '简单' : (difficulty === 'medium' ? '中等' : '困难');
  const timeStr = formatTime(timer);
  const y = boardOffsetY - 15;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`${difficultyText} · 第${level}关 · ⏱${timeStr} · 🚢${shipCount}/${totalShips}`, width / 2, y);
  ctx.textAlign = 'left';
}

function drawHints(ctx, boardOffsetX, boardOffsetY, hintAreaSize, cellSize, size, rowHints, colHints) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(boardOffsetX, boardOffsetY, hintAreaSize + cellSize * size, hintAreaSize + cellSize * size);

  ctx.font = 'bold ' + Math.min(14, hintAreaSize * 0.6) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let c = 0; c < size; c++) {
    const x = boardOffsetX + hintAreaSize + c * cellSize + cellSize / 2;
    const y = boardOffsetY + hintAreaSize / 2;
    if (colHints[c] > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(colHints[c], x, y);
    }
  }

  for (let r = 0; r < size; r++) {
    const x = boardOffsetX + hintAreaSize / 2;
    const y = boardOffsetY + hintAreaSize + r * cellSize + cellSize / 2;
    if (rowHints[r] > 0) {
      ctx.fillStyle = '#FFD700';
      ctx.fillText(rowHints[r], x, y);
    }
  }
}

function drawGrid(ctx, boardOffsetX, boardOffsetY, hintAreaSize, cellSize, size, grid, animationTime) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const x = boardOffsetX + hintAreaSize + c * cellSize;
      const y = boardOffsetY + hintAreaSize + r * cellSize;
      const state = grid[r][c];

      ctx.fillStyle = state === CELL_EMPTY ? '#2a3a5a' : (state === CELL_SHIP ? '#4a7ab8' : '#1e3a5f');
      ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
      ctx.lineWidth = 1;

      ctx.beginPath();
      roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
      ctx.fill();
      ctx.stroke();

      if (state === CELL_SHIP) {
        const scale = 1 + Math.sin(animationTime * 2) * 0.05;
        ctx.font = Math.floor(cellSize * 0.6 * scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚢', x + cellSize / 2, y + cellSize / 2);
      } else if (state === CELL_WATER) {
        ctx.font = Math.floor(cellSize * 0.5) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💧', x + cellSize / 2, y + cellSize / 2);
      }
    }
  }
}

function drawErrorHint(ctx, width, boardOffsetY, hintAreaSize, cellSize, size, errorHint, errorHintTime) {
  if (!errorHint || !errorHintTime) return;
  const elapsed = Date.now() - errorHintTime;
  if (elapsed >= 3000) return;

  const alpha = elapsed < 2500 ? 0.92 : 0.92 * (1 - (elapsed - 2500) / 500);
  if (alpha <= 0) return;

  const panelW = Math.min(width - 40, 260);
  const panelH = 56;
  const panelX = (width - panelW) / 2;
  const panelY = boardOffsetY + hintAreaSize + cellSize * size + 10;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#d32f2f';
  ctx.beginPath();
  roundRect(ctx, panelX, panelY, panelW, panelH, 12);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText('❌ ' + errorHint, width / 2, panelY + 34);
  ctx.textAlign = 'left';
  ctx.restore();
}

function drawBottomBar(bottomBar) {
  bottomBar.setButtons([
    { id: 'undo', text: '↩️ 撤销' },
    { id: 'reset', text: '🔄 重置' },
    { id: 'hint', text: '💡 提示' }
  ]);
  bottomBar.draw();
}

module.exports = {
  drawBackground,
  drawHeader,
  drawStatus,
  drawHints,
  drawGrid,
  drawErrorHint,
  drawBottomBar,
};
