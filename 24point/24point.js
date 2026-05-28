/**
 * ============================================================
 * 24点速算 - 微信小游戏版
 * ============================================================
 *
 * 所属分包：24point（独立分包，与主 games 分包分离）
 *
 * 【游戏规则】使用4个数字，通过 + - × ÷ 和括号运算，结果等于24即为通关。
 * 【数据来源】优先CDN题库（24小时缓存），失败则使用本地题库兜底。
 */

// ---- 依赖（跨分包引用，games 分包必须先加载） ----
const LevelLoader = require('../games/level-loader');
const statsManager = require('../games/stats-manager.js').getInstance();
const sound = require('../games/sound-manager');
const TutorialOverlay = require('../games/tutorial-overlay');
const Confetti = require('../games/confetti');
const roundRect = require('../utils/round-rect.js');
const { AchievementManager } = require('../games/achievement-manager');
const { ShareCard } = require('../games/share-card');
const { getInstance: getRewardManager } = require('../games/reward-manager');
const VictoryPanel = require('../games/components/victory-panel');
const HeaderBar = require('../games/components/header-bar');
const BottomBar = require('../games/components/bottom-bar');

// ---- 同分包内的模块 ----
const core = require('./24point-core.js');
const renderer = require('./24point-renderer.js');

const {
  CDN_BASE, QUESTION_KEY, QUESTION_TIMESTAMP_KEY, CACHE_EXPIRE, STATS_KEY,
  DIFFICULTY_CONFIG, HINT_TEMPLATES, localQuestionBank,
  safeEval, solve24, extractNumbers
} = core;

// ========== TwentyFourPoint 主类 ==========
class TwentyFourPoint {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    // ---- 画布基础信息 ----
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    // ---- 游戏基本信息 ----
    this.gameName = '24point';
    this.level = level;
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;

    // ---- 核心游戏状态 ----
    this.numbers = [1, 2, 3, 4];
    this.expression = '';
    this.showResult = false;
    this.isCorrect = false;
    this.resultMessage = '';
    this.animationTime = 0;
    this.victory = false;
    this.solutions = [];

    // ---- 提示系统 ----
    this.showingHint = false;
    this.currentHint = '';
    this.hintIndex = 0;

    // ---- 题库 ----
    this._questionBank = null;
    this._questionBankLoading = false;
    this.currentQuestion = null;

    // ---- 统计 ----
    this.stats = this.loadStats();
    this.gameHistory = this.stats.gameHistory || [];

