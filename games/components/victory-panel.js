/**
 * VictoryPanel - 通用胜利面板组件
 *
 * 用法：
 *   const VictoryPanel = require('./components/victory-panel');
 *   this.victoryPanel = new VictoryPanel(this.ctx, this.width, this.height);
 *
 *   // 绘制（draw 中调用）
 *   this.victoryPanel.draw();
 *
 *   // 点击处理（clickHandler 中调用）
 *   const result = this.victoryPanel.handleClick(x, y);
 *   if (result === 'next') { ... }
 *   if (result === 'back') { ... }
 *
 * 配置项（可选）：
 *   new VictoryPanel(ctx, w, h, {
 *     title: '自定义标题',
 *     subtitle: '自定义副标题',
 *     backText: '返回菜单',
 *     onConfettiDraw: () => this.confetti.draw(),
 *     onAchievementPopup: () => this._drawAchievementPopup(),
 *     extraButtons: [{ text: '重新开始', action: 'restart' }]
 *   });
 */
const roundRect = require('../../utils/round-rect');

class VictoryPanel {
  constructor(ctx, width, height, opts) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.opts = Object.assign({
      title: '🎉 恭喜通关！',
      subtitle: null,          // 默认显示 '关卡 ' + level
      nextText: '下一关',
      backText: '返回选关',
      showNext: true,          // 无关卡的程序生成类游戏可设为 false
      onConfettiDraw: null,
      onAchievementPopup: null,
      onAchievementDraw: null,
      extraButtons: []         // [{ text, action, color, textColor, colorBg }]
    }, opts);
    this._nextBtn = null;
    this._backBtn = null;
    this._extraBtns = [];
    this._buttonsDrawn = false;
    this._newAchievements = null;
  }

  /**
   * 设置动态副标题（如关卡号）
   * 不传则用 subtitle 配置或默认 '关卡 N'
   */
  setSubtitle(text) {
    this._subtitleText = text;
  }

  /**
   * 传入新成就数据（如果有的话）
   */
  setAchievements(achievements) {
    this._newAchievements = achievements;
  }

  /**
   * 绘制胜利面板
   * @param {boolean} forceRedraw - 强制重绘按钮（首次或尺寸变化时）
   */
  draw(forceRedraw) {
    const ctx = this.ctx;

    // 如果有额外回调（confetti、achievement popup）
    if (this.opts.onConfettiDraw) this.opts.onConfettiDraw();
    if (this._newAchievements && this._newAchievements.length > 0 && this.opts.onAchievementDraw) {
      this.opts.onAchievementDraw();
      this._newAchievements = null;
    }

    // 按钮已绘制则跳过
    if (this._buttonsDrawn && !forceRedraw) return;

    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 面板背景
    roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fillStyle = '#1e2a4a';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#6BCB77';
    ctx.font = 'bold 22px Arial, -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(this.opts.title, this.width / 2, panelY + 50);

    // 副标题
    if (this._subtitleText || this.opts.subtitle) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '15px Arial, -apple-system';
      ctx.fillText(this._subtitleText || this.opts.subtitle, this.width / 2, panelY + 80);
    }

    const btnW = 180, btnH = 42;
    const btnX = (this.width - btnW) / 2;
    let btnY = panelY + 95;

    // 下一关按钮
    if (this.opts.showNext) {
      roundRect(ctx, btnX, btnY, btnW, btnH, 21);
      ctx.fillStyle = '#6BCB77';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 17px Arial, -apple-system';
      ctx.fillText(this.opts.nextText, this.width / 2, btnY + 27);
      this._nextBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
      btnY += 52;
    } else {
      this._nextBtn = null;
    }

    // 返回按钮
    roundRect(ctx, btnX, btnY, btnW, btnH, 21);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '15px Arial, -apple-system';
    ctx.fillText(this.opts.backText, this.width / 2, btnY + 27);
    this._backBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    btnY += 52;

    // 额外按钮
    this._extraBtns = [];
    for (let i = 0; i < this.opts.extraButtons.length; i++) {
      const eb = this.opts.extraButtons[i];
      roundRect(ctx, btnX, btnY, btnW, btnH, 21);
      ctx.fillStyle = eb.colorBg || 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.fillStyle = eb.textColor || '#fff';
      ctx.font = (eb.bold ? 'bold ' : '') + (eb.fontSize || '15') + 'px Arial, -apple-system';
      ctx.fillText(eb.text, this.width / 2, btnY + 27);
      this._extraBtns.push({ x: btnX, y: btnY, w: btnW, h: btnH, action: eb.action });
      btnY += 52;
    }

    this._buttonsDrawn = true;
  }

  /**
   * 处理胜利面板的点击事件
   * @returns {string|null} 'next' | 'back' | extraButton.action | null
   */
  handleClick(x, y) {
    if (this._nextBtn && x >= this._nextBtn.x && x <= this._nextBtn.x + this._nextBtn.w &&
        y >= this._nextBtn.y && y <= this._nextBtn.y + this._nextBtn.h) {
      return 'next';
    }
    if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
        y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
      return 'back';
    }
    for (let i = 0; i < this._extraBtns.length; i++) {
      const b = this._extraBtns[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        return b.action;
      }
    }
    return null;
  }

  /**
   * 重置面板状态（切关/重开时调用）
   */
  reset() {
    this._nextBtn = null;
    this._backBtn = null;
    this._extraBtns = [];
    this._buttonsDrawn = false;
    this._newAchievements = null;
  }
}

module.exports = VictoryPanel;
