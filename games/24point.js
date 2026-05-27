/**
 * 24点速算 - 小游戏版
 * 核心理念：数学思维训练 + 渐进式挑战 + 成就感
 * 
 * 优化内容：
 * 1. 渐进式难度系统（简单/中等/困难）
 * 2. CDN 题目库支持（海量题目）
 * 3. 智能提示系统（逐步引导）
 * 4. 完整统计系统
 * 5. 成就系统
 * 6. 更好的UI体验
 */
const LevelLoader = require('./level-loader');
const statsManager = require('./stats-manager.js').getInstance();
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const Confetti = require('./confetti');
const roundRect = require('../utils/round-rect.js');
const { AchievementManager } = require('./achievement-manager');
const { ShareCard } = require('./share-card');
const { getInstance: getRewardManager } = require('./reward-manager');
const VictoryPanel = require('./components/victory-panel');
const HeaderBar = require('./components/header-bar');
const BottomBar = require('./components/bottom-bar');

// CDN 数据源地址
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data';
const QUESTION_KEY = 'cdn_24point_questions';
const QUESTION_TIMESTAMP_KEY = 'cdn_24point_questions_ts';
const CACHE_EXPIRE = 24 * 60 * 60 * 1000; // 24小时缓存
const STATS_KEY = '24point_stats';

// 难度配置
const DIFFICULTY_CONFIG = {
  easy: {
    name: '简单',
    description: '适合初学者',
    baseReward: 2,
    colors: ['#4CAF50', '#8BC34A']
  },
  medium: {
    name: '中等',
    description: '有一定挑战性',
    baseReward: 3,
    colors: ['#FF9800', '#FFB74D']
  },
  hard: {
    name: '困难',
    description: '真正的挑战',
    baseReward: 5,
    colors: ['#F44336', '#E57373']
  }
};

// 智能提示词库
const HINT_TEMPLATES = [
  "尝试先看看能不能组合出 3 和 8",
  "试试组合出 4 和 6，或者 2 和 12",
  "不要忽视括号的作用",
  "分数运算有时能得到意想不到的结果",
  "先把两个数字相加或相减看看",
  "记住：每个数字只能用一次！",
  "试试用除法创造分数",
  "有没有可能先用乘法凑出接近24的数",
  "减法也可以创造有用的中间值"
];

// 本地备用题库
const localQuestionBank = [
  { numbers: [1, 2, 3, 4], difficulty: 'easy', solutions: [
    { expression: "(1+2+3)×4", description: "先相加得6，再乘以4" },
    { expression: "(1×2×3)×4", description: "连乘得到24" }
  ]},
  { numbers: [2, 3, 4, 6], difficulty: 'easy', solutions: [
    { expression: "6×4×(3-2)", description: "利用差值简化计算" },
    { expression: "(6-3)×2×4", description: "先做减法得到3" }
  ]},
  { numbers: [3, 3, 8, 8], difficulty: 'hard', solutions: [
    { expression: "8÷(3-8÷3)", description: "经典的分式解法" }
  ]},
  { numbers: [1, 3, 5, 7], difficulty: 'medium', solutions: [
    { expression: "(7-3)×(1+5)", description: "分组计算得到4和6" }
  ]},
  { numbers: [4, 4, 10, 10], difficulty: 'hard', solutions: [
    { expression: "(10×10-4)÷4", description: "利用平方差公式思路" }
  ]},
  { numbers: [5, 5, 5, 1], difficulty: 'medium', solutions: [
    { expression: "(5-1÷5)×5", description: "分数运算的经典例子" }
  ]},
  { numbers: [6, 6, 8, 8], difficulty: 'medium', solutions: [
    { expression: "(6÷(8-6))×8", description: "先做减法，再除法，最后乘法" },
    { expression: "(8÷(8-6))×6", description: "另一种顺序" }
  ]},
  { numbers: [1, 1, 1, 8], difficulty: 'easy', solutions: [
    { expression: "(1+1+1)×8", description: "三个1相加得3" }
  ]},
  { numbers: [2, 2, 2, 3], difficulty: 'easy', solutions: [
    { expression: "(2+2+2)×3", description: "三个2相加得6" }
  ]}
];

