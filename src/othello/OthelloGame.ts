/**
 * 黑白棋游戏场景 - LayaAir 3.x 版本
 * 纯代码绘制（Graphics），不依赖外部图片
 * 正确装饰器：@regClass() + extends Laya.Script
 */
import { BoardData, GRID_SIZE, EMPTY, BLACK, WHITE, initBoard, getValidMoves, makeMove, getCounts, isGameOver, Cell } from './Board';
import { getAIMove } from './AI';

const { regClass } = Laya;

const CELL_SIZE = 38;
const BOARD_W = GRID_SIZE * CELL_SIZE;
const HEADER_H = 70;
const FOOTER_H = 80;
const MARGIN_X = 20;

type Difficulty = 'easy' | 'medium' | 'hard';

@regClass()
export class OthelloGame extends Laya.Script {

    private board: BoardData = [];
    private currentPlayer: number = BLACK;
    private validMoves: Cell[] = [];
    private gameOver: boolean = false;
    private difficulty: Difficulty = 'medium';
    private aiThinking: boolean = false;

    private graphics: Laya.Graphics | null = null;
    private boardOriginX: number = 0;
    private boardOriginY: number = HEADER_H;
    private stageWidth: number = 0;
    private stageHeight: number = 0;

    // 按钮位置
    private diffBtns: { x: number; y: number; w: number; h: number; id: Difficulty }[] = [];
    private restartBtn: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };

    onStart() {
        console.log('[OthelloGame] onStart - stage size:', Laya.stage.width, 'x', Laya.stage.height);
        this.initGame();
        this.buildUI();
        this.render();
    }

    onDisable() {
        const node = this.owner as Laya.Node;
        if (node) {
            node.off(Laya.Event.MOUSE_DOWN, this, this.onMouseDown);
        }
    }

    // ========== 初始化 ==========

    private initGame(): void {
        this.board = initBoard();
        this.currentPlayer = BLACK;
        this.validMoves = getValidMoves(this.board, BLACK);
        this.gameOver = false;
        this.aiThinking = false;
    }

    // ========== UI 构建 ==========

    private buildUI(): void {
        const node = this.owner as Laya.Sprite;
        this.graphics = node.graphics;

        this.stageWidth = Laya.stage.width;
        this.stageHeight = Laya.stage.height;
        
        console.log('[OthelloGame] buildUI - stage size:', this.stageWidth, 'x', this.stageHeight);

        const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
        const btnW = 70, btnH = 32, gap = 12;
        const totalW = diffs.length * btnW + gap * (diffs.length - 1);
        let startX = (this.stageWidth - totalW) / 2;
        const btnY = 38;

        this.diffBtns = [];

        for (let i = 0; i < diffs.length; i++) {
            const d = diffs[i];
            this.diffBtns.push({ x: startX, y: btnY, w: btnW, h: btnH, id: d });
            startX += btnW + gap;
        }

        const rw = 140, rh = 40;
        const rx = (this.stageWidth - rw) / 2;
        const ry = this.stageHeight - FOOTER_H + 20;
        this.restartBtn = { x: rx, y: ry, w: rw, h: rh };

        node.on(Laya.Event.MOUSE_DOWN, this, this.onMouseDown);
    }

    // ========== 渲染 ==========

    private render(): void {
        if (!this.graphics) {
            console.warn('[OthelloGame] render - graphics not ready');
            return;
        }
        const g = this.graphics;
        g.clear();

        this.stageWidth = Laya.stage.width;
        this.stageHeight = Laya.stage.height;

        this.boardOriginX = MARGIN_X;
        this.boardOriginY = HEADER_H;

        console.log('[OthelloGame] render - board origin:', this.boardOriginX, this.boardOriginY, '| stage:', this.stageWidth, 'x', this.stageHeight);

        g.drawRect(0, 0, this.stageWidth, this.stageHeight, '#1a1a2e');

        g.fillText('⚫ 黑白棋', this.stageWidth / 2, 18, 'bold 22px Arial', '#f093fb', 'center');

        const counts = getCounts(this.board);
        const statusText = `⚫ ${counts.black} : ${counts.white} ⚪`;
        g.fillText(statusText, this.stageWidth / 2, 42, '14px Arial', '#aaaaaa', 'center');

        this.updateDiffBtns(g);

        this.renderBoard(g);

        if (this.gameOver) {
            let msg: string, color: string;
            if (counts.black > counts.white) {
                msg = `🎉 你赢了！`;
                color = '#4ecdc4';
            } else if (counts.white > counts.black) {
                msg = `😢 AI赢了`;
                color = '#f5576c';
            } else {
                msg = `🤝 平局！`;
                color = '#fdcb6e';
            }
            g.fillText(msg, this.stageWidth / 2, this.boardOriginY + BOARD_W + 16, 'bold 16px Arial', color, 'center');
        }

        g.drawRoundRect(this.restartBtn.x, this.restartBtn.y, this.restartBtn.w, this.restartBtn.h, 20, 20, 20, 20, '#4ecdc4');
        g.fillText('🔄 重新开始', this.stageWidth / 2, this.restartBtn.y + 23, 'bold 16px Arial', '#ffffff', 'center');
    }

    private getStatusText(): string {
        if (this.gameOver) return '';
        if (this.aiThinking) return '🤔 白棋思考中...';
        if (this.currentPlayer === BLACK) return '⚫ 你的回合';
        return '⚪ 白棋回合';
    }

    private updateDiffBtns(g: Laya.Graphics): void {
        const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
        const labels: Record<Difficulty, string> = { easy: '简单', medium: '中等', hard: '困难' };

        for (let i = 0; i < this.diffBtns.length; i++) {
            const btn = this.diffBtns[i];
            const isActive = btn.id === this.difficulty;
            g.drawRoundRect(btn.x, btn.y, btn.w, btn.h, 16, 16, 16, 16,
                isActive ? '#4ecdc4' : '#333333');
            g.fillText(labels[diffs[i]], btn.x + btn.w / 2, btn.y + 19, '13px Arial', '#ffffff', 'center');
        }
    }

    private renderBoard(g: Laya.Graphics): void {
        const ox = this.boardOriginX;
        const oy = this.boardOriginY;

        console.log('[OthelloGame] renderBoard - drawing at origin:', ox, oy, '| CELL_SIZE:', CELL_SIZE, '| BOARD_W:', BOARD_W);

        g.drawRoundRect(ox - 6, oy - 6, BOARD_W + 12, BOARD_W + 12, 10, 10, 10, 10, '#00b894');

        let hintCount = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const x = ox + c * CELL_SIZE;
                const y = oy + r * CELL_SIZE;

                g.drawRect(x, y, CELL_SIZE, CELL_SIZE,
                    (r + c) % 2 === 0 ? '#00b894' : '#00a884');

                if (!this.gameOver && !this.aiThinking && this.currentPlayer === BLACK) {
                    if (this.validMoves.some(m => m.r === r && m.c === c)) {
                        g.drawCircle(x + CELL_SIZE / 2, y + CELL_SIZE / 2, CELL_SIZE * 0.3, 'rgba(255,255,255,0.4)');
                        hintCount++;
                    }
                }

                if (this.board[r][c] !== EMPTY) {
                    this.drawPiece(g, x + CELL_SIZE / 2, y + CELL_SIZE / 2, this.board[r][c]);
                }
            }
        }

        if (hintCount > 0) {
            console.log('[OthelloGame] renderBoard - drew', hintCount, 'valid move hints');
        }

        for (let i = 0; i <= GRID_SIZE; i++) {
            g.drawLine(ox + i * CELL_SIZE, oy, ox + i * CELL_SIZE, oy + BOARD_W, '#00000044', 1);
            g.drawLine(ox, oy + i * CELL_SIZE, ox + BOARD_W, oy + i * CELL_SIZE, '#00000044', 1);
        }
    }

    private drawPiece(g: Laya.Graphics, cx: number, cy: number, player: number): void {
        const radius = CELL_SIZE * 0.42;

        if (player === BLACK) {
            g.drawCircle(cx, cy, radius, '#1a1a2e', '#333333', 2);
            g.drawCircle(cx - radius * 0.3, cy - radius * 0.3, radius * 0.25, 'rgba(255,255,255,0.3)');
        } else {
            g.drawCircle(cx, cy, radius, '#f0f0f0', '#cccccc', 2);
            g.drawCircle(cx - radius * 0.3, cy - radius * 0.3, radius * 0.2, 'rgba(255,255,255,0.5)');
        }
    }

    // ========== 交互 ==========

    public onMouseDown(e: Laya.Event): void {
        if (this.gameOver || this.aiThinking || this.currentPlayer !== BLACK) {
            console.log('[OthelloGame] onMouseDown - ignored:', { gameOver: this.gameOver, aiThinking: this.aiThinking, currentPlayer: this.currentPlayer });
            return;
        }

        const stageX = Laya.stage.mouseX;
        const stageY = Laya.stage.mouseY;
        
        const node = this.owner as Laya.Sprite;
        const point = node.globalToLocal(new Laya.Point(stageX, stageY));
        const x = point.x;
        const y = point.y;

        console.log('[OthelloGame] onMouseDown - stage:', stageX, stageY, '-> local:', x, y);
        console.log('[OthelloGame] onMouseDown - boardOrigin:', this.boardOriginX, this.boardOriginY, '| validMoves:', this.validMoves.length);

        if (this.handleDifficultyClick(x, y)) return;
        if (this.handleRestartClick(x, y)) return;
        this.handleBoardClick(x, y);
    }

    private handleDifficultyClick(x: number, y: number): boolean {
        for (const btn of this.diffBtns) {
            if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                console.log('[OthelloGame] handleDifficultyClick - clicked:', btn.id);
                this.difficulty = btn.id;
                this.initGame();
                this.render();
                return true;
            }
        }
        return false;
    }

    private handleRestartClick(x: number, y: number): boolean {
        const btn = this.restartBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
            console.log('[OthelloGame] handleRestartClick - restarting game');
            this.initGame();
            this.render();
            return true;
        }
        return false;
    }

    private handleBoardClick(x: number, y: number): void {
        const ox = this.boardOriginX;
        const oy = this.boardOriginY;

        console.log('[OthelloGame] handleBoardClick - click:', x, y, '| board bounds:', { ox, oy, ox_end: ox + BOARD_W, oy_end: oy + BOARD_W });

        if (x < ox || x > ox + BOARD_W || y < oy || y > oy + BOARD_W) {
            console.log('[OthelloGame] handleBoardClick - outside board bounds, ignored');
            return;
        }

        const c = Math.floor((x - ox) / CELL_SIZE);
        const r = Math.floor((y - oy) / CELL_SIZE);

        console.log('[OthelloGame] handleBoardClick - cell:', r, c, '| validMoves:', JSON.stringify(this.validMoves));

        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
            console.log('[OthelloGame] handleBoardClick - invalid cell, ignored');
            return;
        }

        const validMove = this.validMoves.find(m => m.r === r && m.c === c);
        if (!validMove) {
            console.log('[OthelloGame] handleBoardClick - not a valid move, ignored');
            return;
        }

        console.log('[OthelloGame] handleBoardClick - making move at:', r, c);
        makeMove(this.board, r, c, BLACK);
        this.currentPlayer = WHITE;
        this.validMoves = getValidMoves(this.board, WHITE);
        this.render();

        if (isGameOver(this.board)) {
            this.endGame();
            return;
        }
        this.doAITurn();
    }

    // ========== AI ==========

    private doAITurn(): void {
        this.aiThinking = true;
        this.render();

        const delay = this.difficulty === 'easy' ? 400 : (this.difficulty === 'medium' ? 600 : 800);
        console.log('[OthelloGame] doAITurn - AI thinking... (difficulty:', this.difficulty, ', delay:', delay, 'ms)');

        Laya.timer.once(delay, this, () => {
            const move = getAIMove(this.board, this.difficulty);
            this.aiThinking = false;

            if (move) {
                console.log('[OthelloGame] doAITurn - AI move:', move.r, move.c);
                makeMove(this.board, move.r, move.c, WHITE);
            } else {
                console.log('[OthelloGame] doAITurn - AI has no valid moves');
            }

            this.currentPlayer = BLACK;
            this.validMoves = getValidMoves(this.board, BLACK);

            if (this.validMoves.length === 0 && !isGameOver(this.board)) {
                console.log('[OthelloGame] doAITurn - Player has no moves, AI continues');
                this.currentPlayer = WHITE;
                this.validMoves = getValidMoves(this.board, WHITE);
                if (this.validMoves.length > 0) {
                    this.doAITurn();
                    return;
                }
            }

            if (isGameOver(this.board)) {
                this.endGame();
            } else {
                this.render();
            }
        });
    }

    private endGame(): void {
        this.gameOver = true;
        this.render();
    }
}