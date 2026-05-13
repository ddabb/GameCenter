/**
 * 华容道 - 模块导出
 */

export { Piece, PieceType, Direction, Dir } from './Piece';
export { KlotskiGame, GameState } from './KlotskiGame';
export { BFSFinder } from './BFSFinder';
export { Names, getLevel, getPieceName, PieceNames, Levels } from './ClassicalLevels';

// 便利函数
import { KlotskiGame as Game, BFSFinder as Finder, getLevel, Names } from './KlotskiGame';

/**
 * 快速测试：运行指定关卡
 */
export function test(level: number = 1): void {
    const game = new Game();
    game.loadLevel(level);
    console.log(`关卡 ${level}: ${Names[level - 1]}`);
    game.printBoard();
    
    const finder = new Finder();
    const result = finder.solveWithStats(game);
    
    if (result.solution.length > 0) {
        console.log(`\n解法：${result.solution.length}步`);
        console.log(`统计：${result.stats.nodes}节点，${result.stats.time.toFixed(0)}ms`);
    } else {
        console.log("\n未找到解法");
    }
}

// 如果直接运行
// test(1);  // 测试第1关"横刀立马"