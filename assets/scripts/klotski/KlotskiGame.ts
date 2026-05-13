/**
 * 华容道 - 游戏引擎
 */

import { Piece, PieceType, Direction, Dir } from './Piece';
import { getLevel, Names } from './ClassicalLevels';

/**
 * 游戏状态
 */
export enum GameState {
    NotStarted = 0,
    InProgress = 1,
    Solved = 2,
    Failed = 3
}

/**
 * 华容道游戏核心引擎
 */
export class KlotskiGame {
    public static readonly ROWS = 5;
    public static readonly COLS = 4;
    
    // 出口位置（曹操到达此位置即通关）
    public static readonly EXIT = { row: 3, col: 1 };
    
    public pieces: Piece[] = [];
    public caoCao: Piece | null = null;
    public state: GameState = GameState.NotStarted;
    public currentLevel: number = 0;
    
    /** 游戏名称 */
    get name(): string {
        return "华容道";
    }
    
    /** 当前关卡名称 */
    get levelName(): string {
        return Names[this.currentLevel - 1] || "";
    }
    
    /**
     * 从布局数组初始化游戏
     * @param grid 5×4 的二维数组
     */
    loadFromGrid(grid: number[][]): void {
        this.pieces = [];
        this.caoCao = null;
        
        const visited: boolean[][] = Array(5).fill(null).map(() => Array(4).fill(false));
        
        for (let r = 0; r < KlotskiGame.ROWS; r++) {
            for (let c = 0; c < KlotskiGame.COLS; c++) {
                if (visited[r][c]) continue;
                const val = grid[r][c];
                if (val === 0) continue;
                
                // 用连通分量找出属于同一棋子的所有格子
                const cells: { r: number, c: number }[] = [];
                const queue: { r: number, c: number }[] = [];
                queue.push({ r, c });
                visited[r][c] = true;
                
                while (queue.length > 0) {
                    const cell = queue.shift()!;
                    cells.push(cell);
                    
                    // 检查上下左右相邻的同ID格子
                    const neighbors = [
                        { r: cell.r - 1, c: cell.c },
                        { r: cell.r + 1, c: cell.c },
                        { r: cell.r, c: cell.c - 1 },
                        { r: cell.r, c: cell.c + 1 }
                    ];
                    for (const n of neighbors) {
                        if (n.r >= 0 && n.r < KlotskiGame.ROWS && 
                            n.c >= 0 && n.c < KlotskiGame.COLS &&
                            !visited[n.r][n.c] && grid[n.r][n.c] === val) {
                            visited[n.r][n.c] = true;
                            queue.push(n);
                        }
                    }
                }
                
                // 计算棋子的位置和尺寸
                const minRow = Math.min(...cells.map(c => c.r));
                const minCol = Math.min(...cells.map(c => c.c));
                const maxRow = Math.max(...cells.map(c => c.r));
                const maxCol = Math.max(...cells.map(c => c.c));
                const height = maxRow - minRow + 1;
                const width = maxCol - minCol + 1;
                
                // 根据尺寸确定类型
                let pieceType: PieceType;
                if (height === 2 && width === 2) pieceType = PieceType.CaoCao;
                else if (height === 1 && width === 2) pieceType = PieceType.Horizontal;
                else if (height === 2 && width === 1) pieceType = PieceType.Vertical;
                else pieceType = PieceType.Pawn;
                
                // 获取棋子名称
                const name = this.getPieceName(val);
                
                const piece = new Piece(name, pieceType, minRow, minCol);
                this.pieces.push(piece);
                
                if (pieceType === PieceType.CaoCao) {
                    this.caoCao = piece;
                }
            }
        }
    }
    
    /**
     * 获取棋子名称
     */
    private getPieceName(id: number): string {
        const names: { [id: number]: string } = {
            1: "曹操",
            2: "关羽", 11: "横将2", 12: "横将3", 13: "横将4", 14: "横将5",
            3: "张飞", 4: "赵云", 5: "马超", 6: "黄忠",
            7: "甲", 8: "乙", 9: "丙", 10: "丁"
        };
        return names[id] || `棋${id}`;
    }
    
    /**
     * 初始化游戏
     */
    initialize(): void {
        this.loadLevel(1);
    }
    
    /**
     * 加载指定关卡
     */
    loadLevel(level: number): void {
        const grid = getLevel(level);
        this.loadFromGrid(grid);
        this.currentLevel = level;
        this.state = GameState.InProgress;
    }
    
    /**
     * 尝试移动棋子
     * @param move 字符串 "棋子名,方向" 或 {piece, direction}
     */
    tryMove(move: any): boolean {
        if (typeof move === 'string') {
            const parts = move.split(',');
            if (parts.length === 2) {
                const piece = this.pieces.find(p => p.name === parts[0]);
                if (piece) {
                    const dir = parseInt(parts[1]) as Direction;
                    return this.tryMovePiece(piece, dir);
                }
            }
        } else if (move && typeof move === 'object') {
            return this.tryMovePiece(move.piece, move.direction);
        }
        return false;
    }
    
    /**
     * 尝试移动指定棋子
     */
    tryMovePiece(piece: Piece, dir: Direction): boolean {
        const [dr, dc] = Dir.offset(dir);
        const newRow = piece.row + dr;
        const newCol = piece.col + dc;
        
        // 边界检查
        if (newRow < 0 || newCol < 0 || 
            newRow + piece.height > KlotskiGame.ROWS || 
            newCol + piece.width > KlotskiGame.COLS) {
            return false;
        }
        
        // 检测碰撞：构建当前棋盘，然后检查目标位置是否有其他棋子
        const board = this.buildBoard();
        
        // 清除当前棋子占据的位置
        for (const cell of piece.getOccupiedCells()) {
            board[cell.row][cell.col] = 0;
        }
        
        // 检查目标位置是否为空
        for (let r = newRow; r < newRow + piece.height; r++) {
            for (let c = newCol; c < newCol + piece.width; c++) {
                if (board[r][c] !== 0) return false;
            }
        }
        
        // 可以移动
        piece.moveTo(newRow, newCol);
        
        // 更新状态
        if (this.isSolved()) {
            this.state = GameState.Solved;
        }
        
        return true;
    }
    
