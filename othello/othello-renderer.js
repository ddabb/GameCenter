/**
 * othello-renderer.js — 黑白棋画面渲染（纯函数，无副作用）
 *
 * 所有函数接收 ctx 和渲染所需的状态参数，不持有任何内部状态。
 * 依赖 ../utils/round-rect.js 绘制圆角矩形。
 */

const roundRect = require('../utils/round-rect.js');

// ========== 背景 & 布局 ==========

/**
 * 绘制深绿色线性渐变背景。
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function drawBackground(ctx, width, height) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#1a2e1a');
  gradient.addColorStop(1, '#0f1f0f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// ========== 难度选择栏 ==========

/**
 * 绘制难度选择栏（简单 / 中等 / 困难 / 专家）。
 * 当前选中难度显示绿色背景高亮。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{name:string, label:string, depth:number}[]} difficulties
 * @param {string} currentDifficulty - 当前难度名
 * @param {number} statusBarHeight
 * @param {number} width
 */
function drawDifficultyBar(ctx, difficulties, currentDifficulty, statusBarHeight, width) {
  const y = statusBarHeight + 75;
  const w = 60;
  const h = 32;
  const gap = 8;
  const totalW = 4 * w + 3 * gap;
  const startX = (width - totalW) / 2;

  for (let i = 0; i < 4; i++) {
    const x = startX + i * (w + gap);
    const diff = difficulties[i];
    const isActive = diff.name === currentDifficulty;

    // 选中态：绿色半透明外发光
    if (isActive) {
      ctx.fillStyle = 'rgba(107, 203, 119, 0.3)';
      ctx.beginPath();
      roundRect(ctx, x - 2, y - h / 2 - 2, w + 4, h + 4, 8);
      ctx.fill();
    }

    // 按钮底色
    ctx.fillStyle = isActive ? '#6BCB77' : 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    roundRect(ctx, x, y - h / 2, w, h, 8);
    ctx.fill();

    // 文字
    ctx.fillStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)';
    ctx.font = (w * 0.35) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(diff.label, x + w / 2, y + 6);
  }
}

// ========== 状态栏 ==========

/**
 * 绘制棋盘上方的游戏状态信息。
 * 显示内容：⚫黑子数 vs 白子数⚪ · 当前回合/游戏结果
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} boardOffsetY
 * @param {number} width
 * @param {number} blackCount
 * @param {number} whiteCount
 * @param {boolean} gameOver
 * @param {number|null} winner - BLACK/WHITE/null（平局）
 * @param {number} currentPlayer
 * @param {string|null} skipMessage
 * @param {number} BLACK
 * @param {number} WHITE
 */
function drawStatus(ctx, boardOffsetY, width, blackCount, whiteCount, gameOver, winner, currentPlayer, skipMessage, BLACK, WHITE) {
  const y = boardOffsetY - 15;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '13px Arial, -apple-system';
  ctx.textAlign = 'center';

  if (gameOver) {
    const result = winner === BLACK ? '🎉 你赢了！'
      : winner === WHITE ? '💪 AI获胜'
      : '🤝 平局！';
    ctx.fillText(`⚫${blackCount} vs ${whiteCount}⚪ · ${result}`, width / 2, y);
  } else {
    const turn = currentPlayer === BLACK ? '🎯 你的回合'
      : (skipMessage || '🤔 AI思考中...');
    ctx.fillText(`⚫${blackCount} vs ${whiteCount}⚪ · ${turn}`, width / 2, y);
  }
  ctx.textAlign = 'left';
}

// ========== 棋盘 ==========

/**
 * 绘制棋盘：阴影 + 深绿色圆角矩形。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} boardOffsetX
 * @param {number} boardOffsetY
 * @param {number} cellSize
 */
function drawBoard(ctx, boardOffsetX, boardOffsetY, cellSize) {
  const boardSize = cellSize * 8;

  // 棋盘阴影（向右下偏移模拟深度）
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  roundRect(ctx, boardOffsetX + 4, boardOffsetY + 6, boardSize, boardSize, 10);
  ctx.fill();

  // 棋盘背景（深绿色）
  ctx.fillStyle = '#2D5A27';
  ctx.beginPath();
  roundRect(ctx, boardOffsetX, boardOffsetY, boardSize, boardSize, 10);
  ctx.fill();
}

