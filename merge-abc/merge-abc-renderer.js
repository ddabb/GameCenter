const { roundRect } = require('./merge-abc-core');

function drawStatus(ctx, width, padding, headerBarStartY, score, bestScore) {
  const y = headerBarStartY;
  const cardW = (width - padding * 2 - 10) / 2;
  const cardH = 36;

  // 当前分
  const cx = padding;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, cx, y, cardW, cardH, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px Arial, -apple-system';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('当前分', cx + 10, y + cardH / 2 - 1);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Arial, -apple-system';
  ctx.textAlign = 'right';
  ctx.fillText(score, cx + cardW - 10, y + cardH / 2 - 1);

  // 最高分
  const bx = padding + cardW + 10;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  roundRect(ctx, bx, y, cardW, cardH, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '11px Arial, -apple-system';
  ctx.textAlign = 'left';
  ctx.fillText('最高分', bx + 10, y + cardH / 2 - 1);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 14px Arial, -apple-system';
  ctx.textAlign = 'right';
  ctx.fillText(bestScore, bx + cardW - 10, y + cardH / 2 - 1);

  ctx.textAlign = 'left';
}

function drawBoard(ctx, width, padding, boardOffsetY, tiles) {
  const tileSize = (width - padding * 5) / 4;

  ctx.fillStyle = '#1a1a2e';
  roundRect(ctx, padding, boardOffsetY, width - padding * 2, width - padding * 2, 8);
  ctx.fill();

  for (let i = 0; i < 16; i++) {
    const row = Math.floor(i / 4);
    const col = i % 4;
    const x = padding + col * (tileSize + padding);
    const y = boardOffsetY + row * (tileSize + padding);

    // 空格子边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    roundRect(ctx, x, y, tileSize, tileSize, 6);
    ctx.stroke();

    const tile = tiles[i];
    if (tile) {
      const tileColors = {
        'A': '#FF6B6B', 'B': '#4ECDC4', 'C': '#45B7D1', 'D': '#96CEB4',
        'E': '#FFEAA7', 'F': '#DDA0DD', 'G': '#98D8C8', 'H': '#F7DC6F',
        'I': '#BB8FCE', 'J': '#85C1E9', 'K': '#F8B500', 'L': '#00CED1'
      };
      ctx.fillStyle = tileColors[tile] || '#777';
      roundRect(ctx, x, y, tileSize, tileSize, 6);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      roundRect(ctx, x, y, tileSize, tileSize, 6);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${tileSize * 0.4}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tile, x + tileSize / 2, y + tileSize / 2);
    }
  }
  ctx.textAlign = 'left';
}

module.exports = {
  drawStatus,
  drawBoard,
};
