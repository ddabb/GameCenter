const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const roundRect = require('../utils/round-rect.js');
const TutorialOverlay = require('./tutorial-overlay')
const UndoManager = require('./undo-manager')
const { AchievementManager } = require('./achievement-manager')
const { ShareCard } = require('./share-card');

class Othello {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.gameName = 'othello';
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1;
    
    this.difficulty = 'medium'; // easy, medium, hard, expert
    this.difficulties = [
      { name: 'easy', label: '简单', depth: 2 },
      { name: 'medium', label: '中等', depth: 3 },
      { name: 'hard', label: '困难', depth: 4 },
      { name: 'expert', label: '专家', depth: 5 }
    ];
    
    this.cellSize = Math.min(this.width * 0.9 / 8, 42);
    this.boardOffsetX = (this.width - this.cellSize * 8) / 2;
    this.boardOffsetY = this.statusBarHeight + 200;
    
    this.BLACK = 1;
    this.WHITE = 2;
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
    if (!this.loadState()) {
      this.initBoard();
    } else {
      // 从存档恢复，重新计算计数和合法着法
      this.updateCount();
      this.updateValidMoves();
    }
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }
  
  initBoard() {
    this.board = [];
    for (let r = 0; r < 8; r++) {
      this.board[r] = [];
      for (let c = 0; c < 8; c++) {
        this.board[r][c] = 0;
      }
    }
    this.board[3][3] = this.WHITE;
    this.board[3][4] = this.BLACK;
    this.board[4][3] = this.BLACK;
    this.board[4][4] = this.WHITE;
    this.updateCount();
    this.updateValidMoves();
  }
  
  updateValidMoves() {
    this.validMoves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 0) {
          let saved = this.currentPlayer;
          this.currentPlayer = this.BLACK;
          if (this.canPlace(r, c)) this.validMoves.push({row: r, col: c});
          this.currentPlayer = saved;
        }
      }
    }
  }
  
  saveState() {
    try {
      wx.setStorageSync('othello_saved', {
        board: this.board,
        currentPlayer: this.currentPlayer,
        difficulty: this.difficulty,
        blackCount: this.blackCount,
        whiteCount: this.whiteCount,
        gameOver: this.gameOver,
        winner: this.winner,
        level: this.level
      });
    } catch (e) { /* ignore */ }
  }
  
  loadState() {
    try {
      const saved = wx.getStorageSync('othello_saved');
      if (saved && saved.board && saved.board.length === 8) {
        this.board = saved.board;
        this.currentPlayer = saved.currentPlayer || this.BLACK;
        this.difficulty = saved.difficulty || 'medium';
        this.blackCount = saved.blackCount || 2;
        this.whiteCount = saved.whiteCount || 2;
        this.gameOver = saved.gameOver || false;
        this.winner = saved.winner || null;
        this.level = saved.level || 1;
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }
  
  setDifficulty(diff) {
    this.difficulty = diff;
    this.initBoard();
    this.gameName = 'othello';
    this.confetti = new Confetti(this.ctx, this.width, this.height);



    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this.gameOver = false;
    this.saveState();
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
      // 顶部返回按钮（左上角）
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
        sound.play('click');
          this.switchGame('menu');
        return;
      }

      // 通关面板
      if (this.gameOver) {
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.loadLevel();
          sound.play('click');
          this._nextBtn = null;
          this._backBtn = null;
          this.confetti.stop(); if (this.undoMgr) this.undoMgr.clear();
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('menu');
          return;
        }
        if (!this._nextBtn || !this._backBtn) {
          this.confetti.draw();
      if (this._newAchievements && this._newAchievements.length > 0) this._drawAchievementPopup();
      this.showBackButton();
        }
        return;
      }
      
      if (this.currentPlayer !== this.BLACK || this.aiThinking) return;// 撤销按钮检测
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w && y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state) {
          this.board = state.board;
          this.draw();
        }
        return;
      }
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }// 难度按钮
      let diffY = 55;
      let diffW = 60;
      let diffGap = 8;
      let totalW = 4 * diffW + 3 * diffGap;
      let diffStartX = (this.width - totalW) / 2;
      for (let i = 0; i < 4; i++) {
        let bx = diffStartX + i * (diffW + diffGap);
        if (y > diffY - 18 && y < diffY + 18 && x > bx && x < bx + diffW) {
          this.setDifficulty(this.difficulties[i].name);
          return;
        }
      }
      
      // 棋盘点击
      let col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      let row = Math.floor((y - this.boardOffsetY) / this.cellSize);
      
      if (row >= 0 && row < 8 && col >= 0 && col < 8 && this.board[row][col] === 0) {
        if (this.canPlace(row, col)) {
          this.lastMove = {row, col};
          if (this.undoMgr) this.undoMgr.save({ board: this.board.map(r => [...r]), currentPlayer: this.currentPlayer });
          this.placePiece(row, col);
          // placePiece内部checkGameOver处理切换/跳过
          // 如果切换到了白棋，触发AI
          if (!this.gameOver && this.currentPlayer === this.WHITE) {
            this.aiThinking = true;
            setTimeout(() => this.aiMove(), 300);
          }
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  canPlace(row, col) {
    let directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (let dir of directions) {
      let r = row + dir[0];
      let c = col + dir[1];
      let foundOpponent = false;
      
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        if (this.board[r][c] === this.getOpponent()) {
          foundOpponent = true;
        } else if (this.board[r][c] === this.currentPlayer) {
          if (foundOpponent) return true;
          break;
        } else {
          break;
        }
        r += dir[0];
        c += dir[1];
      }
    }
    return false;
  }
  
  getOpponent() {
    return this.currentPlayer === this.BLACK ? this.WHITE : this.BLACK;
  }
  
  placePiece(row, col) {
    let directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    this.board[row][col] = this.currentPlayer;
    
    for (let dir of directions) {
      let r = row + dir[0];
      let c = col + dir[1];
      let toFlip = [];
      
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        if (this.board[r][c] === this.getOpponent()) {
          toFlip.push([r, c]);
        } else if (this.board[r][c] === this.currentPlayer) {
          for (let [fr, fc] of toFlip) {
            this.board[fr][fc] = this.currentPlayer;
          }
          break;
        } else {
          break;
        }
        r += dir[0];
        c += dir[1];
      }
    }
    
    this.updateCount();
    this.checkGameOver();
    this.updateValidMoves();
    this.saveState();
  }
  
  updateCount() {
    this.blackCount = 0;
    this.whiteCount = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === this.BLACK) this.blackCount++;
        if (this.board[r][c] === this.WHITE) this.whiteCount++;
      }
    }
  }
  
  checkGameOver() {
    let blackCanMove = this._hasValidMoves(this.BLACK);
    let whiteCanMove = this._hasValidMoves(this.WHITE);
    
    if (!blackCanMove && !whiteCanMove) {
      // 双方都无法落子，游戏结束
      this.gameOver = true;
      this.confetti.start();
      sound.play('victory');
      this.saveGameProgress(); statsManager.endGame(true);
      this.winner = this.blackCount > this.whiteCount ? this.BLACK :
                   this.whiteCount > this.blackCount ? this.WHITE : null;
      return;
    }
    
    let nextPlayer = this.currentPlayer === this.BLACK ? this.WHITE : this.BLACK;
    let nextCanMove = (nextPlayer === this.BLACK) ? blackCanMove : whiteCanMove;
    
    if (nextCanMove) {
      // 对方可以下，正常切换
      this.currentPlayer = nextPlayer;
      this.updateValidMoves();
    } else {
      // 对方无法落子，跳过，当前玩家继续
      let skipName = nextPlayer === this.BLACK ? '黑棋' : '白棋';
      this.skipMessage = skipName + '无法落子，跳过';
      this.skipMessageTimer = 60; // 显示60帧约2秒
      // currentPlayer不变，继续当前玩家
      this.updateValidMoves();
      // 如果是AI被跳过（白棋无子可下），AI不需再走，玩家直接继续
      // 如果是玩家被跳过（黑棋无子可下），自动触发AI走
      if (this.currentPlayer === this.BLACK && !blackCanMove) {
        // 当前是黑棋回合但黑棋无子可下（不会发生，因为上面已判断nextCanMove=false意味着对方不行）
        // 实际不会走到这里，但保险起见
        this.currentPlayer = this.WHITE;
        this.updateValidMoves();
        this.aiThinking = true;
        setTimeout(() => this.aiMove(), 300);
      } else if (this.currentPlayer === this.WHITE && !whiteCanMove) {
        // AI回合但白棋无子可下，跳回玩家
        this.currentPlayer = this.BLACK;
        this.updateValidMoves();
      }
    }
  }
  
  _hasValidMoves(player) {
    let saved = this.currentPlayer;
    this.currentPlayer = player;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 0 && this.canPlace(r, c)) {
          this.currentPlayer = saved;
          return true;
        }
      }
    }
    this.currentPlayer = saved;
    return false;
  }
  
  aiMove() {
    if (this.gameOver) return;
    
    let depth = this.difficulties.find(d => d.name === this.difficulty).depth;
    let bestMove = null;
    let bestScore = -Infinity;
    
    let moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 0) {
          this.currentPlayer = this.WHITE;
          if (this.canPlace(r, c)) {
            moves.push({row: r, col: c});
          }
        }
      }
    }
    
    for (let move of moves) {
      let boardCopy = this.board.map(row => [...row]);
      this.board[move.row][move.col] = this.WHITE;
      this.flipPieces(move.row, move.col, this.WHITE);
      
      let score = this.minimax(depth - 1, -Infinity, Infinity, false);
      
      this.board = boardCopy;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
    
    if (bestMove) {
      this.lastMove = bestMove;
      this.currentPlayer = this.WHITE;
      this.placePiece(bestMove.row, bestMove.col);
      // placePiece 内部 checkGameOver 已处理切换/跳过
      // 如果当前回合还在白棋（黑棋被跳过），继续AI走
      if (!this.gameOver && this.currentPlayer === this.WHITE) {
        this.aiThinking = true;
        setTimeout(() => this.aiMove(), 300);
      }
    } else {
      // AI无子可下，跳过
      this.currentPlayer = this.BLACK;
      this.updateValidMoves();
    }
    
    this.aiThinking = false;
  }
  
  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return this.evaluateBoard();
    
    let player = isMaximizing ? this.WHITE : this.BLACK;
    let moves = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 0) {
          this.currentPlayer = player;
          if (this.canPlace(r, c)) {
            moves.push({row: r, col: c});
          }
        }
      }
    }
    
    if (moves.length === 0) {
      let opponentMoves = [];
      let opponent = this.getOpponent();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          if (this.board[r][c] === 0) {
            this.currentPlayer = opponent;
            if (this.canPlace(r, c)) {
              opponentMoves.push({row: r, col: c});
            }
          }
        }
      }
      if (opponentMoves.length === 0) return this.evaluateBoard() * 100;
      return this.minimax(depth - 1, alpha, beta, !isMaximizing);
    }
    
    if (isMaximizing) {
      let maxScore = -Infinity;
      for (let move of moves) {
        let boardCopy = this.board.map(row => [...row]);
        this.board[move.row][move.col] = this.WHITE;
        this.flipPieces(move.row, move.col, this.WHITE);
        let score = this.minimax(depth - 1, alpha, beta, false);
        this.board = boardCopy;
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
      return maxScore;
    } else {
      let minScore = Infinity;
      for (let move of moves) {
        let boardCopy = this.board.map(row => [...row]);
        this.board[move.row][move.col] = this.BLACK;
        this.flipPieces(move.row, move.col, this.BLACK);
        let score = this.minimax(depth - 1, alpha, beta, true);
        this.board = boardCopy;
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
      return minScore;
    }
  }
  
  flipPieces(row, col, player) {
    let directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    for (let dir of directions) {
      let r = row + dir[0];
      let c = col + dir[1];
      let toFlip = [];
      
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        if (this.board[r][c] === this.getOpponent()) {
          toFlip.push([r, c]);
        } else if (this.board[r][c] === player) {
          for (let [fr, fc] of toFlip) {
            this.board[fr][fc] = player;
          }
          break;
        } else {
          break;
        }
        r += dir[0];
        c += dir[1];
      }
    }
  }
  
  evaluateBoard() {
    let score = 0;
    // 位置权重
    let posWeight = [[100,-20,10,5,5,10,-20,100],
                    [-20,-50,-2,-2,-2,-2,-50,-20],
                    [10,-2,1,1,1,1,-2,10],
                    [5,-2,1,0,0,1,-2,5],
                    [5,-2,1,0,0,1,-2,5],
                    [10,-2,1,1,1,1,-2,10],
                    [-20,-50,-2,-2,-2,-2,-50,-20],
                    [100,-20,10,5,5,10,-20,100]];
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === this.WHITE) {
          score += posWeight[r][c];
        } else if (this.board[r][c] === this.BLACK) {
          score -= posWeight[r][c];
        }
      }
    }
    
    // 行动力（可选落子数）
    let whiteMoves = 0, blackMoves = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === 0) {
          this.currentPlayer = this.WHITE;
          if (this.canPlace(r, c)) whiteMoves++;
          this.currentPlayer = this.BLACK;
          if (this.canPlace(r, c)) blackMoves++;
        }
      }
    }
    score += (whiteMoves - blackMoves) * 2;
    
    return score;
  }
  
  update() {
    this.animationTime += 0.06;
  }
  
  draw() {
    this.drawBackground();
      
    this.drawDifficultyBar();
    this.drawHeader();
    this.drawBoard();
    this.drawPieces();
    this.drawValidMoves();
    this.drawBottomBar();
    
    if (this.gameOver) {
      this.drawGameOver();
    }
  }
  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a2e1a');
    gradient.addColorStop(1, '#0f1f0f');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  drawDifficultyBar() {
    let y = this.statusBarHeight + 110;
    let w = 60;
    let h = 32;
    let gap = 8;
    let totalW = 4 * w + 3 * gap;
    let startX = (this.width - totalW) / 2;
    
    for (let i = 0; i < 4; i++) {
      let x = startX + i * (w + gap);
      let diff = this.difficulties[i];
      let isActive = diff.name === this.difficulty;
      
      if (isActive) {
        this.ctx.fillStyle = 'rgba(107, 203, 119, 0.3)';
        this.ctx.beginPath();
        roundRect(this.ctx, x - 2, y - h/2 - 2, w + 4, h + 4, 8);
        this.ctx.fill();
      }
      
      this.ctx.fillStyle = isActive ? '#6BCB77' : 'rgba(255, 255, 255, 0.2)';
      this.ctx.beginPath();
      roundRect(this.ctx, x, y - h/2, w, h, 8);
      this.ctx.fill();
      
      this.ctx.fillStyle = isActive ? '#fff' : 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = (w * 0.35) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(diff.label, x + w/2, y + 6);
    }
  }
  
  drawHeader() {
    // 左上角返回按钮
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx, 15, this.statusBarHeight + 8, 70, 32, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', 50, this.statusBarHeight + 29);

    // 标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚫ 黑白棋 ⚪', this.width / 2, this.statusBarHeight + 30);

    // 分数板和回合提示合并一行
    let infoY = this.statusBarHeight + 55;
    let scoreWidth = this.width * 0.85;
    let scoreX = (this.width - scoreWidth) / 2;
    let scoreH = 36;

    // 左侧黑棋
    let blackActive = this.currentPlayer === this.BLACK && !this.gameOver;
    this.ctx.fillStyle = blackActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx, scoreX, infoY, scoreWidth / 2 - 4, scoreH, scoreH/2);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.fillText('⚫ ' + this.blackCount, scoreX + scoreWidth / 4, infoY + scoreH/2 + 6);

    // 中间回合提示
    if (!this.gameOver) {
      let turnText = this.currentPlayer === this.BLACK ? '🎯 你的回合' : '🤔 AI思考';
      let turnColor = this.currentPlayer === this.BLACK ? '#6BCB77' : '#FFD700';
      this.ctx.fillStyle = turnColor;
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillText(turnText, this.width / 2, infoY + scoreH/2 + 5);
    }

    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      let msgW = 180;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.font = '13px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      let msgW = 180;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.font = '13px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      this.ctx.font = '13px Arial';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      this.ctx.font = '13px Arial';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      this.ctx.font = '13px Arial';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.font = '13px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      this.ctx.font = '13px Arial';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.font = '13px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
      this.skipMessageTimer--;
      if (this.skipMessageTimer <= 0) this.skipMessage = null;
    }
    
    // 跳过提示
    if (this.skipMessage && this.skipMessageTimer > 0) {
      this.ctx.fillStyle = 'rgba(255, 193, 7, 0.2)';
      this.ctx.font = '13px Arial';
      this.ctx.textAlign = 'center';
      let msgW = this.ctx.measureText(this.skipMessage).width + 24;
      let msgX = (this.width - msgW) / 2;
      roundRect(this.ctx, msgX, infoY + scoreH + 6, msgW, 28, 14);
      this.ctx.fill();
      this.ctx.fillStyle = '#FFC107';
      this.ctx.fillText(this.skipMessage, this.width / 2, infoY + scoreH + 24);
    }
    
    // 右侧白棋
    let whiteActive = this.currentPlayer === this.WHITE && !this.gameOver;
    this.ctx.fillStyle = whiteActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx, scoreX + scoreWidth / 2 + 4, infoY, scoreWidth / 2 - 4, scoreH, scoreH/2);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 18px Arial';
    this.ctx.fillText(this.whiteCount + ' ⚪', scoreX + scoreWidth * 3/4, infoY + scoreH/2 + 6);
  }
  
  drawBoard() {
    // 棋盘阴影
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.beginPath();
    roundRect(this.ctx, this.boardOffsetX + 4, this.boardOffsetY + 6, 
                       this.cellSize * 8, this.cellSize * 8, 10);
    this.ctx.fill();
    
    // 棋盘背景
    this.ctx.fillStyle = '#2D5A27';
    this.ctx.beginPath();
    roundRect(this.ctx, this.boardOffsetX, this.boardOffsetY, 
                       this.cellSize * 8, this.cellSize * 8, 10);
    this.ctx.fill();
  }
  
  drawPieces() {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        let x = this.boardOffsetX + c * this.cellSize;
        let y = this.boardOffsetY + r * this.cellSize;
        
        // 网格线
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, this.cellSize, this.cellSize);
        
        if (this.board[r][c] !== 0) {
          let cx = x + this.cellSize / 2;
          let cy = y + this.cellSize / 2;
          let radius = this.cellSize / 2 - 6;
          
          // 最后一步动画
          let isLast = this.lastMove && this.lastMove.row === r && this.lastMove.col === c;
          let pulse = isLast ? Math.sin(this.animationTime * 3) * 3 : 0;
          
          // 棋子阴影
          this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(cx + 2, cy + 3, radius + pulse, 0, Math.PI * 2);
          this.ctx.fill();
          
          // 棋子渐变
          let grad = this.ctx.createRadialGradient(
            cx - radius * 0.3, cy - radius * 0.3, 0,
            cx, cy, radius + pulse
          );
          
          if (this.board[r][c] === this.BLACK) {
            grad.addColorStop(0, '#555');
            grad.addColorStop(0.5, '#222');
            grad.addColorStop(1, '#000');
          } else {
            grad.addColorStop(0, '#fff');
            grad.addColorStop(0.5, '#eee');
            grad.addColorStop(1, '#ccc');
          }
          
          this.ctx.fillStyle = grad;
          this.ctx.beginPath();
          this.ctx.arc(cx, cy, radius + pulse, 0, Math.PI * 2);
          this.ctx.fill();
          
          // 高光
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          this.ctx.beginPath();
          this.ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
          this.ctx.fill();
        }
      }
    }
  }
  
  drawValidMoves() {
    if (!this.showValidHints || this.gameOver || this.currentPlayer !== this.BLACK || this.aiThinking) return;
    
    for (let move of this.validMoves) {
      let x = this.boardOffsetX + move.col * this.cellSize + this.cellSize / 2;
      let y = this.boardOffsetY + move.row * this.cellSize + this.cellSize / 2;
      
      let pulse = Math.sin(this.animationTime * 2) * 2;
      
      this.ctx.fillStyle = 'rgba(107, 203, 119, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 6 + pulse, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  drawBottomBar() {
    // 底部留空，不再绘制返回按钮
  }
  
  drawButton(x, y, w, h, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx, x, y, w, h, 20);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x + w/2, y + 26);
  }
  
  showBackButton() {
    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    // 半透明遮罩
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    // 面板背景
    roundRect(this.ctx, panelX, panelY, panelW, panelH, 16);
    this.ctx.fillStyle = '#1e2a4a';
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 结果
    let resultText, resultEmoji;
    if (this.winner === this.BLACK) {
      resultEmoji = '🎉';
      resultText = '你赢了！';
    } else if (this.winner === this.WHITE) {
      resultEmoji = '💪';
      resultText = 'AI获胜';
    } else {
      resultEmoji = '🤝';
      resultText = '平局！';
    }

    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(resultEmoji, this.width / 2, panelY + 50);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText(resultText, this.width / 2, panelY + 85);

    this.ctx.font = '16px Arial';
    this.ctx.fillText('⚫ ' + this.blackCount + '  VS  ' + this.whiteCount + ' ⚪', this.width / 2, panelY + 115);

    // 下一关按钮
    const btnW = 180, btnH = 42, btnX = (this.width - btnW) / 2;
    roundRect(this.ctx, btnX, panelY + 130, btnW, btnH, 21);
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 17px Arial';
    this.ctx.fillText('下一关', this.width / 2, panelY + 156);
    this._nextBtn = { x: btnX, y: panelY + 130, w: btnW, h: btnH };

    // 返回选关按钮
    roundRect(this.ctx, btnX, panelY + 182, btnW, btnH, 21);
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('返回选关', this.width / 2, panelY + 208);
    this._backBtn = { x: btnX, y: panelY + 182, w: btnW, h: btnH };
  }



  drawGameOver() {
    if (!this._nextBtn || !this._backBtn) {
      this.confetti.draw();
      if (this._newAchievements && this._newAchievements.length > 0) this._drawAchievementPopup();
      this.showBackButton();
    }
  }
  

  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName;
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      // 解锁下一关
      if (this.level >= progress.unlocked) {
        progress.unlocked = this.level + 1;
      }
      // 记录通关（1星，后续可扩展星级评分）
      if (!progress.stars[this.level]) {
        progress.stars[this.level] = 1;
      }
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {
      console.log('保存进度失败', e);
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  _drawAchievementPopup() {
    this._newAchievements = null;
  }
}

module.exports = Othello;