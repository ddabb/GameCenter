/**
 * othello-core.js — 黑白棋核心规则（纯函数，无副作用）
 *
 * 所有函数接收 board 和 player 作为参数，不依赖外部状态。
 * AI 搜索和 UI 渲染均依赖此模块获取棋盘逻辑。
 */

// ========== 常量 ==========

/** 黑棋 */
const BLACK = 1;
/** 白棋（AI） */
const WHITE = 2;
/** 8个方向：上、下、左、右 + 4个对角线 */
const DIRECTIONS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

/**
 * 位置权重矩阵（8×8）
 * - 角(100)：占领后不可翻转，最重要
 * - 边(10)：仅次于角
 * - 中心(5)：安全位置
 * - 禁着点(-20/-50)：紧邻角的危险位置，易送角给对手
 */
const POSITION_WEIGHTS = [
  [100, -20, 10, 5, 5, 10, -20, 100],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [5, -2, 1, 0, 0, 1, -2, 5],
  [10, -2, 1, 1, 1, 1, -2, 10],
  [-20, -50, -2, -2, -2, -2, -50, -20],
  [100, -20, 10, 5, 5, 10, -20, 100]
];

// ========== 辅助函数 ==========

/** @returns {number} 对手颜色 */
function getOpponent(player) {
  return player === BLACK ? WHITE : BLACK;
}

// ========== 棋盘操作 ==========

/**
 * 深拷贝棋盘。
 * @param {number[][]} board - 8×8 棋盘
 * @returns {number[][]}
 */
function cloneBoard(board) {
  return board.map(row => [...row]);
}

/**
 * 判断在 (row, col) 落子是否为合法着法。
 *
 * 检查 8 个方向，至少一个方向满足：
 * 1. 紧邻对方棋子
 * 2. 沿该方向最终遇到己方棋子（形成「夹子」）
 *
 * @param {number} row - 行（0-7）
 * @param {number} col - 列（0-7）
 * @param {number[][]} board - 8×8 棋盘
 * @param {number} player - 落子方（BLACK/WHITE）
 * @returns {boolean}
 */
function canPlace(row, col, board, player) {
  const opponent = getOpponent(player);

  for (let dir of DIRECTIONS) {
    let r = row + dir[0];
    let c = col + dir[1];
    let foundOpponent = false;

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c] === opponent) {
        foundOpponent = true;   // 遇到对方棋子，继续找
      } else if (board[r][c] === player) {
        if (foundOpponent) return true;  // 遇到己方棋子且中间有对方 → 合法
        break;
      } else {
        break;  // 空格：不构成夹子
      }
      r += dir[0];
      c += dir[1];
    }
  }
  return false;
}

/**
 * 收集落子后所有将被翻转的对方棋子坐标。
 * 用于 AI 搜索时的模拟翻转。
 *
 * @param {number} row
 * @param {number} col
 * @param {number[][]} board
 * @param {number} player
 * @returns {number[][]} 将被翻转的棋子坐标列表 [[r,c], ...]
 */
function getFlippedPieces(row, col, board, player) {
  const opponent = getOpponent(player);
  const allFlips = [];

  for (let dir of DIRECTIONS) {
    let r = row + dir[0];
    let c = col + dir[1];
    let toFlip = [];

    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
      if (board[r][c] === opponent) {
        toFlip.push([r, c]);
      } else if (board[r][c] === player) {
        allFlips.push(...toFlip);
        break;
      } else {
        break;
      }
      r += dir[0];
      c += dir[1];
    }
  }
  return allFlips;
}

/**
 * 在棋盘副本上执行落子 + 翻转（原地修改，用于 AI 模拟）。
 * 调用方需先复制棋盘再传入。
 *
 * @param {number} row
 * @param {number} col
 * @param {number[][]} board - 棋盘副本（会被原地修改）
 * @param {number} player - 落子方
 */
function applyMove(row, col, board, player) {
  board[row][col] = player;
  const flips = getFlippedPieces(row, col, board, player);
  for (let [r, c] of flips) {
    board[r][c] = player;
  }
}

/**
 * 获取某方的所有合法着法。
 * @param {number[][]} board
 * @param {number} player
 * @returns {{row:number, col:number}[]}
 */
function getValidMoves(board, player) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === 0 && canPlace(r, c, board, player)) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

/**
 * 检查某方是否有合法着法。
 * @param {number[][]} board
 * @param {number} player
 * @returns {boolean}
 */
function hasValidMoves(board, player) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === 0 && canPlace(r, c, board, player)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 统计棋盘上黑白棋子数量。
 * @param {number[][]} board
 * @returns {{black:number, white:number}}
 */
function countPieces(board) {
  let black = 0, white = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === BLACK) black++;
      else if (board[r][c] === WHITE) white++;
    }
  }
  return { black, white };
}

// ========== AI 评估函数 ==========

/**
 * 评估当前棋盘局面（从白棋/AI 视角）。
 *
 * 两大评估维度：
 * 1. 位置权重矩阵 × 棋子颜色
 * 2. 行动力差（mobility）× 2：合法着法数多者有利
 *
 * @param {number[][]} board
 * @returns {number} 正值 → 白棋(AI)优势，负值 → 黑棋(玩家)优势
 */
function evaluateBoard(board) {
  let score = 0;

  // 1. 位置权重
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === WHITE) {
        score += POSITION_WEIGHTS[r][c];
      } else if (board[r][c] === BLACK) {
        score -= POSITION_WEIGHTS[r][c];
      }
    }
  }

  // 2. 行动力差
  const whiteMoves = getValidMoves(board, WHITE).length;
  const blackMoves = getValidMoves(board, BLACK).length;
  score += (whiteMoves - blackMoves) * 2;

  return score;
}

module.exports = {
  // 常量
  BLACK,
  WHITE,
  DIRECTIONS,
  POSITION_WEIGHTS,
  // 辅助
  getOpponent,
  // 棋盘操作
  cloneBoard,
  canPlace,
  getFlippedPieces,
  applyMove,
  getValidMoves,
  hasValidMoves,
  countPieces,
  // AI
  evaluateBoard
};
