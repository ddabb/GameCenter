/**
 * tutorial-overlay.js — 通用新手引导浮层
 * 首次进入游戏时显示操作提示，点击"知道了"关闭后不再显示
 * 
 * 用法：
 *   const tutorial = new TutorialOverlay(this.ctx, this.width, this.height, this.gameName);
 *   if (tutorial.shouldShow()) tutorial.draw();
 *   // 在 clickHandler 中: if (tutorial.shouldShow()) { tutorial.dismiss(); return; }
 */
const roundRect = require('../utils/round-rect.js');
class TutorialOverlay {
  constructor(ctx, width, height, gameName) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.gameName = gameName;
    this.storageKey = 'tutorial_shown_' + gameName;
    this.dismissed = false;
    
    // 各游戏的引导内容
    this.tutorials = {
      'othello': { icon: '⚫', title: '黑白棋', tips: [
        '点击空位放置棋子',
        '夹住对方棋子即可翻转',
        '翻转最多的玩家获胜'
      ]},
      'akari': { icon: '💡', title: '数灯', tips: [
        '点击空格放置灯泡💡',
        '灯泡照亮同行同列',
        '数字表示周围灯泡数量',
        '灯泡不能互相照射'
      ]},
      'sokoban': { icon: '📦', title: '推箱子', tips: [
        '点击箱子方向即可推动',
        '把所有箱子推到目标点',
        '箱子只能推不能拉'
      ]},
      'nurikabe': { icon: '🧱', title: '数墙', tips: [
        '点击格子标记为墙🧱',
        '数字表示周围墙的数量',
        '白格必须连通',
        '墙不能形成2x2方块'
      ]},
      'tents': { icon: '⛺', title: '帐篷', tips: [
        '点击格子放置帐篷⛺',
        '每行/列的帐篷数等于数字',
        '帐篷必须挨着对应的树',
        '帐篷不能互相相邻'
      ]},
      '24point': { icon: '🧮', title: '24点', tips: [
        '用4个数字算出24',
        '点击数字和运算符组成算式',
        '每个数字只能用一次'
      ]},
      'slither-link': { icon: '🔗', title: '数回', tips: [
        '点击格子边缘画线',
        '数字表示周围的线段数',
        '最终形成一条连续回路'
      ]},
      'nonogram': { icon: '🎨', title: '数织', tips: [
        '根据行列数字提示填色',
        '点击填色，再次点击取消',
        '填出隐藏的图案'
      ]},
      'battleship': { icon: '🚢', title: '战舰', tips: [
        '边缘数字表示该行/列的战舰格子数',
        '战舰形状有 1×1, 1×2, 1×3, 1×4',
        '战舰之间不能重叠',
        '点击格子标记战舰，再次点击取消，第三次标记水域'
      ]},
      'merge-abc': { icon: '🔤', title: 'ABC合成', tips: [
        '点击两个相同字母合成',
        '从A合成到Z即可过关',
        '合理利用空间'
      ]},
      'sweep-frog': { icon: '🐸', title: '扫青蛙', tips: [
        '点击格子，躲开所有牛蛙',
        '💧 安全区域会显示水花',
        '🔢 数字表示周围有多少只牛蛙',
        '🚩 点击"标记"按钮切换标记模式',
        '🏆 全部安全区域翻开后获胜'
      ]},
      'one-stroke': { icon: '✏️', title: '一笔画', tips: [
        '点击或滑动格子画出路径',
        '必须经过所有白色格子',
        '不能重复经过同一个格子',
        '经过洞（黑点）时跳过',
        '点击"撤销"可撤回操作'
      ]}
    };
  }

  shouldShow() {
    if (this.dismissed) return false;
    if (this._manualShow) return true;
    try {
      return !wx.getStorageSync(this.storageKey);
    } catch (e) {
      return false;
    }
  }

  dismiss() {
    this.dismissed = true;
    this._manualShow = false;
    try {
      wx.setStorageSync(this.storageKey, '1');
    } catch (e) {}
  }

  /**
   * 手动显示规则弹窗（不受 storage 限制）
   */
  show() {
    this.dismissed = false;
    this._manualShow = true;
  }

  /**
   * 关闭手动显示的弹窗
   */
  hide() {
    this.dismissed = true;
    this._manualShow = false;
  }

  /**
   * 是否正在显示（用于检测点击）
   */
  isShowing() {
    return this._manualShow || this.shouldShow();
  }

  draw() {
    const tutorial = this.tutorials[this.gameName];
    if (!tutorial) return;

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 遮罩
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.fillRect(0, 0, w, h);

    // 面板
    const panelW = Math.min(280, w - 40);
    const panelH = 200 + tutorial.tips.length * 30;
    const panelX = (w - panelW) / 2;
    const panelY = (h - panelH) / 2;

    this.ctx.fillStyle = '#1e2a4a';
    this.ctx.beginPath();
    roundRect(this.ctx,panelX, panelY, panelW, panelH, 16);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // 图标+标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(tutorial.icon + ' ' + tutorial.title, w / 2, panelY + 40);

    // 分隔线
    this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    this.ctx.beginPath();
    this.ctx.moveTo(panelX + 20, panelY + 55);
    this.ctx.lineTo(panelX + panelW - 20, panelY + 55);
    this.ctx.stroke();

    // 提示列表
    this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    tutorial.tips.forEach((tip, i) => {
      this.ctx.fillStyle = '#6BCB77';
      this.ctx.fillText('✓', panelX + 25, panelY + 80 + i * 30);
      this.ctx.fillStyle = 'rgba(255,255,255,0.85)';
      this.ctx.fillText(tip, panelX + 45, panelY + 80 + i * 30);
    });

    // "知道了"按钮
    const btnW = 160, btnH = 42;
    const btnX = (w - btnW) / 2;
    const btnY = panelY + panelH - 60;
    this.ctx.beginPath();
    roundRect(this.ctx,btnX, btnY, btnW, btnH, 21);
    this.ctx.fillStyle = '#6BCB77';
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('开始游戏', w / 2, btnY + 26);

    // 记录按钮位置供点击检测
    this._dismissBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
  }

  /**
   * 检测点击是否在"知道了"按钮上
   * @returns {boolean} 是否点击了按钮
   */
  hitTest(x, y) {
    if (!this._dismissBtn) return false;
    const b = this._dismissBtn;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }
}

module.exports = TutorialOverlay;
