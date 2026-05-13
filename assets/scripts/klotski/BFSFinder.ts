/**
 * 华容道 - BFS 求解器
 */

import { KlotskiGame, GameState } from './KlotskiGame';
import { Piece, Direction, Dir } from './Piece';

/**
 * 移动记录
 */
interface Move {
    piece: Piece;
    direction: Direction;
}

/**
 * BFS 求解器
 */
export class BFSFinder {
    /**
     * 求解华容道
     * @param game 游戏实例
     * @returns 移动序列，或者空数组表示无解
     */
    solve(game: KlotskiGame): string[] {
        const startState = game.getStateKey();
        const visited = new Set<string>();
        
        // BFS 队列：{ game, moves[] }
        interface Node {
            game: KlotskiGame;
            moves: string[];
        }
        
        const queue: Node[] = [];
        queue.push({ game: game.clone(), moves: [] });
        
        let iterations = 0;
        const maxIterations = 100000;  // 防止无限循环
        
        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const node = queue.shift()!;
            const currentGame = node.game;
            
            // 检查是否已解决
            if (currentGame.isSolved()) {
                console.log(`找到解法！${node.moves.length}步，用时${iterations}次迭代`);
                return node.moves;
            }
            
            // 获取状态键
            const stateKey = currentGame.getStateKey();
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            
            // 生成所有可能的移动
            const possibleMoves = currentGame.getPossibleMoves();
            
            for (const move of possibleMoves) {
                const newGame = currentGame.clone();
                if (newGame.tryMovePiece(move.piece, move.direction)) {
                    const newMoves = [...node.moves, `${move.piece.name},${Direction[move.direction]}`];
                    queue.push({ game: newGame, moves: newMoves });
                }
            }
        }
        
        console.log(`未找到解法，已搜索${iterations}个状态`);
        return [];
    }
    
    /**
     * 带统计信息的求解
     */
    solveWithStats(game: KlotskiGame): { solution: string[], stats: { nodes: number, time: number } } {
        const startTime = performance.now();
        const startState = game.getStateKey();
        const visited = new Set<string>();
        
        interface Node {
            game: KlotskiGame;
            moves: string[];
        }
        
        const queue: Node[] = [];
        queue.push({ game: game.clone(), moves: [] });
        
        let iterations = 0;
        const maxIterations = 100000;
        
        while (queue.length > 0 && iterations < maxIterations) {
            iterations++;
            const node = queue.shift()!;
            const currentGame = node.game;
            
            if (currentGame.isSolved()) {
                const time = performance.now() - startTime;
                return {
                    solution: node.moves,
                    stats: { nodes: iterations, time }
                };
            }
            
            const stateKey = currentGame.getStateKey();
            if (visited.has(stateKey)) continue;
            visited.add(stateKey);
            
            const possibleMoves = currentGame.getPossibleMoves();
            
            for (const move of possibleMoves) {
                const newGame = currentGame.clone();
                if (newGame.tryMovePiece(move.piece, move.direction)) {
                    const newMoves = [...node.moves, `${move.piece.name},${Direction[move.direction]}`];
                    queue.push({ game: newGame, moves: newMoves });
                }
            }
        }
        
        const time = performance.now() - startTime;
        return {
            solution: [],
            stats: { nodes: iterations, time }
        };
    }
}