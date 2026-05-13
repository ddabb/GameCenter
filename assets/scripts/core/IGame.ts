/**
 * MiniGames Core Framework
 * 游戏核心接口定义
 */

export namespace MiniGames {
    /**
     * 游戏状态枚举
     */
    export enum GameState {
        NotStarted = 0,
        InProgress = 1,
        Solved = 2,
        Failed = 3
    }

    /**
     * 移动方向
     */
    export enum Direction {
        Up = 0,
        Down = 1,
        Left = 2,
        Right = 3
    }

    /**
     * 游戏统计数据
     */
    export interface GameStatistics {
        moves: number;
        duration: number;  // 毫秒
        score: number;
        customData: { [key: string]: any };
    }

    /**
     * 所有游戏的通用接口
     */
    export interface IGame {
        /** 游戏名称 */
        readonly name: string;
        
        /** 当前游戏状态 */
        state: GameState;
        
        /** 当前关卡/难度 */
        currentLevel: number;
        
        /** 初始化游戏 */
        initialize(): void;
        
        /** 加载指定关卡 */
        loadLevel(level: number): void;
        
        /** 尝试执行一步移动 */
        tryMove(move: any): boolean;
        
        /** 检查是否已通关 */
        isSolved(): boolean;
        
        /** 获取当前局面的状态字符串（用于去重/BFS） */
        getStateKey(): string;
        
        /** 获取游戏统计数据 */
        getStatistics(): GameStatistics;
    }

    /**
     * 棋子接口
     */
    export interface IPiece {
        /** 棋子名称 */
        name: string;
        
        /** 棋子类型 */
        type: string;
        
        /** 当前行 */
        row: number;
        
        /** 当前列 */
        col: number;
        
        /** 高度（占行数） */
        height: number;
        
        /** 宽度（占列数） */
        width: number;
        
        /** 获取占据的格子坐标 */
        getOccupiedCells(): { row: number, col: number }[];
        
        /** 能否移动到指定方向 */
        canMove(dir: Direction, row: number, col: number): boolean;
        
        /** 移动到指定位置 */
        moveTo(row: number, col: number): void;
    }

    /**
     * 棋盘接口
     */
    export interface IBoard<TPiece extends IPiece> {
        /** 行数 */
        rows: number;
        
        /** 列数 */
        cols: number;
        
        /** 棋盘数据 */
        grid: number[][];
        
        /** 获取棋子列表 */
        pieces: TPiece[];
        
        /** 获取指定位置的棋子 */
        getPiece(row: number, col: number): TPiece | null;
        
        /** 尝试放置棋子 */
        tryPlacePiece(piece: TPiece, row: number, col: number): boolean;
        
        /** 尝试移动棋子 */
        tryMovePiece(piece: TPiece, dir: Direction): boolean;
    }
}