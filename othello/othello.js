/**
 * othello.js — 黑白棋（Othello/Reversi）
 *
 * 游戏规则：
 *   1. 8×8棋盘，黑棋(BLACK=1)白棋(WHITE=2)各2子开局（D4/W5/E4/F5）
 *   2. 落子必须夹住对方棋子（横竖斜任意方向≥1子），将其全部翻转
 *   3. 无可落子时跳过，双方都无法落子时游戏结束
 *   4. 结束时棋子多的一方获胜，平局则Draw
 *
 * AI说明：
 *   - 使用Minimax算法 + Alpha-Beta剪枝
 *   - 难度对应搜索深度：简单(2层)、中等(3层)、困难(4层)、专家(5层)
 *   - 评估函数：位置权重（角/边优先）+ 行动力（可选落子数差×2）
 *
 * 模块拆分（均为纯函数）：
 *   - othello-core.js   — 棋盘规则：canPlace/getValidMoves/evaluateBoard…
 *   - othello-ai.js     — AI 搜索：findBestMove + minimax
 *   - othello-renderer.js — 画面渲染：drawBoard/drawPieces/drawValidMoves…
 *
 * 关键状态：
 *   - this.board: 8×8棋盘，0=空、1=黑(BLACK)、2=白(WHITE)
 *   - this.currentPlayer: 当前玩家（BLACK先手）
 *   - this.validMoves: 当前玩家合法着法[{row,col}]
 *   - this.lastMove: 最后一步{row,col}，用于脉冲动画
 *   - this.aiThinking: AI是否正在思考（锁定界面点击）
 *   - this.gameOver/this.winner: 游戏结束标志与胜者
 *   - this.difficulty: 当前难度(easy/medium/hard/expert)
 *   - this.undoMgr: 撤销管理器实例
 *   - this.pieceImages: 棋子图片缓存{black, white}
 *
 * 数据来源：程序生成，无外部CDN
 * 通关条件：游戏结束（双方均无合法着法）
 *
 * 所属分包：othello（独立分包，与主 games 分包分离）
 */

// ---- 依赖（跨分包引用，games 分包必须先加载） ----
const statsManager = require('../games/stats-manager.js').getInstance();
const Confetti = require('../games/confetti');
const sound = require('../games/sound-manager');
const roundRect = require('../utils/round-rect.js');
const TutorialOverlay = require('../games/tutorial-overlay');
const UndoManager = require('../games/undo-manager');
const { AchievementManager } = require('../games/achievement-manager');
const { ShareCard } = require('../games/share-card');
const VictoryPanel = require('../games/components/victory-panel');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');
const appConfig = require('../utils/game-config');
const { getInstance: getRewardManager } = require('../games/reward-manager');

// ---- 同分包内的模块 ----
const core = require('./othello-core.js');
const ai = require('./othello-ai.js');
const renderer = require('./othello-renderer.js');

// ========== Othello 黑白棋主类 ==========

/**
 * Othello 黑白棋主类 — 负责游戏流程编排（事件/状态/AI调度/渲染调度）。
 *
 * 纯逻辑委托给 othello-core.js 和 othello-ai.js，
 * 渲染委托给 othello-renderer.js。
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} canvas
 * @param {Object} systemInfo
 * @param {Function} switchGame
 * @param {number} level
 */
class Othello {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    // ---- 画布基础信息 ----
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    // ---- 游戏基本信息 ----
    this.gameName = 'othello';
    // 从菜单直接进入时 level 为 'othello' 字符串，统一转为数字
    this.level = (typeof level === 'number') ? level : 1;
    statsManager.startGame(this.gameName, this.level);

    // ---- 难度配置 ----
    this.difficulty = 'medium';
    this.difficulties = [
      { name: 'easy',   label: '简单', depth: 2 },
      { name: 'medium', label: '中等', depth: 3 },
      { name: 'hard',   label: '困难', depth: 4 },
      { name: 'expert', label: '专家', depth: 5 }
    ];

    // ---- 棋盘布局 ----
    this.cellSize = Math.min(this.width * 0.9 / 8, 42);
    this.boardOffsetX = (this.width - this.cellSize * 8) / 2;
    // 难度栏中心 Y（稍下移）
    this._diffBarY = this.statusBarHeight + 82;
    // boardOffsetY 由 draw() 根据难度栏底部动态计算

