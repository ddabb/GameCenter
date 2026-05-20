class TutorialLevel {
  constructor(gameName) {
    this.gameName = gameName;
    this.tutorials = this._getTutorials();
    this.currentStep = 0;
    this.completed = false;
    this._loadProgress();
  }

  _getTutorials() {
    const tutorials = {
      'akari': [
        {
          title: '💡 灯塔游戏',
          desc: '点击格子放置灯塔，照亮所有空白格',
          image: null,
          highlight: null,
          action: 'click',
          hint: '灯塔会向四个方向发射光线'
        },
        {
          title: '游戏规则',
          desc: '灯塔不能互相照亮',
          image: null,
          highlight: null,
          action: 'info',
          hint: '两个灯塔不能在同一条直线上'
        },
        {
          title: '数字提示',
          desc: '数字表示周围需要放置的灯塔数量',
          image: null,
          highlight: null,
          action: 'info',
          hint: '0=周围无灯塔，1-4=对应数量'
        },
        {
          title: '开始挑战',
          desc: '尝试放置灯塔完成关卡',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'tents': [
        {
          title: '⛺ 帐篷游戏',
          desc: '在树旁边放置帐篷',
          image: null,
          highlight: null,
          action: 'click',
          hint: '帐篷必须紧挨着树'
        },
        {
          title: '游戏规则',
          desc: '帐篷之间不能相邻',
          image: null,
          highlight: null,
          action: 'info',
          hint: '包括对角线方向'
        },
        {
          title: '行列提示',
          desc: '边上的数字表示该行/列的帐篷数',
          image: null,
          highlight: null,
          action: 'info',
          hint: '满足所有数字条件即可通关'
        },
        {
          title: '开始挑战',
          desc: '尝试放置帐篷完成关卡',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'slither-link': [
        {
          title: '🔗 数回游戏',
          desc: '连接线段形成闭合回路',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击格子边缘画线段'
        },
        {
          title: '数字规则',
          desc: '数字表示周围需要的线段数',
          image: null,
          highlight: null,
          action: 'info',
          hint: '0-3表示不同的线段数量'
        },
        {
          title: '闭合回路',
          desc: '所有线段必须连成一个大回路',
          image: null,
          highlight: null,
          action: 'info',
          hint: '不能有分支或断开的线段'
        },
        {
          title: '开始挑战',
          desc: '尝试画线段完成回路',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'one-stroke': [
        {
          title: '✏️ 一笔画游戏',
          desc: '用一笔画完所有线条',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击节点连接线段'
        },
        {
          title: '游戏规则',
          desc: '每条线只能画一次',
          image: null,
          highlight: null,
          action: 'info',
          hint: '不能重复经过同一条线'
        },
        {
          title: '起点选择',
          desc: '从任意节点开始',
          image: null,
          highlight: null,
          action: 'info',
          hint: '尝试找最合适的起点'
        },
        {
          title: '开始挑战',
          desc: '尝试一笔画完所有线条',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'sokoban': [
        {
          title: '📦 推箱子游戏',
          desc: '把箱子推到目标位置',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击方向按钮移动角色'
        },
        {
          title: '游戏规则',
          desc: '一次只能推一个箱子',
          image: null,
          highlight: null,
          action: 'info',
          hint: '不能拉箱子或推多个箱子'
        },
        {
          title: '目标位置',
          desc: '所有箱子都要推到目标点',
          image: null,
          highlight: null,
          action: 'info',
          hint: '目标点用特殊标记表示'
        },
        {
          title: '开始挑战',
          desc: '尝试推箱子到目标位置',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'nurikabe': [
        {
          title: '🧱 数墙游戏',
          desc: '用黑色格子围住数字区域',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击格子涂黑或变白'
        },
        {
          title: '数字规则',
          desc: '数字表示白色区域的大小',
          image: null,
          highlight: null,
          action: 'info',
          hint: '每个数字代表一个独立区域'
        },
        {
          title: '连通规则',
          desc: '黑色格子必须连通',
          image: null,
          highlight: null,
          action: 'info',
          hint: '不能有孤立的黑色格子'
        },
        {
          title: '开始挑战',
          desc: '尝试完成数墙关卡',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'nonogram': [
        {
          title: '🎨 数织游戏',
          desc: '根据数字提示填色',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击格子填色或标记'
        },
        {
          title: '数字规则',
          desc: '数字表示连续填色格数',
          image: null,
          highlight: null,
          action: 'info',
          hint: '多个数字之间有空格'
        },
        {
          title: '完成图画',
          desc: '填完后会显示隐藏的图画',
          image: null,
          highlight: null,
          action: 'info',
          hint: '仔细观察数字规律'
        },
        {
          title: '开始挑战',
          desc: '尝试填色完成图画',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'battleship': [
        {
          title: '🚢 海战游戏',
          desc: '找出隐藏的战舰位置',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击格子攻击'
        },
        {
          title: '战舰规则',
          desc: '不同长度的战舰隐藏在网格中',
          image: null,
          highlight: null,
          action: 'info',
          hint: '战舰不会重叠或相邻'
        },
        {
          title: '提示信息',
          desc: '边上数字表示该行/列的战舰段数',
          image: null,
          highlight: null,
          action: 'info',
          hint: '利用逻辑推理找出战舰'
        },
        {
          title: '开始挑战',
          desc: '尝试找出所有战舰',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'othello': [
        {
          title: '⚫ 黑白棋游戏',
          desc: '翻转对方棋子获得更多地盘',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击落子位置'
        },
        {
          title: '翻转规则',
          desc: '夹住对方棋子可以翻转',
          image: null,
          highlight: null,
          action: 'info',
          hint: '横、竖、斜线方向都可以'
        },
        {
          title: '游戏目标',
          desc: '结束时棋子多的一方获胜',
          image: null,
          highlight: null,
          action: 'info',
          hint: '策略很重要！'
        },
        {
          title: '开始挑战',
          desc: '尝试战胜对手',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      '24point': [
        {
          title: '🧮 24点游戏',
          desc: '用四个数字算出24',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击数字和运算符'
        },
        {
          title: '运算规则',
          desc: '使用加减乘除四种运算',
          image: null,
          highlight: null,
          action: 'info',
          hint: '每个数字只用一次'
        },
        {
          title: '挑战目标',
          desc: '让最终结果等于24',
          image: null,
          highlight: null,
          action: 'info',
          hint: '有时需要改变运算顺序'
        },
        {
          title: '开始挑战',
          desc: '尝试算出24',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'frog-escape': [
        {
          title: '🐸 青蛙逃生',
          desc: '帮助所有青蛙逃离沼泽',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击青蛙跳跃'
        },
        {
          title: '跳跃规则',
          desc: '青蛙可以跳1格或2格',
          image: null,
          highlight: null,
          action: 'info',
          hint: '只能跳到空位'
        },
        {
          title: '挑战目标',
          desc: '把所有青蛙移到对岸',
          image: null,
          highlight: null,
          action: 'info',
          hint: '规划好跳跃顺序'
        },
        {
          title: '开始挑战',
          desc: '尝试帮助青蛙逃生',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ],
      'merge-abc': [
        {
          title: '🔤 ABC合成',
          desc: '合成字母获得更高分数',
          image: null,
          highlight: null,
          action: 'click',
          hint: '点击空格放置字母'
        },
        {
          title: '合成规则',
          desc: '三个相同字母合成下一个字母',
          image: null,
          highlight: null,
          action: 'info',
          hint: 'A→B→C...一直到Z'
        },
        {
          title: '游戏目标',
          desc: '合成更高等级的字母',
          image: null,
          highlight: null,
          action: 'info',
          hint: '获得更高分数'
        },
        {
          title: '开始挑战',
          desc: '尝试合成最高字母',
          image: null,
          highlight: null,
          action: 'start',
          hint: '加油！'
        }
      ]
    };

    return tutorials[this.gameName] || [
      {
        title: '游戏说明',
        desc: '点击开始游戏',
        image: null,
        highlight: null,
        action: 'start',
        hint: '开始挑战！'
      }
    ];
  }

  _loadProgress() {
    try {
      const raw = wx.getStorageSync('tutorial_progress');
      if (raw) {
        const progress = JSON.parse(raw);
        this.currentStep = progress[this.gameName] || 0;
        this.completed = progress[`${this.gameName}_completed`] || false;
      }
    } catch (e) {}
  }

  _saveProgress() {
    try {
      const raw = wx.getStorageSync('tutorial_progress');
      const progress = raw ? JSON.parse(raw) : {};
      progress[this.gameName] = this.currentStep;
      progress[`${this.gameName}_completed`] = this.completed;
      wx.setStorageSync('tutorial_progress', JSON.stringify(progress));
    } catch (e) {}
  }

  getCurrentStep() {
    return this.tutorials[this.currentStep];
  }

  nextStep() {
    if (this.currentStep < this.tutorials.length - 1) {
      this.currentStep++;
      this._saveProgress();
      return this.getCurrentStep();
    }
    return null;
  }

  complete() {
    this.completed = true;
    this.currentStep = this.tutorials.length;
    this._saveProgress();
  }

  isCompleted() {
    return this.completed;
  }

  getTotalSteps() {
    return this.tutorials.length;
  }

  reset() {
    this.currentStep = 0;
    this.completed = false;
    this._saveProgress();
  }

  static isFirstTime(gameName) {
    try {
      const raw = wx.getStorageSync('tutorial_progress');
      if (!raw) return true;
      const progress = JSON.parse(raw);
      return !progress[`${gameName}_completed`];
    } catch (e) {
      return true;
    }
  }
}

class TutorialOverlay {
  constructor(ctx, canvas, systemInfo, gameName, onComplete) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.gameName = gameName;
    this.onComplete = onComplete;
    this.tutorial = new TutorialLevel(gameName);
    
    this.showing = true;
    this.animating = false;
    
    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    
    this.draw();
  }

  draw() {
    if (!this.showing) return;
    
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, H);
    
    const cardW = W - 60;
    const cardH = H * 0.45;
    const cardX = 30;
    const cardY = (H - cardH) / 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 20);
    ctx.fill();
    
    const step = this.tutorial.getCurrentStep();
    const progress = (this.tutorial.currentStep + 1) / this.tutorial.getTotalSteps() * 100;
    
    ctx.fillStyle = '#E8E8E8';
    ctx.beginPath();
    this._roundRect(ctx, cardX + 20, cardY + 15, cardW - 40, 4, 2);
    ctx.fill();
    
    ctx.fillStyle = '#5677FC';
    ctx.beginPath();
    this._roundRect(ctx, cardX + 20, cardY + 15, (cardW - 40) * (progress / 100), 4, 2);
    ctx.fill();
    
    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(step.title, W / 2, cardY + 65);
    
    ctx.fillStyle = '#666666';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText(step.desc, W / 2, cardY + 100);
    
    if (step.hint) {
      ctx.fillStyle = '#999999';
      ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText('💡 ' + step.hint, W / 2, cardY + 130);
    }
    
    const btnW = 120;
    const btnH = 42;
    const btnX = (W - btnW) / 2;
    const btnY = cardY + cardH - 60;
    
    ctx.fillStyle = '#5677FC';
    ctx.beginPath();
    this._roundRect(ctx, btnX, btnY, btnW, btnH, 21);
    ctx.fill();
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    const btnText = this.tutorial.currentStep === this.tutorial.getTotalSteps() - 1 ? '开始游戏' : '下一步';
    ctx.fillText(btnText, W / 2, btnY + 27);
    
    ctx.fillStyle = '#BBBBBB';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText(`${this.tutorial.currentStep + 1} / ${this.tutorial.getTotalSteps()}`, W / 2, cardY + cardH - 20);
  }

  _onClick(e) {
    if (this.animating) return;
    
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX;
    const y = t.clientY;
    
    const W = this.width;
    const btnW = 120;
    const btnH = 42;
    const btnX = (W - btnW) / 2;
    const btnY = this.height * 0.55 - 60;
    
    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.animating = true;
      
      if (this.tutorial.currentStep === this.tutorial.getTotalSteps() - 1) {
        this.tutorial.complete();
        this.showing = false;
        this.canvas.removeEventListener('click', this._clickHandler);
        if (this.onComplete) this.onComplete();
      } else {
        this.tutorial.nextStep();
      }
      
      this.animating = false;
      this.draw();
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    const [tl, tr, br, bl] = r;
    ctx.moveTo(x + tl, y);
    ctx.lineTo(x + w - tr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
    ctx.lineTo(x + w, y + h - br);
    ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
    ctx.lineTo(x + bl, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
    ctx.lineTo(x, y + tl);
    ctx.quadraticCurveTo(x, y, x + tl, y);
    ctx.closePath();
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = { TutorialLevel, TutorialOverlay };
