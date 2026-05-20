const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const UndoManager = require('./undo-manager');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const roundRect = require('../utils/round-rect.js');

class Tents {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    console.log(`[Tents] 初始化游戏, 关卡: ${level}`);
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.level = level || 1;
    this.gameName = 'tents';

    // 布局初始化（loadLevel 会覆盖）
    this.cellSize = Math.min(this.width * 0.85 / 7, 55);
    this.boardOffsetX = (this.width - this.cellSize * 7) / 2;
    this.boardOffsetY = this.statusBarHeight + 110;

    this.tents = [];
    this.animationTime = 0;
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();
    this.undoMgr = new UndoManager();
    this.shareCard = new ShareCard(this.ctx, this.width, this.height);
    this._ruleBtn = { x: this.width - 50, y: this.statusBarHeight + 14, w: 40, h: 40 };

    statsManager.startGame(this.gameName, this.level);
    this.loadLevel();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    this.bindEvents();
  }

  async loadLevel() {
    console.log(`[Tents] 加载关卡: ${this.level}`);
    this.confetti.stop();
    if (this.undoMgr) this.undoMgr.clear();
    this.victory = false;
    this._nextBtn = null;
    this._backBtn = null;

    const safeLevel = String(this.level).padStart(4, '0');
    try {
      const data = require(`../data/tents/easy/easy-${safeLevel}.json`);
      if (data && data.grid) {
        this.size = data.size || 7;
        this.cellSize = Math.min(this.width * 0.85 / this.size, 55);
        this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
        this.boardOffsetY = this.statusBarHeight + 110;

        this.board = [];
        for (let r = 0; r < this.size; r++) {
          this.board[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.board[r][c] = (data.grid[r] && data.grid[r][c] === 1) ? 1 : 0;
          }
        }

        this.tents = [];
        for (let r = 0; r < this.size; r++) {
          this.tents[r] = [];
          for (let c = 0; c < this.size; c++) {
            this.tents[r][c] = 0;
          }
        }
        return;
      }
    } catch (e) { /* 使用内置题 */ }

    // 内置题目（7×7）
    this.size = 7;
    this.cellSize = Math.min(this.width * 0.85 / this.size, 55);
    this.boardOffsetX = (this.width - this.cellSize * this.size) / 2;
    this.boardOffsetY = this.statusBarHeight + 110;

    this.board = [
      [0,0,1,0,0,1,0],
      [0,1,0,0,0,0,0],
      [0,0,0,1,0,0,1],
      [0,0,0,0,1,0,0],
      [1,0,0,0,0,0,0],
      [0,0,0,0,0,1,0],
      [0,1,0,0,0,0,1]
    ];

    this.tents = [];
    for (let r = 0; r < this.size; r++) {
      this.tents[r] = [];
      for (let c = 0; c < this.size; c++) {
        this.tents[r][c] = 0;
      }
    }
    this.victory = false;
  }

  getRowHints() {
    return [2, 1, 2, 1, 1, 1, 2];
  }

  getColHints() {
    return [1, 2, 1, 1, 1, 1, 2];
  }

  countRowTents(row) {
    let count = 0;
    for (let c = 0; c < this.size; c++) {
      if (this.tents[row][c] === 1) count++;
    }
    return count;
  }

  countColTents(col) {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      if (this.tents[r][col] === 1) count++;
    }
    return count;
  }

  bindEvents() {
    this.clickHandler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;

      // 撤销
      if (this._undoBtn && x >= this._undoBtn.x && x <= this._undoBtn.x + this._undoBtn.w &&
          y >= this._undoBtn.y && y <= this._undoBtn.y + this._undoBtn.h) {
        const state = this.undoMgr.undo();
        if (state && state.tents) {
          this.tents = state.tents;
          this.draw();
        }
        return;
      }

      // 教程
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }

      // 返回
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 42) {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }

      // 规则
      const rb = this._ruleBtn;
      if (rb && x >= rb.x && x <= rb.x + rb.w && y >= rb.y && y <= rb.y + rb.h) {
        this.tutorial.show();
        this.draw();
        return;
      }

      // 胜利面板
      if (this.victory) {
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w &&
            y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.loadLevel();
          sound.play('click');
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
            y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }

      // 棋盘点击
      const col = Math.floor((x - this.boardOffsetX) / this.cellSize);
      const row = Math.floor((y - this.boardOffsetY) / this.cellSize);

      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        if (this.board[row][col] !== 1) {
          this.undoMgr.save({ tents: this.tents.map(r => [...r]) });
          this.tents[row][col] = this.tents[row][col] === 1 ? 0 : 1;
          this.draw();
          this.checkVictory();
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  update() {
    this.animationTime += 0.08;
  }

  draw() {
    this.drawBackground();
    this.drawHeader();
    this.drawBoard();
    this.drawBottomBar();

    if (this.victory) {
      this.drawVictory();
    }

    if (this.tutorial && this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }

  checkVictory() {
    if (!this.size || this.size <= 0) return;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.board[r][c] !== 1 && this.tents[r][c] === 0) return;
      }
    }
    console.log(`[Tents] 通关！关卡: ${this.level}`);
    this.victory = true;
    this.confetti.start();
    let winCount = 0;
    try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}'); winCount = p.unlocked || 0; } catch (e) {}
    const newly = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newly;
    sound.play('victory');
    this.saveGameProgress();
    statsManager.endGame(true);
  }

  drawBackground() {
    const ctx = this.ctx;
    const bg = ctx.createLinearGradient(0, 0, 0, this.height);
    bg.addColorStop(0, '#1B4332');
    bg.addColorStop(1, '#0D2818');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let i = 0; i < 20; i++) {
      const sx = (i * 43 + this.animationTime * 5) % this.width;
      const sy = (i * 67) % (this.height * 0.4);
      ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(this.animationTime + i) * 0.2})`;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHeader() {
    const ctx = this.ctx;
    const SH = this.statusBarHeight;

    // 返回按钮
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    roundRect(ctx, 15, SH + 8, 70, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('← 返回', 50, SH + 29);

    // 标题
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('⛺ 帐篷', this.width / 2, SH + 56);

    // 关卡号
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '13px -apple-system';
    ctx.fillText('关卡 ' + this.level, this.width / 2, SH + 78);

    // 规则按钮（右上角）
    const rb = this._ruleBtn;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    roundRect(ctx, rb.x, rb.y, rb.w, rb.h, 20);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('?', rb.x + rb.w / 2, rb.y + rb.h / 2 + 7);
  }

  drawBoard() {
    const ctx = this.ctx;
    const rowHints = this.getRowHints();
    const colHints = this.getColHints();

    // 列提示
    for (let c = 0; c < this.size; c++) {
      const x = this.boardOffsetX + c * this.cellSize + this.cellSize / 2;
      const count = this.countColTents(c);
      const hint = colHints[c];
      ctx.font = 'bold ' + (this.cellSize * 0.35) + 'px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillStyle = (count === hint) ? '#6BCB77' : '#FF6B6B';
      ctx.fillText(`${count}/${hint}`, x, this.boardOffsetY - 10);
    }

    // 行提示
    for (let r = 0; r < this.size; r++) {
      const y = this.boardOffsetY + r * this.cellSize + this.cellSize / 2;
      const count = this.countRowTents(r);
      const hint = rowHints[r];
      ctx.font = 'bold ' + (this.cellSize * 0.35) + 'px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillStyle = (count === hint) ? '#6BCB77' : '#FF6B6B';
      ctx.fillText(`${count}/${hint}`, this.boardOffsetX - 20, y + 5);
    }

    // 棋盘阴影
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    roundRect(ctx, this.boardOffsetX + 3, this.boardOffsetY + 4, this.cellSize * this.size, this.cellSize * this.size, 8);
    ctx.fill();

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const x = this.boardOffsetX + c * this.cellSize;
        const y = this.boardOffsetY + r * this.cellSize;

        // 草地
        const g = ctx.createLinearGradient(x, y, x + this.cellSize, y + this.cellSize);
        g.addColorStop(0, '#2D5A27');
        g.addColorStop(1, '#1A3A18');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, this.cellSize, this.cellSize);

        // 树
        if (this.board[r][c] === 1) {
          const tx = x + this.cellSize / 2;
          const ty = y + this.cellSize / 2;
          const pulse = Math.sin(this.animationTime) * 2;

          ctx.fillStyle = '#5D4037';
          ctx.fillRect(tx - 4, ty + pulse, 8, 18);

          ctx.fillStyle = '#1B5E20';
          ctx.beginPath();
          ctx.arc(tx, ty - 5 + pulse, this.cellSize * 0.32, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = 'rgba(255,255,255,0.18)';
          ctx.beginPath();
          ctx.arc(tx - 5, ty - 10 + pulse, this.cellSize * 0.13, 0, Math.PI * 2);
          ctx.fill();
        }

        // 帐篷
        if (this.tents[r][c] === 1) {
          const tx = x + this.cellSize / 2;
          const ty = y + this.cellSize / 2;
          const pulse = Math.sin(this.animationTime * 2) * 1;

          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.beginPath();
          ctx.moveTo(tx, y + 8 + pulse);
          ctx.lineTo(x + this.cellSize - 5, y + this.cellSize - 5);
          ctx.lineTo(x + 5, y + this.cellSize - 5);
          ctx.closePath();
          ctx.fill();

          const tg = ctx.createLinearGradient(tx, y, tx, y + this.cellSize);
          tg.addColorStop(0, '#F5F5DC');
          tg.addColorStop(1, '#D2B48C');
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.moveTo(tx, y + 8 + pulse);
          ctx.lineTo(x + this.cellSize - 5, y + this.cellSize - 5);
          ctx.lineTo(x + 5, y + this.cellSize - 5);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#8B4513';
          ctx.fillRect(tx - 4, y + this.cellSize - 15, 8, 10);
        }

        // 网格线
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, this.cellSize, this.cellSize);
      }
    }
  }

  drawBottomBar() {
    this._undoBtn = { x: this.width - 90, y: this.height - 55, w: 75, h: 40 };
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    roundRect(ctx, this._undoBtn.x, this._undoBtn.y, this._undoBtn.w, this._undoBtn.h, 20);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('↩️ 撤销', this._undoBtn.x + this._undoBtn.w / 2, this._undoBtn.y + this._undoBtn.h / 2 + 5);
  }

  drawVictory() {
    if (!this._nextBtn || !this._backBtn) {
      this.showBackButton();
    }
    this.confetti.draw();
    if (this._newAchievements && this._newAchievements.length > 0) {
      this._drawAchievementPopup();
    }
  }

  showBackButton() {
    const ctx = this.ctx;
    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#1E2A4A';
    ctx.beginPath();
    roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#6BCB77';
    ctx.font = 'bold 22px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 恭喜通关！', this.width / 2, panelY + 50);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '15px -apple-system';
    ctx.fillText('关卡 ' + this.level, this.width / 2, panelY + 80);

    const btnW = 180, btnH = 42;
    const btnX = (this.width - btnW) / 2;

    ctx.fillStyle = '#6BCB77';
    ctx.beginPath();
    roundRect(ctx, btnX, panelY + 100, btnW, btnH, 21);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px -apple-system';
    ctx.fillText('下一关', btnX + btnW / 2, panelY + 100 + btnH / 2 + 6);
    this._nextBtn = { x: btnX, y: panelY + 100, w: btnW, h: btnH };

    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    roundRect(ctx, btnX, panelY + 152, btnW, btnH, 21);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '15px -apple-system';
    ctx.fillText('返回选关', btnX + btnW / 2, panelY + 152 + btnH / 2 + 6);
    this._backBtn = { x: btnX, y: panelY + 152, w: btnW, h: btnH };
  }

  _drawAchievementPopup() {
    // 简化：直接标记已读，不弹窗
    this._newAchievements = null;
  }

  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName;
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      if (this.level >= progress.unlocked) {
        progress.unlocked = this.level + 1;
      }
      if (!progress.stars[this.level]) {
        progress.stars[this.level] = 1;
      }
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {
      console.log('[Tents] 保存进度失败', e);
    }
  }

  destroy() {
    if (this.clickHandler) {
      this.canvas.removeEventListener('click', this.clickHandler);
    }
  }
}

module.exports = Tents;
