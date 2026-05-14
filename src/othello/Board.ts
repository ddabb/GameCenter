/**
 * 黑白棋棋盘逻辑（纯数据，无渲染依赖）
 * 基于 freetools/GeZiPuzzle 已验证算法
 */
export const GRID_SIZE = 8;
export const EMPTY = 0;
export const BLACK = 1;  // 玩家
export const WHITE = 2;  // AI

// 8个方向
const DIRS: [number, number][] = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],           [0, 1],
    [1, -1],  [1, 0],  [1, 1]
];

// 位置权重表（角最重要，边次之，靠近角的差）
export const POSITION_WEIGHT: number[][] = [
    [100, -20, 10, 5, 5, 10, -20, 100],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [10, -2, 1, 1, 1, 1, -2, 10],
    [5, -2, 1, 0, 0, 1, -2, 5],
    [5, -2, 1, 0, 0, 1, -2, 5],
    [10, -2, 1, 1, 1, 1, -2, 10],
    [-20, -50, -2, -2, -2, -2, -50, -20],
    [100, -20, 10, 5, 5, 10, -20, 100]
];

export type Cell = { r: number; c: number };
export type BoardData = number[][];

/** 初始化标准开局 */
export function initBoard(): BoardData {
    const board: BoardData = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(EMPTY));
    board[3][3] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;
    board[4][4] = WHITE;
    return board;
}

/** 获取落子后能翻转的格子列表 */
export function getCellsToFlip(board: BoardData, r: number, c: number, player: number): Cell[] {
    if (board[r][c] !== EMPTY) return [];
    const opponent = player === BLACK ? WHITE : BLACK;
    const cells: Cell[] = [];

    for (const [dr, dc] of DIRS) {
        let nr = r + dr, nc = c + dc;
        const line: Cell[] = [];
        while (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            if (board[nr][nc] === opponent) {
                line.push({ r: nr, c: nc });
            } else if (board[nr][nc] === player) {
                cells.push(...line);
                break;
            } else {
                break;
            }
            nr += dr;
            nc += dc;
        }
    }
    return cells;
}

/** 获取玩家所有合法落子位置 */
export function getValidMoves(board: BoardData, player: number): Cell[] {
    const moves: Cell[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (getCellsToFlip(board, r, c, player).length > 0) {
                moves.push({ r, c });
            }
        }
    }
    return moves;
}

/** 执行落子（修改原数组） */
export function makeMove(board: BoardData, r: number, c: number, player: number): void {
    const cells = getCellsToFlip(board, r, c, player);
    board[r][c] = player;
    for (const cell of cells) {
        board[cell.r][cell.c] = player;
    }
}

/** 统计双方棋子数 */
export function getCounts(board: BoardData): { black: number; white: number } {
    let black = 0, white = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === BLACK) black++;
            else if (board[r][c] === WHITE) white++;
        }
    }
    return { black, white };
}

/** 检查游戏是否结束（双方都无法走） */
export function isGameOver(board: BoardData): boolean {
    return getValidMoves(board, BLACK).length === 0 && getValidMoves(board, WHITE).length === 0;
}

/** 深拷贝棋盘 */
export function cloneBoard(board: BoardData): BoardData {
    return board.map(row => [...row]);
}
