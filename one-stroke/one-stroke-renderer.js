/**
 * one-stroke-renderer.js — 一笔画 Canvas 绘制函数
 *
 * 所有函数接收 ctx 和渲染所需的状态参数，不持有内部状态。
 * 包含：状态信息、网格绘制、路径连线、答案动画路径。
 */

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function diffLabel(d) {
  return { easy: '简单', medium: '中等', hard: '困难' }[d] || '简单';
}

function drawStatus(ctx, width, boardOffsetY, level, difficulty) {
  const y = boardOffsetY - 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';
  ctx.fillText(`第${level}关 · ${diffLabel(difficulty)}`, width / 2, y);
  ctx.textAlign = 'left';
}

function drawGrid(ctx, cellSize, boardOffsetX, boardOffsetY, rows, cols, grid, path) {
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const x = boardOffsetX + c * cellSize;
      const y = boardOffsetY + r * cellSize;
      const isHole = grid[idx] === 1;
      const inPath = path.indexOf(idx) >= 0;
      const pathIdx = inPath ? path.indexOf(idx) : -1;

      // 格子背景
      if (isHole) {
        ctx.fillStyle = '#2a2a4a';
      } else if (inPath) {
        ctx.fillStyle = '#3a7ca5';
      } else {
        ctx.fillStyle = '#f0f0f0';
      }
      ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);

      // 洞的标记
      if (isHole) {
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 路径序号
      if (inPath && !isHole) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, cellSize * 0.35)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pathIdx + 1, x + cellSize / 2, y + cellSize / 2);
      }

      // 格子边框
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, cellSize, cellSize);
    }
  }

  // 绘制路径连线
  if (path.length > 1) {
    ctx.strokeStyle = '#FFB800';
    ctx.lineWidth = Math.max(2, cellSize * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    const first = path[0];
    ctx.moveTo(boardOffsetX + (first % cols) * cellSize + cellSize / 2,
              boardOffsetY + Math.floor(first / cols) * cellSize + cellSize / 2);
    for (let i = 1; i < path.length; i++) {
      const idx = path[i];
      ctx.lineTo(boardOffsetX + (idx % cols) * cellSize + cellSize / 2,
                 boardOffsetY + Math.floor(idx / cols) * cellSize + cellSize / 2);
    }
    ctx.stroke();
  }
}

function drawAnswerPath(ctx, cellSize, boardOffsetX, boardOffsetY, rows, cols, answerPath, _answerAnimIndex) {
  if (!answerPath || answerPath.length === 0) return;

  // 绘制已动画的答案路径
  ctx.strokeStyle = 'rgba(0, 255, 128, 0.7)';
  ctx.lineWidth = Math.max(3, cellSize * 0.1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const end = Math.min(_answerAnimIndex + 1, answerPath.length);
  if (end > 0) {
    const first = answerPath[0];
    ctx.moveTo(boardOffsetX + (first % cols) * cellSize + cellSize / 2,
              boardOffsetY + Math.floor(first / rows) * cellSize + cellSize / 2);
    for (let i = 1; i < end; i++) {
      const idx = answerPath[i];
      ctx.lineTo(boardOffsetX + (idx % cols) * cellSize + cellSize / 2,
                 boardOffsetY + Math.floor(idx / rows) * cellSize + cellSize / 2);
    }
  }
  ctx.stroke();

  // 答案路径上的序号
  for (let i = 0; i <= _answerAnimIndex && i < answerPath.length; i++) {
    const idx = answerPath[i];
    const x = boardOffsetX + (idx % cols) * cellSize;
    const y = boardOffsetY + Math.floor(idx / cols) * cellSize;
    ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
  }
}

module.exports = {
  formatTime,
  diffLabel,
  drawStatus,
  drawGrid,
  drawAnswerPath
};