class TwentyFourPoint {
  constructor(ctx, canvas, systemInfo, switchGame, level, difficulty = 'easy') {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.gameName = '24point';
    this.level = level;
    this.difficulty = difficulty;
    this.config = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.easy;
    
    this.numbers = [1, 2, 3, 4];
    this.expression = '';
    this.showResult = false;
    this.isCorrect = false;
    this.resultMessage = '';
    this.animationTime = 0;
    this.victory = false;
    this.solutions = [];
    
    this.showingHint = false;
    this.currentHint = '';
    this.hintIndex = 0;
    
    this.questionBank = null;
    this.currentQuestion = null;
    
    this.stats = this.loadStats();
    this.gameHistory = this.stats.gameHistory || [];
    
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    
    this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
    this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
    this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height, {
      onConfettiDraw: () => this.confetti.draw(),
      onAchievementDraw: () => this._drawAchievementPopup()
    });
    
    this._questionBank = null;
    this._questionBankLoading = false;
    
    this.initQuestionBank();
    
    this.bindEvents();
  }
  
  // 初始化题目库
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
  
  // 从CDN加载题目库
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
  
  // 生成新游戏
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
      candidates = localQuestionBank.filter(q => 
        q.difficulty === this.difficulty || !q.difficulty
      );
    }
    
    if (candidates.length === 0) {
      candidates = localQuestionBank;
    }
    
    const randomIndex = Math.floor(Math.random() * candidates.length);
    this.currentQuestion = candidates[randomIndex];
    
    const shuffledNumbers = [...this.currentQuestion.numbers].sort(() => Math.random() - 0.5);
    this.numbers = shuffledNumbers;
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
  
  // 24点求解算法
  solve24(numbers) {
    if (numbers.length !== 4) return [];
    
    const solutions = [];
    const ops = ['+', '-', '*', '/'];
    
    const solve = (nums, exprs) => {
      if (nums.length === 1) {
        if (Math.abs(nums[0] - 24) < 0.000001) {
          solutions.push(exprs[0]);
        }
        return;
      }
      
      for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
          const a = nums[i], b = nums[j];
          const aExpr = exprs[i], bExpr = exprs[j];
          
          const remainingNums = [];
          const remainingExprs = [];
          for (let k = 0; k < nums.length; k++) {
            if (k !== i && k !== j) {
              remainingNums.push(nums[k]);
              remainingExprs.push(exprs[k]);
            }
          }
          
          for (const op of ops) {
            if ((op === '+' || op === '*') && i > j) continue;
            
            let newVal, newExpr;
            switch (op) {
              case '+':
                newVal = a + b;
                newExpr = `(${aExpr}+${bExpr})`;
                solve([newVal, ...remainingNums], [newExpr, ...remainingExprs]);
                break;
              case '-':
                newVal = a - b;
                newExpr = `(${aExpr}-${bExpr})`;
                solve([newVal, ...remainingNums], [newExpr, ...remainingExprs]);
                newVal = b - a;
                newExpr = `(${bExpr}-${aExpr})`;
                solve([newVal, ...remainingNums], [newExpr, ...remainingExprs]);
                break;
              case '*':
                newVal = a * b;
                newExpr = `(${aExpr}×${bExpr})`;
                solve([newVal, ...remainingNums], [newExpr, ...remainingExprs]);
                break;
              case '/':
                if (Math.abs(b) > 0.000001) {
                  newVal = a / b;
                  newExpr = `(${aExpr}÷${bExpr})`;
                  solve([newVal, ...remainingNums], [newExpr, ...remainingExprs]);
                }
                if (Math.abs(a) > 0.000001) {
                  newVal = b / a;
                  newExpr = `(${bExpr}÷${aExpr})`;
                  solve([newVal, ...remainingNums], [newExpr, ...remainingExprs]);
                }
                break;
            }
          }
        }
      }
    };
    
    solve(numbers, numbers.map(n => n.toString()));
    
    const uniqueSolutions = [];
    const seen = new Set();
    
    for (const expr of solutions) {
      let normalized = expr.replace(/\*/g, '×').replace(/\//g, '÷');
      
      try {
        let calcExpression = normalized.replace(/×/g, '*').replace(/÷/g, '/');
        const result = this.safeEval(calcExpression);
        if (Math.abs(result - 24) < 0.000001) {
          if (!seen.has(normalized)) {
            seen.add(normalized);
            uniqueSolutions.push({ expression: normalized, description: '' });
          }
        }
      } catch (e) {}
    }
    
    return uniqueSolutions.slice(0, 10);
  }
  
  // 安全表达式求值
  safeEval(expression) {
    let expr = expression.replace(/\s+/g, '');
    const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
    const values = [];
    const ops = [];
    
    const applyOp = (a, b, op) => {
      switch (op) {
        case '+': return a + b;
        case '-': return a - b;
        case '*': return a * b;
        case '/': 
          if (Math.abs(b) < 0.000001) throw new Error('除零错误');
          return a / b;
        default: throw new Error(`未知运算符 ${op}`);
      }
    };
    
    const processTopOp = () => {
      if (ops.length < 1 || values.length < 2) return;
      const b = values.pop();
      const a = values.pop();
      const op = ops.pop();
      values.push(applyOp(a, b, op));
    };
    
    let i = 0;
    while (i < expr.length) {
      if (expr[i] >= '0' && expr[i] <= '9') {
        let num = '';
        while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
          num += expr[i];
          i++;
        }
        values.push(parseFloat(num));
        continue;
      }
      
      if (expr[i] === '(') {
        ops.push('(');
        i++;
        continue;
      }
      
      if (expr[i] === ')') {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') {
          processTopOp();
        }
        if (ops.length === 0) throw new Error('括号不匹配');
        ops.pop();
        i++;
        continue;
      }
      
      if (['+', '-', '*', '/'].includes(expr[i])) {
        if (expr[i] === '-' && (i === 0 || expr[i-1] === '(' || ['+', '-', '*', '/'].includes(expr[i-1]))) {
          i++;
          if (expr[i] >= '0' && expr[i] <= '9') {
            let num = '-';
            while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
              num += expr[i];
              i++;
            }
            values.push(parseFloat(num));
          }
          continue;
        }
        
        while (ops.length > 0 && ops[ops.length - 1] !== '(' && 
               precedence[ops[ops.length - 1]] >= precedence[expr[i]]) {
          processTopOp();
        }
        ops.push(expr[i]);
        i++;
        continue;
      }
      
      throw new Error(`无效字符: ${expr[i]}`);
    }
    
    while (ops.length > 0) {
      if (ops[ops.length - 1] === '(') throw new Error('括号不匹配');
      processTopOp();
    }
    
    if (values.length !== 1) throw new Error('表达式无结果');
    return values[0];
  }
  
  // 检查答案
  checkAnswer() {
    if (!this.expression) {
      this.showToast('请输入算式');
      return;
    }
    
    try {
      const usedNumbers = this.extractNumbers(this.expression);
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
      const result = this.safeEval(calcExpression);
      
      if (Math.abs(result - 24) < 0.000001) {
        this.onCorrectAnswer();
      } else {
        this.showResult = true;
        this.isCorrect = false;
        this.resultMessage = `结果为 ${result}，再试试！`;
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
  
  // 处理正确答案
  onCorrectAnswer() {
    this.victory = true;
    this.isCorrect = true;
    this.showResult = true;
    this.resultMessage = '🎉 太棒了！';
    this.confetti.start();
    sound.play('victory');
    
    const rewardMgr = getRewardManager();
    const rewardResult = rewardMgr.processVictory(this.gameName, {
      difficulty: this.difficulty,
      level: this.level,
      time: 0
    });
    rewardMgr.showRewardToast(rewardResult);
    
    this.updateStats(true);
    
    let winCount = this.stats.correctAnswers || 0;
    const newlyAchieved = this.achievement.check(this.gameName, winCount);
    this._newAchievements = newlyAchieved;
    
    statsManager.endGame(true);
  }
  
  // 从表达式中提取数字
  extractNumbers(expr) {
    const matches = expr.match(/\d+/g);
    return matches ? matches.map(n => parseInt(n)) : [];
  }
  
  // 添加到历史记录
  addToHistory(numbers, solved) {
    const historyItem = {
      numbers: [...numbers],
      solved,
      timestamp: Date.now()
    };
    
    this.gameHistory.unshift(historyItem);
    if (this.gameHistory.length > 20) {
      this.gameHistory = this.gameHistory.slice(0, 20);
    }
    
    this.saveStats();
  }
  
  // 更新统计
  updateStats(correct) {
    this.stats.gamesPlayed = (this.stats.gamesPlayed || 0) + 1;
    this.stats.correctAnswers = correct ? (this.stats.correctAnswers || 0) + 1 : (this.stats.correctAnswers || 0);
    this.stats.accuracy = Math.round((this.stats.correctAnswers / this.stats.gamesPlayed) * 100);
    this.stats.gameHistory = this.gameHistory;
    
    this.saveStats();
  }
  
  // 加载统计
  loadStats() {
    try {
      const saved = wx.getStorageSync(STATS_KEY);
      if (saved) {
        return saved;
      }
    } catch (e) {}
    return { gamesPlayed: 0, correctAnswers: 0, accuracy: 0, gameHistory: [] };
  }
  
  // 保存统计
  saveStats() {
    try {
      wx.setStorageSync(STATS_KEY, this.stats);
    } catch (e) {}
  }
  
  // 显示提示
  showHint() {
    if (this.showingHint) {
      this.hintIndex = (this.hintIndex + 1) % HINT_TEMPLATES.length;
    }
    this.showingHint = true;
    this.currentHint = HINT_TEMPLATES[this.hintIndex];
    this.draw();
  }
  
  // 关闭提示
  closeHint() {
    this.showingHint = false;
    this.draw();
  }
  
  // 显示答案
  showSolution() {
    if (this.solutions && this.solutions.length > 0) {
      this.expression = this.solutions[0].expression;
    } else {
      this.showToast('暂无答案');
    }
    this.draw();
  }
  
  // 显示提示
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
  
  // 绑定事件
  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;
      
      if (this.tutorial && this.tutorial.shouldShow() && this.tutorial.hitTest(x, y)) {
        this.tutorial.dismiss();
        this.draw();
        return;
      }
      
      if (this.showingHint) {
        this.closeHint();
        return;
      }
      
      if (this.victory) {
        if (this.victoryPanel.handleClick(x, y)) return;
        return;
      }
      
      if (this.headerBar.isBackButton(x, y)) {
        sound.play('click');
        this.switchGame('menu');
        return;
      }
      
      const bottomAction = this.bottomBar.handleClick(x, y);
      if (bottomAction) {
        this._handleBottomAction(bottomAction);
        return;
      }

      // 错误结果遮罩：点击游戏区域先关闭遮罩
      if (this.showResult && !this.isCorrect && !this.victory) {
        this.showResult = false;
        this.draw();
        return;
      }
      
      if (this.showResult && this.isCorrect) {
        return;
      }
      
      this._handleGameClick(x, y);
    };
    
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  // 处理游戏区域点击
  _handleGameClick(x, y) {
    const cardY = this.statusBarHeight + 100;
    const cardW = Math.min(70, this.width * 0.18);
    const cardH = cardW;
    const gap = 15;
    const startX = (this.width - (cardW * 4 + gap * 3)) / 2;
    
    for (let i = 0; i < 4; i++) {
      const cardX = startX + i * (cardW + gap);
      if (x > cardX && x < cardX + cardW && y > cardY && y < cardY + cardH) {
        this.expression += this.numbers[i];
        sound.play('click');
        this.draw();
        return;
      }
    }
    
    const opY = cardY + cardH + 40;
    const ops = ['+', '-', '×', '÷', '(', ')'];
    const opW = Math.min(50, this.width * 0.13);
    const opH = opW * 0.8;
    const opStartX = (this.width - (opW * 6 + gap * 5)) / 2;
    
    for (let i = 0; i < 6; i++) {
      const opX = opStartX + i * (opW + gap);
      if (x > opX && x < opX + opW && y > opY && y < opY + opH) {
        this.expression += ops[i];
        sound.play('click');
        this.draw();
        return;
      }
    }
    
    const btnY = opY + opH + 30;
    const btnH = 45;
    const btnW = Math.min(60, this.width * 0.15);
    const btnGap = 20;
    const btnStartX = (this.width - (btnW * 2 + btnGap)) / 2;
    
    const clearX = btnStartX;
    if (x > clearX && x < clearX + btnW && y > btnY && y < btnY + btnH) {
      this.expression = '';
      sound.play('click');
      this.draw();
      return;
    }
    
    const checkX = btnStartX + btnW + btnGap;
    if (x > checkX && x < checkX + btnW && y > btnY && y < btnY + btnH) {
      // 如果已有错误结果遮罩，先关闭它让用户修改表达式
      if (this.showResult && !this.isCorrect) {
        this.showResult = false;
        sound.play('click');
        this.draw();
        return;
      }
      this.checkAnswer();
      return;
    }
  }
  
  // 处理底部栏操作
  _handleBottomAction(action) {
    switch (action) {
      case 'undo':
        if (this.expression.length > 0) {
          this.expression = this.expression.slice(0, -1);
          sound.play('click');
          this.draw();
        }
        break;
      case 'restart':
        this.generateNewGame();
        sound.play('click');
        break;
      case 'hint':
        this.showHint();
        break;
      case 'answer':
        this.showSolution();
        break;
      case 'rule':
        sound.play('click');
        this.tutorial.show();
        this.draw();
        break;
    }
  }
  
  update() {
    this.animationTime += 0.08;
  }
  
  _drawStatus() {
    const ctx = this.ctx;
    const y = this.statusBarHeight + 55;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '13px Arial, -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.config.name} · 第${this.level}关 · ${this.stats.gamesPlayed || 0}题 · ${this.stats.accuracy || 0}%正确率`, this.width / 2, y);
    ctx.textAlign = 'left';
  }

  draw() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.drawBackground();
    
    this.headerBar.draw({
      title: '24点速算'
    });
    
    // 状态信息
    this._drawStatus();
    
    this.drawNumberCards();
    this.drawOperators();
    this.drawExpression();
    this.drawActionButtons();
    
    this.headerBar.draw({
      title: '24点速算'
    });
    
    this.bottomBar.setButtons([
      { id: 'undo', text: '退格' },
      { id: 'restart', text: '新题' },
      { id: 'hint', text: '提示' },
      { id: 'answer', text: '答案' }
    ]);
    this.bottomBar.draw();
    
    if (this.showResult) {
      this.drawResult();
    }
    
    if (this.showingHint) {
      this.drawHint();
    }
    
    if (this.victory) {
      this.victoryPanel.setSubtitle(`第 ${this.level} 关`);
      this.victoryPanel.setAchievements(this._newAchievements);
      this.victoryPanel.draw();
    }
    
    if (this.tutorial && this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }
  
  drawBackground() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, this.config.colors[0] + '15');
    gradient.addColorStop(1, this.config.colors[1] + '10');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }
  
  drawStats() {
    const statsY = this.statusBarHeight + 60;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    const statsText = `已完成 ${this.stats.gamesPlayed || 0} 题 · 正确率 ${this.stats.accuracy || 0}%`;
    this.ctx.fillText(statsText, this.width / 2, statsY);
  }
  
  drawNumberCards() {
    const cardW = Math.min(70, this.width * 0.18);
    const cardH = cardW;
    const gap = 15;
    const startX = (this.width - (cardW * 4 + gap * 3)) / 2;
    const startY = this.statusBarHeight + 100;
    
    for (let i = 0; i < 4; i++) {
      const x = startX + i * (cardW + gap);
      const y = startY + Math.sin(this.animationTime + i * 0.8) * 3;
      
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.beginPath();
      roundRect(this.ctx, x + 2, y + 4, cardW, cardH, 12);
      this.ctx.fill();
      
      const gradient = this.ctx.createLinearGradient(x, y, x, y + cardH);
      gradient.addColorStop(0, this.config.colors[0]);
      gradient.addColorStop(1, this.config.colors[1]);
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      roundRect(this.ctx, x, y, cardW, cardH, 12);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${cardW * 0.5}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.numbers[i], x + cardW / 2, y + cardH / 2);
    }
  }
  
  drawOperators() {
    const ops = ['+', '-', '×', '÷', '(', ')'];
    const opW = Math.min(50, this.width * 0.13);
    const opH = opW * 0.8;
    const gap = 15;
    const startX = (this.width - (opW * 6 + gap * 5)) / 2;
    const startY = this.statusBarHeight + 100 + Math.min(70, this.width * 0.18) + 40;
    
    for (let i = 0; i < 6; i++) {
      const x = startX + i * (opW + gap);
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      this.ctx.beginPath();
      roundRect(this.ctx, x, startY, opW, opH, 8);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = `bold ${opW * 0.45}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(ops[i], x + opW / 2, startY + opH / 2);
    }
  }
  
  drawExpression() {
    const exprY = this.statusBarHeight + 100 + Math.min(70, this.width * 0.18) + 40 + 
                 Math.min(50, this.width * 0.13) * 0.8 + 40;
    const boxH = 50;
    const padding = 15;
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.beginPath();
    roundRect(this.ctx, padding, exprY, this.width - padding * 2, boxH, 10);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${this.width / 20}px Arial`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    
    const displayText = this.expression || '点击数字和运算符...';
    this.ctx.fillStyle = this.expression ? '#fff' : 'rgba(255, 255, 255, 0.5)';
    this.ctx.fillText(displayText, padding + 12, exprY + boxH / 2);
  }
  
  drawActionButtons() {
    const opW = Math.min(50, this.width * 0.13);
    const opH = opW * 0.8;
    const cardW = Math.min(70, this.width * 0.18);
    const btnY = this.statusBarHeight + 100 + cardW + 40 + opH + 40 + 50 + 30;
    const btnH = 45;
    const btnW = Math.min(60, this.width * 0.15);
    const btnGap = 20;
    const btnStartX = (this.width - (btnW * 2 + btnGap)) / 2;
    
    const clearX = btnStartX;
    this.ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
    this.ctx.beginPath();
    roundRect(this.ctx, clearX, btnY, btnW, btnH, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `${this.width / 25}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('清除', clearX + btnW / 2, btnY + btnH / 2);
    
    const checkX = btnStartX + btnW + btnGap;
    this.ctx.fillStyle = 'rgba(107, 203, 119, 0.3)';
    this.ctx.beginPath();
    roundRect(this.ctx, checkX, btnY, btnW, btnH, 10);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('检查', checkX + btnW / 2, btnY + btnH / 2);
  }
  
  drawResult() {
    const boxW = this.width * 0.8;
    const boxH = 120;
    const boxX = (this.width - boxW) / 2;
    const boxY = this.height / 2 - boxH / 2 - 50;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = this.isCorrect ? 'rgba(107, 203, 119, 0.95)' : 'rgba(255, 107, 107, 0.95)';
    this.ctx.beginPath();
    roundRect(this.ctx, boxX, boxY, boxW, boxH, 16);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = `bold ${this.width / 16}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.resultMessage, this.width / 2, boxY + boxH / 2 - 10);
    
    if (this.isCorrect) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      this.ctx.font = `${this.width / 30}px Arial`;
      this.ctx.fillText('点击"新题"继续挑战', this.width / 2, boxY + boxH / 2 + 25);
    }
  }
  
  drawHint() {
    const boxW = this.width * 0.85;
    const boxH = 140;
    const boxX = (this.width - boxW) / 2;
    const boxY = this.height / 2 - boxH / 2 - 30;
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.beginPath();
    roundRect(this.ctx, boxX, boxY, boxW, boxH, 16);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#FFD700';
    this.ctx.font = `${this.width / 12}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('💡', this.width / 2, boxY + 35);
    
    this.ctx.fillStyle = '#333';
    this.ctx.font = `${this.width / 25}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.wrapText(this.currentHint, this.width / 2, boxY + 50, boxW - 40, 20);
    
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.font = `${this.width / 28}px Arial`;
    this.ctx.fillText('点击任意位置关闭', this.width / 2, boxY + boxH - 25);
  }
  
  wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split('');
    let line = '';
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i];
      const metrics = this.ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && i > 0) {
        this.ctx.fillText(line, x, y);
        line = words[i];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    this.ctx.fillText(line, x, y);
  }
  
  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }
  
  _drawAchievementPopup() {
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
    } catch (e) {}
  }
}

module.exports = TwentyFourPoint;
