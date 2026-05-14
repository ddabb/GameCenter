/**
 * GeZiPuzzle - LayaAir 小游戏入口
 * 首页 + 黑白棋游戏
 */
import { OthelloGame } from './othello/OthelloGame';

const { regClass } = Laya;

@regClass()
export class Main extends Laya.Script {

    private graphics: Laya.Graphics | null = null;
    private startBtn: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 0, h: 0 };
    private gameStarted: boolean = false;
    private othelloGame: OthelloGame | null = null;

    onStart() {
        console.log('[Main] 启动 GeZiPuzzle');
        console.log('[Main] onStart - stage size:', Laya.stage.width, 'x', Laya.stage.height);
        
        if (Laya.stage.width === 0 || Laya.stage.height === 0) {
            console.log('[Main] onStart - stage not ready, waiting...');
            Laya.timer.once(200, this, this.onStart);
            return;
        }
        
        this.setupScreen();
        this.showHomePage();
    }

    private setupScreen(): void {
        // 设置设计分辨率（手机竖屏标准）
        Laya.stage.designWidth = 375;
        Laya.stage.designHeight = 667;
        Laya.stage.scaleMode = "exactfit";
        Laya.stage.screenMode = "vertical";
        Laya.stage.alignH = "center";
        Laya.stage.alignV = "middle";
        console.log('[Main] 屏幕设置为手机竖屏适配模式');
    }

    private homePageReady: boolean = false;

    private showHomePage(): void {
        if (this.homePageReady) {
            console.log('[Main] showHomePage - already ready, skipping');
            return;
        }

        const node = this.owner as Laya.Sprite;
        this.graphics = node.graphics;

        const sw = Laya.stage.width;
        const sh = Laya.stage.height;
        console.log('[Main] showHomePage - stage size:', sw, 'x', sh);

        if (sw === 0 || sh === 0) {
            console.log('[Main] stage size is 0, waiting...');
            Laya.timer.once(100, this, this.showHomePage);
            return;
        }

        this.homePageReady = true;
        this.drawHomeBackground(sw, sh);
        this.createHomeUI(sw, sh);
        this.setupHomeEvents(node);
    }

    private drawHomeBackground(sw: number, sh: number): void {
        if (!this.graphics) return;
        const g = this.graphics;
        g.clear();
        // 深蓝渐变背景（用3层不同颜色矩形模拟）
        g.drawRect(0, 0, sw, sh * 0.33, '#1a1a2e');
        g.drawRect(0, sh * 0.33, sw, sh * 0.34, '#16213e');
        g.drawRect(0, sh * 0.67, sw, sh * 0.33, '#0f3460');
    }

    private createHomeUI(sw: number, sh: number): void {
        if (!this.graphics) return;
        const g = this.graphics;

        // 标题
        g.fillText('⚫ 黑白棋', sw / 2, sh * 0.28, 'bold 52px Arial', '#ffffff', 'center');

        // 副标题
        g.fillText('Othello Game', sw / 2, sh * 0.28 + 60, '18px Arial', '#a0a0a0', 'center');

        // 按钮（增大按钮尺寸，放到更靠下的位置）
        const btnW = 220;
        const btnH = 70;
        this.startBtn = {
            x: (sw - btnW) / 2,
            y: sh * 0.6,
            w: btnW,
            h: btnH
        };

        g.drawRoundRect(this.startBtn.x, this.startBtn.y, btnW, btnH, 35, 35, 35, 35, '#4ecdc4');

        // 按钮文字（居中对齐）
        g.fillText('🎮 开始游戏', sw / 2, this.startBtn.y + btnH / 2 + 8, 'bold 26px Arial', '#ffffff', 'center');
    }

    private setupHomeEvents(node: Laya.Node): void {
        node.on(Laya.Event.MOUSE_DOWN, this, this.onHomeClick);
    }

    private removeHomeEvents(node: Laya.Node): void {
        node.off(Laya.Event.MOUSE_DOWN, this, this.onHomeClick);
    }

    private onHomeClick(e: Laya.Event): void {
        if (this.gameStarted) {
            console.log('[Main] onHomeClick - game already started, ignoring');
            return;
        }

        // 将实际屏幕坐标转换为设计坐标
        const scaleX = Laya.Browser.clientWidth / Laya.stage.designWidth;
        const scaleY = Laya.Browser.clientHeight / Laya.stage.designHeight;
        const x = Laya.stage.mouseX / scaleX;
        const y = Laya.stage.mouseY / scaleY;

        console.log('[Main] onHomeClick - mouse(screen):', Laya.stage.mouseX, Laya.stage.mouseY);
        console.log('[Main] onHomeClick - scale factor:', scaleX, scaleY);
        console.log('[Main] onHomeClick - mouse(design):', x, y);
        console.log('[Main] onHomeClick - button area:', this.startBtn.x, this.startBtn.y, this.startBtn.w, this.startBtn.h);

        const inX = x >= this.startBtn.x && x <= this.startBtn.x + this.startBtn.w;
        const inY = y >= this.startBtn.y && y <= this.startBtn.y + this.startBtn.h;
        console.log('[Main] onHomeClick - inX:', inX, 'inY:', inY);

        if (inX && inY) {
            console.log('[Main] onHomeClick - starting game');
            this.startGame();
        }
    }

    private startGame(): void {
        console.log('[Main] 开始游戏');
        this.gameStarted = true;

        const node = this.owner as Laya.Sprite;
        this.removeHomeEvents(node);

        if (this.graphics) {
            this.graphics.clear();
        }

        this.othelloGame = node.addComponent(OthelloGame);
    }

    onDisable() {
        if (this.othelloGame) {
            this.othelloGame = null;
        }
    }
}
