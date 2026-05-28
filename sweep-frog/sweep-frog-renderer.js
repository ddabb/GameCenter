/**
 * sweep-frog-renderer.js — 躲避牛蛙 Canvas 绘制函数
 *
 * 所有函数接收 ctx 和渲染所需的状态参数，不持有内部状态。
 * 包含：状态栏、棋盘绘制（🐸🐮💧标记）、旗帜提示、最佳时间。
 */

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function drawStatus(ctx, width, boardOffsetY, totalMines, flaggedCount, time) {
  const y = boardOffsetY + 20 - 18;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`剩余 ${totalMines - flaggedCount}  ·  ⏱ ${formatTime(time)}`, width / 2, y);
  ctx.textAlign = 'left';
}

function drawBoard(ctx, board, rows, cols, cellSize, boardOffsetX, boardOffsetY, roundRect) {
  const offsetX = boardOffsetX;
  const offsetY = boardOffsetY + 20; // 留出工具栏

  const colors = ['#3498db', '#27ae60', '#e74c3c', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#7f8c8d'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize;
      const y = offsetY + r * cellSize;
      const cell = board[r] ? board[r][c] : null;
      if (!cell) continue;

      // 格子背景
      if (cell.revealed) {
        ctx.fillStyle = cell.isFrog ? '#c0392b' : 'rgba(255,255,255,0.08)';
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
      }
      ctx.beginPath();
      roundRect(ctx, x + 1, y + 1, cellSize - 2, cellSize - 2, 4);
      ctx.fill();

      // 内容
      ctx.font = `${Math.floor(cellSize * 0.5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (cell.revealed) {
        if (cell.isFrog) {
          ctx.fillText('🐸', x + cellSize / 2, y + cellSize / 2);
        } else if (cell.nearby === 0) {
          ctx.fillText('💧', x + cellSize / 2, y + cellSize / 2);
        } else {
          ctx.fillStyle = colors[cell.nearby] || '#fff';
          ctx.fillText(String(cell.nearby), x + cellSize / 2, y + cellSize / 2);
        }
      } else if (cell.flagged) {
        ctx.fillText('🚩', x + cellSize / 2, y + cellSize / 2);
      }
    }
  }
}

function drawRuleButton(ctx, width) {
  const btnX = width - 50, btnY = 50, btnW = 35, btnH = 32;

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  roundRect(ctx, btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('?', btnX + btnW / 2, btnY + 21);

  return { x: btnX, y: btnY, w: btnW, h: btnH };
}

function drawFlagsHint(ctx, width, y, flagMode) {
  ctx.textAlign = 'center';
  if (flagMode) {
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px Arial';
    ctx.fillText('🚩 标记模式 — 点击格子上锁', width / 2, y + 14);
  }
}

function drawBestTime(ctx, width, height, bestTime) {
  if (bestTime) {
    ctx.fillStyle = 'rgba(255,215,0,0.8)';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 最短时间: ' + formatTime(bestTime), width / 2, height - 30);
  }
}

function drawLoadingText(ctx, width, y) {
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('⏳ 正在加载棋盘...', width / 2, y + 80);
}

module.exports = {
  formatTime,
  drawStatus,
  drawBoard,
  drawRuleButton,
  drawFlagsHint,
  drawBestTime,
  drawLoadingText
};
