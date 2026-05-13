/**
 * 华容道 - 棋子定义
 */

export enum Direction {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3
}

/**
 * 棋子类型
 */
export enum PieceType {
    Empty = 0,
    CaoCao = 1,      // 曹操 2×2
    Horizontal = 2,  // 横将 2×1
    Vertical = 3,    // 竖将 1×2
    Pawn = 4         // 小兵 1×1
}

/**
 * 方向工具函数
 */
export const Dir = {
    offset(dir: Direction): [number, number] {
        switch (dir) {
            case Direction.Up: return [-1, 0];
            case Direction.Down: return [1, 0];
            case Direction.Left: return [0, -1];
            case Direction.Right: return [0, 1];
            default: return [0, 0];
        }
    },
    
    opposite(dir: Direction): Direction {
        switch (dir) {
            case Direction.Up: return Direction.Down;
            case Direction.Down: return Direction.Up;
            case Direction.Left: return Direction.Right;
            case Direction.Right: return Direction.Left;
            default: return dir;
        }
    }
};

/**
 * 棋子
 */
export class Piece {
    public readonly name: string;
    public readonly type: PieceType;
    public row: number;
    public col: number;
    public readonly height: number;
    public readonly width: number;

    constructor(name: string, type: PieceType, row: number, col: number) {
        this.name = name;
        this.type = type;
        this.row = row;
        this.col = col;
        
        // 根据类型确定尺寸
        switch (type) {
            case PieceType.CaoCao:
                this.height = 2;
                this.width = 2;
                break;
            case PieceType.Horizontal:
                this.height = 1;
                this.width = 2;
                break;
            case PieceType.Vertical:
                this.height = 2;
                this.width = 1;
                break;
            case PieceType.Pawn:
            default:
                this.height = 1;
                this.width = 1;
                break;
        }
    }

    /**
     * 获取棋子占用的所有格子坐标
     */
    getOccupiedCells(): { row: number, col: number }[] {
        const cells: { row: number, col: number }[] = [];
        for (let r = this.row; r < this.row + this.height; r++) {
            for (let c = this.col; c < this.col + this.width; c++) {
                cells.push({ row: r, col: c });
            }
        }
        return cells;
    }

    /**
     * 能否朝指定方向移动（边界检查）
     */
    canMove(dir: Direction, boardRows: number, boardCols: number): boolean {
        const [dr, dc] = Dir.offset(dir);
        const newRow = this.row + dr;
        const newCol = this.col + dc;
        
        if (newRow < 0 || newCol < 0 || 
            newRow + this.height > boardRows || newCol + this.width > boardCols) {
            return false;
        }
        return true;
    }

    /**
     * 移动到新位置
     */
    moveTo(row: number, col: number): void {
        this.row = row;
        this.col = col;
    }

    toString(): string {
        return `${this.name}[${this.row},${this.col} ${this.height}×${this.width}]`;
    }
}