    // ---- 特效 & UI 组件 ----
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = AchievementManager.getInstance();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);

    // ---- 界面组件 ----
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight, {
      bgColor:'#1a1a2e', textColor:'#fff', infoColor:'rgba(255,255,255,0.6)',
      backColor:'rgba(255,255,255,0.12)', height:44
    });
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });

    this.initQuestionBank();
    this.bindEvents();
  }

  // ========== 题库初始化 ==========

  initQuestionBank() {
    this._questionBankLoading = true;
    this.loadQuestionBank().then(() => {
      this._questionBankLoading = false;
      this.generateNewGame();
    }).catch(() => {
      this._questionBankLoading = false;
      this._questionBank = localQuestionBank;
      this.generateNewGame();
    });
  }

  async loadQuestionBank() {
    const cached = wx.getStorageSync(QUESTION_KEY);
    const timestamp = wx.getStorageSync(QUESTION_TIMESTAMP_KEY);
    const now = Date.now();
    if (cached && timestamp && (now - timestamp < CACHE_EXPIRE)) {
      console.log('[24point] 使用缓存题目');
      this._questionBank = cached;
      return cached;
    }

    console.log('[24point] 从CDN加载题目');
    try {
      const data = await LevelLoader.fetchFromCDN(`${CDN_BASE}/24point-questions.json`);
      if (data && data.questions) {
        this._questionBank = data.questions;
        wx.setStorageSync(QUESTION_KEY, data.questions);
        wx.setStorageSync(QUESTION_TIMESTAMP_KEY, now);
        console.log('[24point] CDN题目加载成功', data.questions.length);
        return data.questions;
      }
    } catch (e) {
      console.warn('[24point] CDN加载失败，使用本地数据');
    }

    this._questionBank = localQuestionBank;
    return localQuestionBank;
  }

  // ========== 游戏生成 ==========

  generateNewGame() {
    if (this._questionBankLoading) {
      setTimeout(() => this.generateNewGame(), 300);
      return;
    }

    let candidates = [];
    if (this._questionBank) {
      candidates = this._questionBank.filter(q =>
        q.difficulty === this.difficulty || !q.difficulty
      );
    }

    if (!candidates || candidates.length === 0) {
      candidates = localQuestionBank;
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    this.currentQuestion = candidates[randomIndex];

    this.numbers = [...this.currentQuestion.numbers].sort(() => Math.random() - 0.5);
    this.solutions = this.currentQuestion.solutions || [];

    this.expression = '';
    this.showResult = false;
    this.victory = false;
    this.isCorrect = false;
    this.resultMessage = '';
    this.showingHint = false;
    this.hintIndex = 0;

    this.draw();
  }

  // ========== 答案检查 ==========

  checkAnswer() {
    if (!this.expression) { this.showToast('请输入算式'); return; }

    try {
      const usedNumbers = extractNumbers(this.expression);
      const sortedUsed = usedNumbers.sort();
      const sortedOriginal = [...this.numbers].sort();

      if (JSON.stringify(sortedUsed) !== JSON.stringify(sortedOriginal)) {
        this.showResult = true;
        this.isCorrect = false;
        this.resultMessage = '请确保使用了所有数字，每个只用一次';
        this.draw();
        return;
      }

      let calcExpression = this.expression.replace(/×/g, '*').replace(/÷/g, '/');
      const result = safeEval(calcExpression);

      if (Math.abs(result - 24) < 0.000001) {
        this.onCorrectAnswer();
      } else {
        this.showResult = true;
        this.isCorrect = false;
        this.resultMessage = `结果为 ${result.toFixed(2)}，再试试！`;
        sound.play('wrong');
      }

      this.addToHistory(this.numbers, Math.abs(result - 24) < 0.000001);
      this.draw();
    } catch (error) {
      this.showResult = true;
      this.isCorrect = false;
      this.resultMessage = '表达式有误，请检查';
      sound.play('wrong');
      this.draw();
    }
  }

  onCorrectAnswer() {
    this.victory = true;
    this.isCorrect = true;
    this.showResult = true;
    this.resultMessage = '🎉 太棒了！';
    this.confetti.start();
    sound.play('victory');

    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty, level: this.level, time: 0
    });
    rewardMgr.showRewardToast(rewardResult);

    this.updateStats(true);

    let winCount = this.stats.correctAnswers || 0;
    this._newAchievements = this.achievement.check(this.gameName, winCount);

    statsManager.endGame(true);
  }

  // ========== 统计 & 历史 ==========

  addToHistory(numbers, solved) {
    this.gameHistory.unshift({ numbers:[...numbers], solved, timestamp:Date.now() });
    if (this.gameHistory.length > 20) this.gameHistory = this.gameHistory.slice(0, 20);
    this.saveStats();
  }

  updateStats(correct) {
    this.stats.gamesPlayed = (this.stats.gamesPlayed || 0) + 1;
    this.stats.correctAnswers = correct
      ? (this.stats.correctAnswers || 0) + 1
      : (this.stats.correctAnswers || 0);
    this.stats.accuracy = Math.round((this.stats.correctAnswers / this.stats.gamesPlayed) * 100);
    this.stats.gameHistory = this.gameHistory;
    this.saveStats();
  }

  loadStats() {
    try {
      const saved = wx.getStorageSync(STATS_KEY);
      if (saved) return saved;
    } catch (e) {}
    return { gamesPlayed:0, correctAnswers:0, accuracy:0, gameHistory:[] };
  }

  saveStats() {
    try { wx.setStorageSync(STATS_KEY, this.stats); } catch (e) {}
  }

  // ========== 提示 & 答案 ==========

  showHint() {
    if (this.showingHint) {
      this.hintIndex = (this.hintIndex + 1) % HINT_TEMPLATES.length;
    }
    this.showingHint = true;
    this.currentHint = HINT_TEMPLATES[this.hintIndex];
    this.draw();
  }

  closeHint() { this.showingHint = false; this.draw(); }

  showSolution() {
    if (this.solutions && this.solutions.length > 0) {
      this.expression = this.solutions[0].expression;
    } else {
      this.showToast('暂无答案');
    }
    this.draw();
  }

  showToast(message) {
    this.showResult = true;
    this.isCorrect = false;
    this.resultMessage = message;
    setTimeout(() => {
      this.showResult = false;
      this.resultMessage = '';
      this.draw();
    }, 2000);
    this.draw();
  }

  // ========== 事件处理 ==========

  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      // 1. 教程遮罩
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss(); this.draw(); return;
      }

      // 2. 关闭提示
      if (this.showingHint) { this.closeHint(); return; }

      // 3. 胜利状态
      if (this.victory) {
        const result = this.victoryPanel.handleClick(x, y);
        if (result === 'next') {
          sound.play('click');
          this.level++;
          this.generateNewGame();
          this.victoryPanel.reset();
          return;
        }
        if (result === 'back') { sound.play('click'); this.switchGame('menu'); return; }
        return;
      }

      // 4. 返回按钮
      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click'); this.switchGame('menu'); return;
      }

      // 5. 底部操作栏
      const bottomAction = this.bottomBar.handleClick(x, y);
      if (bottomAction) { this._handleBottomAction(bottomAction); return; }

      // 6. 错误提示：点击关闭
      if (this.showResult && !this.isCorrect && !this.victory) {
        this.showResult = false;
      }
      if (this.showResult && this.isCorrect) return;

      // 7. 游戏区域
      this._handleGameClick(x, y);
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _contentStartY() {
    return this.headerBar ? this.headerBar.boardStartY : this.statusBarHeight + 80;
  }

  _handleGameClick(x, y) {
    // 数字卡
    const cardY = this._contentStartY() + 40;
    const cardW = Math.min(70, this.width * 0.18);
    const cardH = cardW;
    const gap = 15;
    const totalCardWidth = cardW * 4 + gap * 3;
    const startX = (this.width - totalCardWidth) / 2;

    for (let i = 0; i < 4; i++) {
      const cardX = startX + i * (cardW + gap);
      if (x > cardX && x < cardX + cardW && y > cardY && y < cardY + cardH) {
        this.expression += this.numbers[i];
        sound.play('click'); this.draw(); return;
      }
    }

    // 运算符
    const opY = cardY + cardH + 40;
    const ops = ['+', '-', '×', '÷', '(', ')'];
    const opW = Math.min(50, this.width * 0.13);
    const opH = opW * 0.8;
    const opStartX = (this.width - (opW * 6 + gap * 5)) / 2;

    for (let i = 0; i < 6; i++) {
      const opX = opStartX + i * (opW + gap);
      if (x > opX && x < opX + opW && y > opY && y < opY + opH) {
        this.expression += ops[i];
        sound.play('click'); this.draw(); return;
      }
    }

    // 清除 / 检查
    const btnY = this._contentStartY() + 40 + cardH + 40 + opH + 40 + 50 + 30;
    const btnH = 45;
    const btnW = Math.min(60, this.width * 0.15);
    const btnGap = 20;
    const btnStartX = (this.width - (btnW * 2 + btnGap)) / 2;

    const clearX = btnStartX;
    if (x > clearX && x < clearX + btnW && y > btnY && y < btnY + btnH) {
      this.expression = ''; sound.play('click'); this.draw(); return;
    }

    const checkX = btnStartX + btnW + btnGap;
    if (x > checkX && x < checkX + btnW && y > btnY && y < btnY + btnH) {
      this.checkAnswer(); return;
    }
  }

  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.expression.length > 0) {
          this.expression = this.expression.slice(0, -1);
          sound.play('click'); this.draw();
        }
        break;
      case 'restart':
        this.generateNewGame(); sound.play('click'); break;
      case 'hint':
        this.showHint(); break;
      case 'answer':
        this.showSolution(); break;
      case 'rule':
        sound.play('click'); this.tutorial.show(); this.draw(); break;
    }
  }

  // ========== 渲染循环 ==========

  update() { this.animationTime += 0.08; }

  draw() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);

    renderer.drawBackground(this.ctx, this.width, this.height, this.config);
    this.headerBar.draw({ title:'24点' });
    renderer.drawStatusInfo(this.ctx, this.width, this._contentStartY(), this.config, this.level, this.stats);
    renderer.drawNumberCards(this.ctx, this.width, this._contentStartY(), this.numbers, this.config, this.animationTime);
    renderer.drawOperators(this.ctx, this.width, this._contentStartY());
    renderer.drawExpression(this.ctx, this.width, this._contentStartY(), this.expression);
    renderer.drawActionButtons(this.ctx, this.width, this._contentStartY());

    this.bottomBar.setButtons([
      { id:'undo', text:'退格' },
      { id:'restart', text:'新题' },
      { id:'hint', text:'提示' },
      { id:'answer', text:'答案' }
    ]);
    this.bottomBar.draw();

    if (this.showResult) renderer.drawResult(this.ctx, this.width, this._contentStartY(), this.isCorrect, this.resultMessage);
    if (this.showingHint) renderer.drawHint(this.ctx, this.width, this.height, this.currentHint);
    if (this.victory) {
      this.victoryPanel.setSubtitle(`第 ${this.level} 关`);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
    if (this.tutorial && this.tutorial.shouldShow()) this.tutorial.draw();
  }

  // ========== 生命周期 ==========

  destroy() { this.canvas.removeEventListener('click', this.clickHandler); }

  _drawAchievementPopup() { this._newAchievements = null; }

  saveGameProgress() {
    try {
      const key = 'progress_' + this.gameName + '_' + (this.difficulty || 'easy');
      const saved = wx.getStorageSync(key);
      let progress = saved ? JSON.parse(saved) : { unlocked:1, stars:{} };
      if (this.level >= progress.unlocked) progress.unlocked = this.level + 1;
      if (!progress.stars[this.level]) progress.stars[this.level] = 1;
      wx.setStorageSync(key, JSON.stringify(progress));
    } catch (e) {}
  }
}

module.exports = TwentyFourPoint;