// ========== 棋子 ==========

/**
 * 绘制所有棋子 + 网格线。
 *
 * 渲染优先级：
 * 1. 优先使用 PNG 图片（pieceImages 加载成功时）
 * 2. 降级到 Canvas 径向渐变绘制（图片未加载时）
 *
 * 动画效果：最后一步落子有 sin 脉冲动画（±3px 偏移）
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[][]} board          - 8×8 棋盘数组
 * @param {number} boardOffsetX
 * @param {number} boardOffsetY
 * @param {number} cellSize
 * @param {{row:number, col:number}|null} lastMove  - 最后一步位置
 * @param {number} animationTime      - 动画时间计数器
 * @param {{black:Image|null, white:Image|null}} pieceImages - 棋子 PNG 缓存
 * @param {number} BLACK
 * @param {number} WHITE
 */
function drawPieces(ctx, board, boardOffsetX, boardOffsetY, cellSize, lastMove, animationTime, pieceImages, BLACK, WHITE) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = boardOffsetX + c * cellSize;
      const y = boardOffsetY + r * cellSize;

      // 网格线（深色细线勾勒格子边界）
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cellSize, cellSize);

      if (board[r][c] !== 0) {
        const cx = x + cellSize / 2;     // 棋子中心 X
        const cy = y + cellSize / 2;     // 棋子中心 Y
        const radius = cellSize / 2 - 6;

        // 最后一步脉冲动画（sin 波动产生呼吸感）
        const isLast = lastMove && lastMove.row === r && lastMove.col === c;
        const pulse = isLast ? Math.sin(animationTime * 3) * 3 : 0;

        const isBlack = board[r][c] === BLACK;
        const img = isBlack ? pieceImages.black : pieceImages.white;

        if (img) {
          // 使用 PNG 图片绘制（高质量效果）
          const padding = 6;
          const size = cellSize - padding * 2;
          ctx.drawImage(img, cx - size / 2 + pulse, cy - size / 2 + pulse, size, size);
        } else {
          // 降级方案：Canvas 径向渐变绘制模拟立体棋子
          // 棋子阴影
          ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(cx + 2, cy + 3, radius + pulse, 0, Math.PI * 2);
          ctx.fill();

          // 径向渐变（左上角亮 → 右下角暗，模拟光照）
          const grad = ctx.createRadialGradient(
            cx - radius * 0.3, cy - radius * 0.3, 0,
            cx, cy, radius + pulse
          );

          if (isBlack) {
            grad.addColorStop(0, '#555');
            grad.addColorStop(0.5, '#222');
            grad.addColorStop(1, '#000');
          } else {
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, '#eee');
            grad.addColorStop(1, '#ccc');
          }

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
          ctx.fill();

          // 高光点（模拟光源反射）
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
}

// ========== 可落子提示 ==========

/**
 * 绘制可落子位置提示（仅玩家回合显示）。
 * 每个合法着法显示绿色半透明圆点，带呼吸脉冲动画。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{row:number, col:number}[]} validMoves
 * @param {number} boardOffsetX
 * @param {number} boardOffsetY
 * @param {number} cellSize
 * @param {number} animationTime
 * @param {boolean} showValidHints
 * @param {boolean} gameOver
 * @param {number} currentPlayer
 * @param {boolean} aiThinking
 * @param {number} BLACK
 */
function drawValidMoves(ctx, validMoves, boardOffsetX, boardOffsetY, cellSize, animationTime, showValidHints, gameOver, currentPlayer, aiThinking, BLACK) {
  if (!showValidHints || gameOver || currentPlayer !== BLACK || aiThinking) return;

  for (let move of validMoves) {
    const x = boardOffsetX + move.col * cellSize + cellSize / 2;
    const y = boardOffsetY + move.row * cellSize + cellSize / 2;

    // 呼吸动画：半径在 4~8 间波动
    const pulse = Math.sin(animationTime * 2) * 2;

    ctx.fillStyle = 'rgba(107, 203, 119, 0.5)';
    ctx.beginPath();
    ctx.arc(x, y, 6 + pulse, 0, Math.PI * 2);
    ctx.fill();
  }
}

module.exports = {
  drawBackground,
  drawDifficultyBar,
  drawStatus,
  drawBoard,
  drawPieces,
  drawValidMoves
};