    // ---- 棋子常量（来自 core 模块） ----
    this.BLACK = core.BLACK;
    this.WHITE = core.WHITE;

    // ---- 核心游戏状态 ----
    this.board = [];
    this.currentPlayer = this.BLACK;
    this.gameOver = false;
    this.winner = null;
    this.blackCount = 2;
    this.whiteCount = 2;
    this.animationTime = 0;
    this.lastMove = null;
    this.aiThinking = false;
    this.showValidHints = true;
    this.validMoves = [];
    this.skipMessage = null;
    this.skipMessageTimer = 0;

    // ---- 特效 & 工具组件 ----
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this.undoMgr = new UndoManager();

    // ---- 成就系统 ----
    this.achievement = AchievementManager.getInstance();
    this._newAchievements = [];

    // ---- 棋子图片 ----
    this.pieceImages = { black: null, white: null };
    this._loadPieceImages();

    // ---- 初始化或恢复存档 ----
    if (!this.loadState()) {
      this.initBoard();
    } else {
      this._syncCounts();
      this._syncValidMoves();
    }

    // ---- UI 组件 ----
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();

    // 招牌游戏作为首页：左上角不放「返回」，改为高亮的「全部游戏」入口
    // 招牌游戏作为首页：去掉左上角返回，改为右上角高亮的「全部游戏」入口
    const isFeatured = this.gameName === appConfig.FEATURED_GAME;
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight, isFeatured ? {
      extraTopOffset: 0,
      showBack: false,
      menuText: '☰ 全部游戏',
      menuAccent: true,
      hideBrand: true
    } : {
      extraTopOffset: 0
    });
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
  }

  // ========== 棋盘初始化 & 存档 ==========

  /** 初始化棋盘 → 8×8 空盘 + 标准开局四子（D4/W, E4/B, D5/B, E5/W） */
  initBoard() {
    this.board = [];
    for (let r = 0; r < 8; r++) {
      this.board[r] = [];
      for (let c = 0; c < 8; c++) this.board[r][c] = 0;
    }
    this.board[3][3] = this.WHITE;  // D4
    this.board[3][4] = this.BLACK;  // E4
    this.board[4][3] = this.BLACK;  // D5
    this.board[4][4] = this.WHITE;  // E5
    this._syncCounts();
    this._syncValidMoves();
  }

  /** 从 core 同步黑白棋子数量到 this */
  _syncCounts() {
    const c = core.countPieces(this.board);
    this.blackCount = c.black;
    this.whiteCount = c.white;
  }

  /** 从 core 同步玩家（黑棋）合法着法到 this.validMoves */
  _syncValidMoves() {
    this.validMoves = core.getValidMoves(this.board, this.BLACK);
  }

  /** 保存当前游戏状态到 Storage（自动存档） */
  saveState() {
    try {
      wx.setStorageSync('othello_saved', JSON.stringify({
        board: this.board,
        currentPlayer: this.currentPlayer,
        difficulty: this.difficulty,
        blackCount: this.blackCount,
        whiteCount: this.whiteCount,
        gameOver: this.gameOver,
        winner: this.winner,
        level: this.level,
        lastMove: this.lastMove
      }));
    } catch (e) { /* ignore */ }
  }

  /** 异步加载棋子图片（黑/白 PNG），失败时静默降级到 Canvas 绘图 */
  _loadPieceImages() {
    if (this.pieceImages.black && this.pieceImages.white) return;
    const blackImg = wx.createImage();
    blackImg.onload = () => { this.pieceImages.black = blackImg; };
    blackImg.onerror = () => { console.warn('[Othello] 加载黑棋图片失败'); };
    blackImg.src = 'assets/images/games/othello/piece-black.png';
    const whiteImg = wx.createImage();
    whiteImg.onload = () => { this.pieceImages.white = whiteImg; };
    whiteImg.onerror = () => { console.warn('[Othello] 加载白棋图片失败'); };
    whiteImg.src = 'assets/images/games/othello/piece-white.png';
  }

  /** 从 Storage 恢复存档 */
  loadState() {
    try {
      const raw = wx.getStorageSync('othello_saved');
      const saved = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (saved && saved.board && saved.board.length === 8) {
        this.board = saved.board;
        this.currentPlayer = saved.currentPlayer || this.BLACK;
        this.difficulty = saved.difficulty || 'medium';
        this.blackCount = saved.blackCount || 2;
        this.whiteCount = saved.whiteCount || 2;
        this.gameOver = saved.gameOver || false;
        this.winner = saved.winner || null;
        this.level = saved.level || 1;
        this.lastMove = saved.lastMove || null;
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  /** 切换难度并重新开始 */
  setDifficulty(diff) {
    this.difficulty = diff;
    this.initBoard();
    this.gameName = 'othello';
    this.gameOver = false;
    this.saveState();
  }

  // ========== 事件处理 ==========

  /**
   * 绑定 Canvas 点击事件（统一入口）。
   *
   * 点击分发（按优先级）：
   * 1. 返回按钮     → 切到菜单
   * 2. 通关面板     → 下一局 / 返回
   * 3. 非玩家回合   → 忽略
   * 4. 底部操作栏   → 撤销 / 重开 / 规则
   * 5. 教程遮罩     → 关闭教程
   * 6. 难度按钮     → 切换难度
   * 7. 棋盘格子     → 落子 + 触发 AI
   */
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;

      // 1. 返回按钮
      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('menu');
        return;
      }

      // 1.1 右上角「全部游戏」入口（招牌游戏首页）
      if (this.headerBar.isMenuButton(x, y)) {
        sound.play('click');
        this.switchGame('menu');
        return;
      }

      // 1.2 规则/教程浮层（模态：显示时拦截所有点击，点「开始游戏」关闭）
      if (this.tutorial && this.tutorial.shouldShow()) {
        if (this.tutorial.hitTest(x, y)) {
          sound.play('click');
          this.tutorial.dismiss();
          this.draw();
        }
        return;
      }

      // 2. 通关面板
      if (this.gameOver) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          sound.play('click');
          this.initBoard();
          this.currentPlayer = this.BLACK;
          this.gameOver = false;
          this.winner = null;
          this.aiThinking = false;
          this.lastMove = null;
          this.skipMessage = null;
          this.victoryPanel.reset();
          this.draw();
          return;
        }
        if (result === 'back') {
          sound.play('click');
          this.switchGame('menu');
          return;
        }
        return;
      }

      // 3. 非玩家回合或 AI 计算中
      if (this.currentPlayer !== this.BLACK || this.aiThinking) return;

      // 4. 底部操作栏
      const action = this.bottomBar.handleClick(x, y);
      if (action) { this._handleBottomAction(action); return; }

      // 6. 难度选择按钮
      let diffY = this._diffBarY;
      let diffW = 60, diffGap = 8;
      let diffStartX = (this.width - (4 * diffW + 3 * diffGap)) / 2;
      for (let i = 0; i < 4; i++) {
        let bx = diffStartX + i * (diffW + diffGap);
        if (y > diffY - 18 && y < diffY + 18 && x > bx && x < bx + diffW) {
          this.setDifficulty(this.difficulties[i].name);
          return;
        }
      }

      // 7. 棋盘落子
      let col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      let row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      if (row >= 0 && row < 8 && col >= 0 && col < 8 && this.board[row][col] === 0) {
        if (core.canPlace(row, col, this.board, this.currentPlayer)) {
          this.lastMove = { row, col };
          if (this.undoMgr) this.undoMgr.save({
            board: this.board.map(r => [...r]),
            currentPlayer: this.currentPlayer
          });
          this.placePiece(row, col);
          if (!this.gameOver && this.currentPlayer === this.WHITE) {
            this.aiThinking = true;
            setTimeout(() => this.aiMove(), 300);
          }
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  // ========== 游戏核心逻辑 ==========

  /**
   * 判断 (row, col) 落子是否合法（委托给 core.canPlace）。
   * @returns {boolean}
   */
  canPlace(row, col) {
    return core.canPlace(row, col, this.board, this.currentPlayer);
  }

  /** @returns {number} 当前玩家的对手 */
  getOpponent() {
    return core.getOpponent(this.currentPlayer);
  }

  /**
   * 执行落子 + 翻转（使用 core.applyMove），然后更新状态。
   */
  placePiece(row, col) {
    core.applyMove(row, col, this.board, this.currentPlayer);
    this._syncCounts();
    this.checkGameOver();
    this._syncValidMoves();
    this.saveState();
  }

  /**
   * 检测游戏结束 / 回合切换 / 跳过逻辑。
   */
  checkGameOver() {
    const blackCanMove = core.hasValidMoves(this.board, this.BLACK);
    const whiteCanMove = core.hasValidMoves(this.board, this.WHITE);

    // 双方都无法落子 → 游戏结束
    if (!blackCanMove && !whiteCanMove) {
      this.gameOver = true;
      this.confetti.start();
      sound.play('victory');

      const rewardMgr = getRewardManager();
      const rewardResult = rewardMgr.processVictory(this.gameName, {
        difficulty: 'easy', level: 1, time: 0
      });
      rewardMgr.showRewardToast(rewardResult);

      this.saveGameProgress();
      statsManager.endGame(true);
      this.winner = this.blackCount > this.whiteCount ? this.BLACK
                  : this.whiteCount > this.blackCount ? this.WHITE
                  : null;

      // ========== 成就检查 ==========
      // 通用成就：通关1/10/50/100关
      // 黑白棋每局即1关，winCount 从 storage 读取
      let winCount = 0;
      try {
        const p = JSON.parse(wx.getStorageSync('progress_othello') || '{}');
        winCount = p.unlocked || 0;
      } catch (e) {}
      this._newAchievements = this.achievement.check(this.gameName, winCount);

      // 独有成就解锁判断
      if (this.winner === this.BLACK) {
        // 完美碾压：64:0 获胜
        if (this.blackCount === 64) {
          const a = this.achievement.unlock('othello_perfect');
          if (a) this._newAchievements = [...(this._newAchievements || []), a];
        }
        // 角霸天下：占领4个角
        const corners = [[0,0],[0,7],[7,0],[7,7]];
        const ownedCorners = corners.filter(([r,c]) => this.board[r][c] === this.BLACK).length;
        if (ownedCorners === 4) {
          const a = this.achievement.unlock('othello_corner');
          if (a) this._newAchievements = [...(this._newAchievements || []), a];
        }
        // 绝地翻盘：中盘落后20子以上最终获胜
        if (this._maxDeficit >= 20) {
          const a = this.achievement.unlock('othello_comeback');
          if (a) this._newAchievements = [...(this._newAchievements || []), a];
        }
      }

      return;
    }

    const nextPlayer = core.getOpponent(this.currentPlayer);
    const nextCanMove = nextPlayer === this.BLACK ? blackCanMove : whiteCanMove;

    if (nextCanMove) {
      this.currentPlayer = nextPlayer;
      this._syncValidMoves();
    } else {
      const skipName = nextPlayer === this.BLACK ? '黑棋' : '白棋';
      this.skipMessage = skipName + '无法落子，跳过';
      this.skipMessageTimer = 60;
      this._syncValidMoves();
      if (this.currentPlayer === this.WHITE && !whiteCanMove) {
        this.currentPlayer = this.BLACK;
        this._syncValidMoves();
      }
    }
  }

  // ========== AI 调度 ==========

  /**
   * AI 走棋入口：调用 ai.findBestMove 搜索最佳着法，
   * 然后通过 placePiece 执行（触发 checkGameOver 处理回合切换）。
   */
  aiMove() {
    if (this.gameOver) return;

    const depth = this.difficulties.find(d => d.name === this.difficulty).depth;
    const bestMove = ai.findBestMove(this.board, this.WHITE, depth);

    if (bestMove) {
      this.lastMove = bestMove;
      this.currentPlayer = this.WHITE;
      this.placePiece(bestMove.row, bestMove.col);
      // 如果黑棋被跳过 → AI 继续走
      if (!this.gameOver && this.currentPlayer === this.WHITE) {
        this.aiThinking = true;
        setTimeout(() => this.aiMove(), 300);
      }
    } else {
      this.currentPlayer = this.BLACK;
      this._syncValidMoves();
    }

    this.aiThinking = false;
  }

  // ========== 渲染循环 ==========

  /** 每帧更新动画计数器 */
  update() {
    this.animationTime += 0.06;
  }

  /**
   * 主绘制函数（由 update 每帧驱动）。
   *
   * 渲染层次（从底到顶）：
   * 1. 背景渐变
   * 2. HeaderBar
   * 3. 状态信息（棋子数、回合提示）
   * 4. 难度选择栏
   * 5. 棋盘 + 棋子 + 合法着法提示
   * 6. BottomBar
   * 7. VictoryPanel（条件显示）
   */
  draw() {
    // 1. 背景
    renderer.drawBackground(this.ctx, this.width, this.height);

    // 2. HeaderBar
    this.headerBar.draw({ title: '黑白棋' });

    // 3. 状态信息
    renderer.drawStatus(this.ctx, this.boardOffsetY, this.width,
      this.blackCount, this.whiteCount, this.gameOver, this.winner,
      this.currentPlayer, this.skipMessage, this.BLACK, this.WHITE);

    // 4. 难度选择栏（返回底部 Y 供后续控件动态布局）
    const diffBarBottom = renderer.drawDifficultyBar(this.ctx, this.difficulties, this.difficulty,
      this._diffBarY, this.width);
    // 棋盘顶部 = 难度栏底部 + 间距
    this.boardOffsetY = diffBarBottom + 30;

    // 5. 棋盘 + 棋子 + 提示
    renderer.drawBoard(this.ctx, this.boardOffsetX, this.boardOffsetY, this.cellSize);
    renderer.drawPieces(this.ctx, this.board, this.boardOffsetX, this.boardOffsetY,
      this.cellSize, this.lastMove, this.animationTime, this.pieceImages,
      this.BLACK, this.WHITE);
    renderer.drawValidMoves(this.ctx, this.validMoves, this.boardOffsetX, this.boardOffsetY,
      this.cellSize, this.animationTime, this.showValidHints, this.gameOver,
      this.currentPlayer, this.aiThinking, this.BLACK);

    // 6. BottomBar
    const buttons = [{ id: 'restart', text: '🔄 重新开始', enabled: true }];
    if (this.undoMgr && this.undoMgr.canUndo()) {
      buttons.unshift({ id: 'undo', text: '↩️ 撤销', enabled: true });
    }
    this.bottomBar.setButtons(buttons);
    this.bottomBar.draw();

    // 7. VictoryPanel
    if (this.gameOver) {
      const resultText = this.winner === this.BLACK ? '⚫ 黑棋获胜' :
                         this.winner === this.WHITE ? '⚪ 白棋获胜' : '🤝 平局';
      this.victoryPanel.setSubtitle(`${resultText}  ·  ${this.blackCount} : ${this.whiteCount}`);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }

    // 8. 教程/规则浮层（最上层，点击「📖 规则」或首次进入时显示）
    if (this.tutorial && this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }

  /** 绘制通用圆角按钮 */
  drawButton(x, y, w, h, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx, x, y, w, h, 20);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x + w / 2, y + 26);
  }

  // ========== 底部操作栏处理 ==========

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.undoMgr && this.undoMgr.canUndo()) {
          this._usedUndo = true;  // 标记使用了撤销
          const prev = this.undoMgr.undo();
          if (prev) {
            this.board = prev.board;
            this.currentPlayer = prev.currentPlayer;
            sound.playClick();
            this.draw();
          }
        }
        break;
      case 'restart':
        this.initBoard();
        this.currentPlayer = this.BLACK;
        this.gameOver = false;
        this.winner = null;
        this.aiThinking = false;
        this.lastMove = null;
        this.skipMessage = null;
        this.undoMgr.clear();
        this.victoryPanel.reset();
        sound.play('click');
        this.draw();
        break;
      case 'hint':
        if (this.hintMgr) { this.hintMgr.showHint(); this._usedHint = true; sound.playSuccess(); }
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }

  // ========== 存档 & 生命周期 ==========

  /** 保存通关进度到 Storage */
  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName;
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      if (this.level >= progress.unlocked) progress.unlocked = this.level + 1;
      if (!progress.stars[this.level]) progress.stars[this.level] = 1;
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) { console.log('保存进度失败', e); }
  }

  /** 销毁实例：主动存档 + 移除事件监听 */
  destroy() {
    this.saveState();
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  /** 成就弹窗回调 */
  _drawAchievementPopup() {
    this._newAchievements = null;
  }
}

module.exports = Othello;
