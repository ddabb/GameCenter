/**
 * 24点速算 - 小游戏版
 * 规则：用四个数字和加减乘除运算得到24
 */
const statsManager = require('./stats-manager.js').getInstance();
const Confetti = require('./confetti');
const sound = require('./sound-manager');
const TutorialOverlay = require('./tutorial-overlay');
const roundRect = require('../utils/round-rect.js');

class TwentyFourPoint {
  constructor(ctx, canvas, systemInfo, switchGame, level) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    
    // 安全区域适配
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    
    this.level = level;
    statsManager.startGame(this.gameName, level) || 1; // 关卡号
    
    this.numbers = [1, 2, 3, 4];
    this.expression = '';
    this.showResult = false;
    this.isCorrect = false;
    this.resultMessage = '';
    this.animationTime = 0;
    this.gameName = '24point';
    this.victory = false;
    this.confetti = new Confetti(this.ctx, this.width, this.height);
    this.achievement = new AchievementManager();
    this.tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
    
    this.generateNewGame();
    this.bindEvents();
  }
  
  // 生成新游戏
  generateNewGame() {
    // 有解的数字组合（简化版，实际应从CDN加载）
    const puzzles = [
      [1, 2, 3, 4],
      [2, 3, 4, 6],
      [1, 3, 5, 7],
      [4, 4, 10, 10],
      [3, 3, 8, 8],
      [5, 5, 5, 1],
      [6, 6, 8, 8],
      [1, 5, 5, 5],
      [2, 2, 2, 3],
      [1, 1, 8, 3]
    ];
    this.numbers = puzzles[Math.floor(Math.random() * puzzles.length)];
    // 打乱顺序
    this.numbers = this.numbers.sort(() => Math.random() - 0.5);
    this.expression = '';
    this.showResult = false;
    this.victory = false;
    this.solutions = this.solve24(this.numbers);
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
    
    // 去重
    const unique = [];
    const seen = new Set();
    for (const expr of solutions) {
      const normalized = expr.replace(/\*/g, '×').replace(/\//g, '÷');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(normalized);
      }
    }
    
    return unique.slice(0, 10);
  }
  
  // 安全求值
  safeEval(expr) {
    let e = expr.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
    const values = [];
    const ops = [];
    
    const applyOp = () => {
      if (ops.length < 1 || values.length < 2) return;
      const b = values.pop();
      const a = values.pop();
      const op = ops.pop();
      switch (op) {
        case '+': values.push(a + b); break;
        case '-': values.push(a - b); break;
        case '*': values.push(a * b); break;
        case '/': 
          if (Math.abs(b) < 0.000001) throw new Error('除零');
          values.push(a / b);
          break;
      }
    };
    
    let i = 0;
    while (i < e.length) {
      if (e[i] >= '0' && e[i] <= '9') {
        let num = '';
        while (i < e.length && ((e[i] >= '0' && e[i] <= '9') || e[i] === '.')) {
          num += e[i++];
        }
        values.push(parseFloat(num));
        continue;
      }
      if (e[i] === '(') {
        ops.push('(');
        i++;
        continue;
      }
      if (e[i] === ')') {
        while (ops.length > 0 && ops[ops.length - 1] !== '(') applyOp();
        ops.pop();
        i++;
        continue;
      }
      if (['+', '-', '*', '/'].includes(e[i])) {
        const prec = {'+': 1, '-': 1, '*': 2, '/': 2};
        while (ops.length > 0 && ops[ops.length - 1] !== '(' && 
               prec[ops[ops.length - 1]] >= prec[e[i]]) applyOp();
        ops.push(e[i]);
        i++;
        continue;
      }
      i++;
    }
    
    while (ops.length > 0) applyOp();
    return values[0];
  }
  
  // 提取表达式中的数字
  extractNumbers(expr) {
    const matches = expr.match(/\d+/g);
    return matches ? matches.map(n => parseInt(n)) : [];
  }
  
  // 检查答案
  checkAnswer() {
    if (!this.expression) {
      this.showToast('请输入算式');
      return;
    }
    
    try {
      const used = this.extractNumbers(this.expression).sort((a, b) => a - b);
      const original = [...this.numbers].sort((a, b) => a - b);
      
      if (JSON.stringify(used) !== JSON.stringify(original)) {
        this.showResult = true;
        this.isCorrect = false;
        this.resultMessage = '请确保使用了所有数字';
        return;
      }
      
      const result = this.safeEval(this.expression);
      if (Math.abs(result - 24) < 0.000001) {
        this.showResult = true;
        this.isCorrect = true;
        this.victory = true;
      this.confetti.start();
      // 成就检测
      let winCount = 0;
      try { const p = JSON.parse(wx.getStorageSync('progress_' + this.gameName) || '{}'); winCount = p.unlocked || 0; } catch(e) {}
      const newlyAchieved = this.achievement.check(this.gameName, winCount);
      this._newAchievements = newlyAchieved;
      sound.play('victory');
      this.saveGameProgress(); statsManager.endGame(true);
        this.resultMessage = '🎉 正确！';
      } else {
        this.showResult = true;
        this.isCorrect = false;
        this.resultMessage = `结果是 ${result.toFixed(2)}`;
      }
    } catch (e) {
      this.showResult = true;
      this.isCorrect = false;
      this.resultMessage = '表达式有误';
    }
  }
  
  showToast(msg) {
    this.showResult = true;
    this.isCorrect = false;
    this.resultMessage = msg;
    setTimeout(() => { this.showResult = false; }, 2000);
  }
  
  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;
      
      // 规则弹窗点击
      if (this.tutorial && this.tutorial.shouldShow()) {
        if (this.tutorial.hitTest(x, y)) {
          this.tutorial.dismiss();
          this.draw();
        }
        return; // 弹窗显示时阻止其他点击
      }
      
      // 规则按钮
      if (this._ruleBtn && x >= this._ruleBtn.x && x <= this._ruleBtn.x + this._ruleBtn.w && y >= this._ruleBtn.y && y <= this._ruleBtn.y + this._ruleBtn.h) {
        this.tutorial.show();
        this.draw();
        return;
      }
      
      // 顶部返回按钮
      if (x >= 15 && x <= 85 && y >= this.statusBarHeight + 8 && y <= this.statusBarHeight + 40) {
        sound.play('click');
        this.switchGame('level-select', this.gameName);
        return;
      }
      
      if (this.victory) {
        if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w && y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
          this.level++;
          this.victory = false;
          this._nextBtn = null;
          this._backBtn = null;
          this.confetti.stop();
          this.generateNewGame();
          return;
        }
        if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w && y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
          sound.play('click');
          this.switchGame('level-select', this.gameName);
          return;
        }
        return;
      }
      
      if (this.showResult && this.isCorrect) {
        return;
      }
      
      // 新题按钮
      if (x > this.width - 80 && y > this.height - 60) {
        this.generateNewGame();
        return;
      }
      
      // 答案按钮
      if (x > this.width / 2 - 40 && x < this.width / 2 + 40 && y > this.height - 60) {
        this.showAnswer();
        return;
      }
      
      // 数字卡片点击
      const cardY = 120;
      const cardW = 70;
      const cardH = 70;
      const gap = 15;
      const startX = (this.width - (cardW * 4 + gap * 3)) / 2;
      
      for (let i = 0; i < 4; i++) {
        const cardX = startX + i * (cardW + gap);
        if (x > cardX && x < cardX + cardW && y > cardY && y < cardY + cardH) {
          this.expression += this.numbers[i];
          return;
        }
      }
      
      // 运算符按钮
      const opY = 220;
      const ops = ['+', '-', '×', '÷', '(', ')'];
      const opW = 50;
      const opH = 45;
      const opStartX = (this.width - (opW * 6 + gap * 5)) / 2;
      
      for (let i = 0; i < 6; i++) {
        const opX = opStartX + i * (opW + gap);
        if (x > opX && x < opX + opW && y > opY && y < opY + opH) {
          this.expression += ops[i];
          return;
        }
      }
      
      // 清除按钮
      if (x > this.width / 2 - 60 && x < this.width / 2 - 10 && y > 280 && y < 320) {
        this.expression = '';
        return;
      }
      
      // 确认按钮
      if (x > this.width / 2 + 10 && x < this.width / 2 + 60 && y > 280 && y < 320) {
        this.checkAnswer();
        return;
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }
  
  showAnswer() {
    if (this.solutions.length > 0) {
      this.expression = this.solutions[0];
    } else {
      this.showToast('无解');
    }
  }
  
  update() {
    this.animationTime += 0.08;
  }
  
  draw() {
    this.drawBackground();
    this.drawHeader();
    this.drawNumberCards();
    this.drawOperators();
    this.drawExpression();
    this.drawBottomBar();
    
    // 规则按钮（右上角）
    this._ruleBtn = { x: this.width - 50, y: 20, w: 40, h: 40 };
    this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
    this.ctx.beginPath();
    roundRect(this.ctx, this._ruleBtn.x, this._ruleBtn.y, this._ruleBtn.w, this._ruleBtn.h, 20);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('?', this._ruleBtn.x + 20, this._ruleBtn.y + 28);
    
    if (this.showResult) {
      this.drawResult();
    }

    if (this.victory) {
      this.drawVictory();
    }
    
    // 规则弹窗
    if (this.tutorial.shouldShow()) {
      this.tutorial.draw();
    }
  }
  
  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
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

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold ' + (this.width / 16) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🧮 24点速算', this.width / 2, this.statusBarHeight + 40);
    
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    this.ctx.fillText('用四个数字计算出24', this.width / 2, this.statusBarHeight + 70);
    
    this.ctx.fillText('第 ' + this.level + ' 关', this.width / 2, this.statusBarHeight + 95);
  }
  
  drawNumberCards() {
    const cardW = 70;
    const cardH = 70;
    const gap = 15;
    const startX = (this.width - (cardW * 4 + gap * 3)) / 2;
    const startY = this.statusBarHeight + 120;
    
    for (let i = 0; i < 4; i++) {
      const x = startX + i * (cardW + gap);
      const pulse = Math.sin(this.animationTime + i) * 2;
      
      // 卡片阴影
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.beginPath();
      roundRect(this.ctx,x + 3, startY + 5, cardW, cardH, 10);
      this.ctx.fill();
      
      // 卡片主体
      let gradient = this.ctx.createLinearGradient(x, startY, x, startY + cardH);
      gradient.addColorStop(0, '#FF6B6B');
      gradient.addColorStop(1, '#C92A2A');
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      roundRect(this.ctx,x, startY + pulse, cardW, cardH, 10);
      this.ctx.fill();
      
      // 数字
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold ' + (cardW * 0.5) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.numbers[i], x + cardW / 2, startY + cardH / 2 + 10 + pulse);
    }
  }
  
  drawOperators() {
    const ops = ['+', '-', '×', '÷', '(', ')'];
    const opW = 50;
    const opH = 45;
    const gap = 15;
    const startX = (this.width - (opW * 6 + gap * 5)) / 2;
    const startY = this.statusBarHeight + 200;
    
    for (let i = 0; i < 6; i++) {
      const x = startX + i * (opW + gap);
      
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      roundRect(this.ctx,x, startY, opW, opH, 8);
      this.ctx.fill();
      
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold ' + (opW * 0.5) + 'px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ops[i], x + opW / 2, startY + opH / 2 + 6);
    }
  }
  
  drawExpression() {
    // 输入框背景
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    const exprY = this.statusBarHeight + 210;
    this.ctx.beginPath();
    roundRect(this.ctx,30, exprY, this.width - 60, 40, 8);
    this.ctx.fill();
    
    // 表达式文字
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 25) + 'px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(this.expression || '点击上方数字和运算符', 45, exprY + 27);
    
    // 清除和确认按钮
    const btnY = exprY;
    const btnH = 40;
    const btnW = 50;
    
    // 清除
    this.ctx.fillStyle = 'rgba(255, 107, 107, 0.3)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.width / 2 - 60, btnY, btnW, btnH, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 30) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('清', this.width / 2 - 35, btnY + 27);
    
    // 确认
    this.ctx.fillStyle = 'rgba(107, 203, 119, 0.3)';
    this.ctx.beginPath();
    roundRect(this.ctx,this.width / 2 + 10, btnY, btnW, btnH, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.fillText('✓', this.width / 2 + 35, btnY + 27);
  }
  
  drawBottomBar() {
    this.drawButton(this.width / 2 - 40, this.height - 55, 80, 40, '答案');
    this.drawButton(this.width - 85, this.height - 55, 70, 40, '新题');
  }
  
  drawButton(x, y, w, h, text) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.ctx.beginPath();
    roundRect(this.ctx,x, y, w, h, 20);
    this.ctx.fill();
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = (this.width / 32) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(text, x + w / 2, y + 26);
  }
  
  drawResult() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, this.height / 2 - 60, this.width, 120);
    
    this.ctx.fillStyle = this.isCorrect ? '#6BCB77' : '#FF6B6B';
    this.ctx.font = 'bold ' + (this.width / 14) + 'px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.resultMessage, this.width / 2, this.height / 2);
    
    if (this.isCorrect) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.font = (this.width / 30) + 'px Arial';
      this.ctx.fillText('点击继续下一题', this.width / 2, this.height / 2 + 35);
    }
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

    // 标题
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.font = 'bold 22px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('🎉 恭喜通关！', this.width / 2, panelY + 50);

    this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('关卡 ' + this.level, this.width / 2, panelY + 80);

    // 下一关按钮
    const btnW = 180, btnH = 42, btnX = (this.width - btnW) / 2;
    roundRect(this.ctx, btnX, panelY + 100, btnW, btnH, 21);
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 17px Arial';
    this.ctx.fillText('下一关', this.width / 2, panelY + 126);
    this._nextBtn = { x: btnX, y: panelY + 100, w: btnW, h: btnH };

    // 返回选关按钮
    roundRect(this.ctx, btnX, panelY + 152, btnW, btnH, 21);
    this.ctx.fillStyle = 'rgba(255,255,255,0.15)';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '15px Arial';
    this.ctx.fillText('返回选关', this.width / 2, panelY + 178);
    this._backBtn = { x: btnX, y: panelY + 152, w: btnW, h: btnH };
  }

  drawVictory() {
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
}

module.exports = TwentyFourPoint;