    /**
     * 构建棋盘状态
     * 返回 5×4 数组，0=空，非0=棋子索引+1
     */
    buildBoard(): number[][] {
        const board = Array(KlotskiGame.ROWS).fill(null)
            .map(() => Array(KlotskiGame.COLS).fill(0));
        
        for (let i = 0; i < this.pieces.length; i++) {
            for (const cell of this.pieces[i].getOccupiedCells()) {
                board[cell.row][cell.col] = i + 1;
            }
        }
        return board;
    }
    
    /**
     * 检查是否通关（曹操到达出口）
     */
    isSolved(): boolean {
        if (!this.caoCao) return false;
        return this.caoCao.row === KlotskiGame.EXIT.row && 
               this.caoCao.col === KlotskiGame.EXIT.col;
    }
    
    /**
     * 获取当前局面的状态字符串（用于BFS去重）
     * 使用类型编码：同��型棋子等价
     */
    getStateKey(): string {
        const board: string[][] = Array(KlotskiGame.ROWS).fill(null)
            .map(() => Array(KlotskiGame.COLS).fill('.'));
        
        for (const piece of this.pieces) {
            const ch = piece.type === PieceType.CaoCao ? 'C' :
                      piece.type === PieceType.Horizontal ? 'H' :
                      piece.type === PieceType.Vertical ? 'V' :
                      piece.type === PieceType.Pawn ? 'P' : '?';
            
            for (const cell of piece.getOccupiedCells()) {
                board[cell.row][cell.col] = ch;
            }
        }
        
        // 展平为字符串
        let key = '';
        for (let r = 0; r < KlotskiGame.ROWS; r++) {
            for (let c = 0; c < KlotskiGame.COLS; c++) {
                key += board[r][c];
            }
        }
        return key;
    }
    
    /**
     * 获取所有可能的移动
     */
    getPossibleMoves(): { piece: Piece, direction: Direction }[] {
        const moves: { piece: Piece, direction: Direction }[] = [];
        
        for (const piece of this.pieces) {
            for (const dir of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
                if (this.canMove(piece, dir)) {
                    moves.push({ piece, direction: dir });
                }
            }
        }
        return moves;
    }
    
    /**
     * 检查棋子能否朝指定方向移动
     */
    canMove(piece: Piece, dir: Direction): boolean {
        const [dr, dc] = Dir.offset(dir);
        const newRow = piece.row + dr;
        const newCol = piece.col + dc;
        
        // 边界检查
        if (newRow < 0 || newCol < 0 || 
            newRow + piece.height > KlotskiGame.ROWS || 
            newCol + piece.width > KlotskiGame.COLS) {
            return false;
        }
        
        // 检测碰撞
        const board = this.buildBoard();
        
        // 清除当前棋子占据的位置
        for (const cell of piece.getOccupiedCells()) {
            board[cell.row][cell.col] = 0;
        }
        
        // 检查目标位置
        for (let r = newRow; r < newRow + piece.height; r++) {
            for (let c = newCol; c < newCol + piece.width; c++) {
                if (board[r][c] !== 0) return false;
            }
        }
        
        return true;
    }
    
    /**
     * 打印棋盘到控制台
     */
    printBoard(): void {
        const board: string[][] = Array(KlotskiGame.ROWS).fill(null)
            .map(() => Array(KlotskiGame.COLS).fill('·'));
        
        const symbols: { [type: number]: string } = {
            [PieceType.CaoCao]: "操",
            [PieceType.Horizontal]: "关",
            [PieceType.Vertical]: "",  // 动态取第一个字
            [PieceType.Pawn]: ""
        };
        
        for (const piece of this.pieces) {
            let sym = symbols[piece.type] || "?";
            if (!sym || sym === "") {
                sym = piece.name.substring(0, 1);
            }
            for (const cell of piece.getOccupiedCells()) {
                board[cell.row][cell.col] = sym;
            }
        }
        
        console.log("┌───┬───┬───┬───┐");
        for (let r = 0; r < KlotskiGame.ROWS; r++) {
            let line = "│";
            for (let c = 0; c < KlotskiGame.COLS; c++) {
                line += ` ${board[r][c]} │`;
            }
            console.log(line);
            if (r < KlotskiGame.ROWS - 1) {
                console.log("├───┼───┼───┼───┤");
            }
        }
        console.log("└───┴───┴───┴───┘");
        console.log(`  ↑ 出口位置：行${KlotskiGame.EXIT.row + 1} 列${KlotskiGame.EXIT.col + 1}-${KlotskiGame.EXIT.col + 2}`);
        console.log(this.isSolved() ? "  ✅ 已通关！" : "  ⬜ 继续努力");
    }
    
    /**
     * 深拷贝
     */
    clone(): KlotskiGame {
        const game = new KlotskiGame();
        game.pieces = this.pieces.map(p => 
            new Piece(p.name, p.type, p.row, p.col));
        game.caoCao = game.pieces.find(p => p.type === PieceType.CaoCao) || null;
        game.state = this.state;
        game.currentLevel = this.currentLevel;
        return game;
    }
}