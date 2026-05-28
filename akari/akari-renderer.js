/**
 * akari-renderer.js - 数灯 Canvas 绘制函数
 */
const roundRect = require('../utils/round-rect.js');

function drawStatsBar(ctx, game) {
  const timeStr = game._formatTime(game.timer);
  const hintText = game.hintMgr.canHint()
    ? `${game.hintMgr.maxHints - game.hintMgr.usedHints}次` : '0次';
  const y = game.statusBarHeight + 68;
  const tw = game.width;

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  roundRect(ctx, 12, y, tw - 24, 36, 10);
  ctx.fill();

  ctx.fillStyle = '#333';
  ctx.font = 'bold 13px Arial, -apple-system';
  ctx.textAlign = 'left';
  ctx.fillText(`第${game.level}关`, 24, y + 24);

  ctx.fillStyle = '#f5576c';
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px Arial, -apple-system';
  ctx.fillText(`⏱ ${timeStr}`, tw / 2 - 10, y + 24);

  ctx.fillStyle = '#f5576c';
  ctx.textAlign = 'right';
  ctx.font = 'bold 13px Arial, -apple-system';
  ctx.fillText(`💡 ${game.lightsCount}/${game.maxLights || '?'} · 提示${hintText}`, tw - 24, y + 24);

  ctx.textAlign = 'left';
}

function drawGrid(ctx, game) {
  const core = require('./akari-core.js');
  const size = game.size;
  const rows = Math.min(size, game.grid.length);

  for (let r = 0; r < rows; r++) {
    const cols = Math.min(size, game.grid[r] ? game.grid[r].length : 0);
    for (let c = 0; c < cols; c++) {
      const x = game.offsetX + c * game.cellSize;
      const y = game.offsetY + r * game.cellSize;
      const cell = game.grid[r][c];
      const isLight = game.lights[r][c];
      const isLit = game.lit[r][c];
      const isWhite = cell < core.CELL_BLACK;

      if (cell >= core.CELL_BLACK) {
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, game.cellSize, game.cellSize);

        if (cell >= core.CELL_BLACK_0) {
          const num = cell - core.CELL_BLACK_0;
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.max(14, game.cellSize * 0.45)}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(num, x + game.cellSize / 2, y + game.cellSize / 2);
        }
      } else {
        ctx.fillStyle = isLight ? '#ffe066' : (isLit ? '#fff3cd' : '#ffffff');
        ctx.fillRect(x, y, game.cellSize, game.cellSize);

        if (isLight) {
          const glow = Math.sin(game.animationTime * 2) * 0.08 + 0.92;
          ctx.globalAlpha = glow;
          ctx.fillStyle = '#ffb300';
          ctx.beginPath();
          ctx.arc(x + game.cellSize / 2, y + game.cellSize / 2, game.cellSize * 0.28, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;

          drawLightRays(ctx, game, r, c);
        }
      }

      ctx.strokeStyle = '#d0d0d0';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, game.cellSize, game.cellSize);
    }
  }
}

function drawLightRays(ctx, game, row, col) {
  const core = require('./akari-core.js');
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  ctx.strokeStyle = 'rgba(255, 179, 0, 0.3)';
  ctx.lineWidth = Math.max(3, game.cellSize * 0.12);

  for (const [dr, dc] of dirs) {
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < game.size && c >= 0 && c < game.size) {
      if (!game.grid[r] || game.grid[r][c] >= core.CELL_BLACK) break;
      const bx = game.offsetX + c * game.cellSize + game.cellSize / 2;
      const by = game.offsetY + r * game.cellSize + game.cellSize / 2;
      ctx.beginPath();
      ctx.moveTo(game.offsetX + col * game.cellSize + game.cellSize / 2,
        game.offsetY + row * game.cellSize + game.cellSize / 2);
      ctx.lineTo(bx, by);
      ctx.stroke();
      if (game.lights[r] && game.lights[r][c]) break;
      r += dr; c += dc;
    }
  }
}

function drawBottomBar(ctx, game) {
  const hintEnabled = game.hintMgr.canHint() && !game.showAnswer;
  const hintText = hintEnabled
    ? `💡 提示(${game.hintMgr.maxHints - game.hintMgr.usedHints})`
    : '💡 提示(0)';

  game.bottomBar.setButtons([
    { id: 'undo', text: '↩️ 撤销', enabled: game.undoMgr.canUndo() },
    { id: 'verify', text: '🔍 验证' },
    { id: 'hint', text: hintText, enabled: hintEnabled },
    { id: 'answer', text: game.showAnswer ? '🙈 隐藏' : '💡 答案' },
    { id: 'rule', text: '📖 规则' }
  ], false);
  game.bottomBar.draw();

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('点击放置/取消灯塔 💡', game.width / 2, game.height - 15);
}

module.exports = {
  drawStatsBar,
  drawGrid,
  drawLightRays,
  drawBottomBar
};
