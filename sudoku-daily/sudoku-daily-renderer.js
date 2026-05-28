/**
 * sudoku-daily-renderer.js - 每日数独绘制函数
 */
const roundRect = require('../utils/round-rect.js');

function drawTimer(game) {
  const minutes = Math.floor(game.timer / 60);
  const seconds = game.timer % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const x = game.width / 2;
  const y = game._statusY + game._statusH / 2 + 1;

  game.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  game.ctx.font = '13px Arial, -apple-system';
  game.ctx.textAlign = 'center';
  game.ctx.textBaseline = 'middle';
  game.ctx.fillText(`⏱ ${timeStr}`, x, y);
}

function drawStatus(game) {
  const ctx = game.ctx;
  const y = game._statusY;
  const name = game.dailyData ? game.dailyData.name : require('./sudoku-daily-core.js').buildDailyDisplay(game.todayDate);
  const diff = game.dailyData ? (game.dailyData.difficulty || '') : '';

  // 左侧：日期·难度
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '12px Arial, -apple-system';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${name} · ${diff}`, 15, y + game._statusH / 2);

  // 右侧：计时器
  const minutes = Math.floor(game.timer / 60);
  const seconds = game.timer % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'right';
  ctx.fillText(`⏱ ${timeStr}`, game.width - 15, y + game._statusH / 2);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawBoard(game) {
  const startX = game._boardStartX;
  const startY = game._boardStartY;
  const boardSize = game._boardSize;
  const cellSize = game._cellSize;
  const board = game.board;
  const showCandidates = game.showCandidates;
  const selectedCell = game.selectedCell;
  const ctx = game.ctx;

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  roundRect(ctx, startX, startY, boardSize, boardSize, 12);
  ctx.fill();

  ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  for (let i = 0; i <= 9; i++) {
    const pos = startX + i * cellSize;
    const posY = startY + i * cellSize;

    ctx.strokeStyle = i % 3 === 0 ? '#1a1a2e' : '#ddd';
    ctx.lineWidth = i % 3 === 0 ? 2.5 : 0.8;
    ctx.beginPath();
    ctx.moveTo(pos, startY);
    ctx.lineTo(pos, startY + boardSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(startX, posY);
    ctx.lineTo(startX + boardSize, posY);
    ctx.stroke();
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const cell = board[r][c];
      const cx = startX + c * cellSize;
      const cy = startY + r * cellSize;

      if (cell.value) {
        if (cell.fixed) {
          ctx.fillStyle = '#1a1a2e';
          ctx.font = `bold ${cellSize * 0.55}px Arial`;
        } else {
          ctx.fillStyle = cell.error ? '#e74c3c' : '#2196F3';
          ctx.font = `bold ${cellSize * 0.55}px Arial`;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cell.value, cx + cellSize / 2, cy + cellSize / 2);
      } else if (showCandidates && cell.candidates.some(n => n > 0)) {
        const candSize = cellSize / 3;
        for (let n = 0; n < 9; n++) {
          if (cell.candidates[n] > 0) {
            const nr = Math.floor(n / 3);
            const nc = n % 3;
            const nx = cx + nc * candSize + candSize / 2;
            const ny = cy + nr * candSize + candSize / 2;

            ctx.fillStyle = '#666';
            ctx.font = `bold ${candSize * 0.55}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(n + 1), nx, ny);
          }
        }
      }
    }
  }

  if (selectedCell.row >= 0) {
    const sx = startX + selectedCell.col * cellSize;
    const sy = startY + selectedCell.row * cellSize;
    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 3;
    ctx.strokeRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4);

    ctx.fillStyle = 'rgba(33, 150, 243, 0.08)';
    ctx.fillRect(sx, sy, cellSize, cellSize);
  }
}

function drawNumberPad(game) {
  const btnSize = game._btnSize;
  const gap = game._btnGap;
  const startX = game._numPadStartX;
  const startY = game._numPadStartY;
  const ctx = game.ctx;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const btnX = startX + col * (btnSize + gap);
      const btnY = startY + row * (btnSize + gap);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.beginPath();
      roundRect(ctx, btnX, btnY, btnSize, btnSize, 8);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${btnSize * 0.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(row * 3 + col + 1), btnX + btnSize / 2, btnY + btnSize / 2);
    }
  }

  const clearBtnX = startX;
  const clearBtnY = game._clearBtnY;
  const clearBtnW = game._numPadGridW;
  const clearBtnH = 36;

  ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
  ctx.beginPath();
  roundRect(ctx, clearBtnX, clearBtnY, clearBtnW, clearBtnH, 8);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('清除', clearBtnX + clearBtnW / 2, clearBtnY + clearBtnH / 2);
}

module.exports = {
  drawTimer,
  drawStatus,
  drawBoard,
  drawNumberPad
};
