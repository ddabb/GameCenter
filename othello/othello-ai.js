/**
 * othello-ai.js — 黑白棋 AI 搜索（Minimax + Alpha-Beta 剪枝）
 *
 * 依赖 othello-core.js 提供纯棋盘逻辑，本模块只负责搜索策略。
 * 所有函数为纯函数，不修改传入的 board（内部复制后操作）。
 */

const core = require('./othello-core.js');
const {
  BLACK, WHITE, getOpponent,
  cloneBoard, applyMove, getValidMoves, hasValidMoves,
  evaluateBoard
} = core;

/**
 * AI 搜索入口：找到指定深度的最佳着法。
 *
 * 使用 Minimax + Alpha-Beta 剪枝：
 * - AI（白棋）为最大化层，玩家（黑棋）为最小化层
 * - 复杂度从 O(b^d) 降到约 O(b^(d/2))
 *
 * @param {number[][]} board    - 当前 8×8 棋盘（不会被修改）
 * @param {number} player       - AI 的颜色（应为 WHITE）
 * @param {number} depth        - 搜索深度（2~5，由难度决定）
 * @returns {{row:number, col:number}|null} 最佳着法，无合法着法返回 null
 */
function findBestMove(board, player, depth) {
  const moves = getValidMoves(board, player);
  if (moves.length === 0) return null;

  let bestMove = null;
  let bestScore = -Infinity;

  for (let move of moves) {
    // 在副本上模拟落子
    const boardCopy = cloneBoard(board);
    applyMove(move.row, move.col, boardCopy, player);

    // 对手回合 → 最小化层
    const score = minimax(boardCopy, depth - 1, -Infinity, Infinity, false, getOpponent(player));

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

/**
 * Minimax 递归搜索（带 Alpha-Beta 剪枝）。
 *
 * @param {number[][]} board      - 当前棋盘副本（会被原地修改用于模拟）
 * @param {number} depth          - 剩余深度
 * @param {number} alpha          - Alpha 值（下界）
 * @param {number} beta           - Beta 值（上界）
 * @param {boolean} isMaximizing  - 是否为最大化层（AI 层）
 * @param {number} player         - 当前模拟回合的玩家
 * @returns {number} 局面评估分数
 */
function minimax(board, depth, alpha, beta, isMaximizing, player) {
  // 递归终止：深度用完 → 静态评估
  if (depth === 0) return evaluateBoard(board);

  const moves = getValidMoves(board, player);

  // 当前玩家无合法着法
  if (moves.length === 0) {
    const opponent = getOpponent(player);
    // 对手是否也无棋可走 → 游戏结束
    if (!hasValidMoves(board, opponent)) {
      return evaluateBoard(board) * 100;  // 放大终局分数
    }
    // 否则跳过当前玩家，继续搜索
    return minimax(board, depth - 1, alpha, beta, !isMaximizing, opponent);
  }

  if (isMaximizing) {
    // 最大化层（AI / 白棋）
    let maxScore = -Infinity;
    for (let move of moves) {
      const boardCopy = cloneBoard(board);
      applyMove(move.row, move.col, boardCopy, WHITE);
      const score = minimax(boardCopy, depth - 1, alpha, beta, false, getOpponent(player));
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;  // Beta 剪枝
    }
    return maxScore;
  } else {
    // 最小化层（玩家 / 黑棋）
    let minScore = Infinity;
    for (let move of moves) {
      const boardCopy = cloneBoard(board);
      applyMove(move.row, move.col, boardCopy, BLACK);
      const score = minimax(boardCopy, depth - 1, alpha, beta, true, getOpponent(player));
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;  // Alpha 剪枝
    }
    return minScore;
  }
}

module.exports = { findBestMove, minimax };
