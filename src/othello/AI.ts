/**
 * 黑白棋 AI（Minimax + Alpha-Beta 剪枝）
 * 三档难度：easy(1层), medium(3层), hard(5层)
 */
import { BoardData, BLACK, WHITE, getValidMoves, makeMove, cloneBoard, isGameOver, POSITION_WEIGHT, Cell } from './Board';

type Difficulty = 'easy' | 'medium' | 'hard';

const DEPTH_MAP: Record<Difficulty, number> = { easy: 1, medium: 3, hard: 5 };

/** 评估函数：基于位置权重 + 棋子数量差 */
function evaluate(board: BoardData): number {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === WHITE) score += POSITION_WEIGHT[r][c];
            else if (board[r][c] === BLACK) score -= POSITION_WEIGHT[r][c];
        }
    }
    if (isGameOver(board)) {
        let w = 0, b = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === WHITE) w++;
                else if (board[r][c] === BLACK) b++;
            }
        }
        score += (w - b) * 100;
    }
    return score;
}

/** Minimax + Alpha-Beta */
function minimax(board: BoardData, depth: number, alpha: number, beta: number, isMax: boolean): number {
    if (depth === 0 || isGameOver(board)) return evaluate(board);
    const player = isMax ? WHITE : BLACK;
    const moves = getValidMoves(board, player);

    if (moves.length === 0) return minimax(board, depth - 1, alpha, beta, !isMax);

    if (isMax) {
        let maxScore = -Infinity;
        for (const m of moves) {
            const oldBoard = cloneBoard(board);
            makeMove(oldBoard, m.r, m.c, player);
            const s = minimax(oldBoard, depth - 1, alpha, beta, false);
            maxScore = Math.max(maxScore, s);
            alpha = Math.max(alpha, s);
            if (beta <= alpha) break;
        }
        return maxScore;
    } else {
        let minScore = Infinity;
        for (const m of moves) {
            const oldBoard = cloneBoard(board);
            makeMove(oldBoard, m.r, m.c, player);
            const s = minimax(oldBoard, depth - 1, alpha, beta, true);
            minScore = Math.min(minScore, s);
            beta = Math.min(beta, s);
            if (beta <= alpha) break;
        }
        return minScore;
    }
}

/** 获取 AI 最佳落子 */
export function getAIMove(board: BoardData, difficulty: Difficulty): Cell | null {
    const moves = getValidMoves(board, WHITE);
    if (moves.length === 0) return null;

    const depth = DEPTH_MAP[difficulty];

    // easy 模式：选位置权重最高的
    if (depth === 1) {
        let best = moves[0], bestScore = -Infinity;
        for (const m of moves) {
            const s = POSITION_WEIGHT[m.r][m.c];
            if (s > bestScore) { bestScore = s; best = m; }
        }
        return best;
    }

    let bestMove: Cell | null = null;
    let bestScore = -Infinity;

    for (const m of moves) {
        const testBoard = cloneBoard(board);
        makeMove(testBoard, m.r, m.c, WHITE);
        const score = minimax(testBoard, depth - 1, -Infinity, Infinity, false);
        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
    }

    return bestMove;
}
