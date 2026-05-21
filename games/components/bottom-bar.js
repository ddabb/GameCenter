/**
 * BottomBar - 通用底部工具栏组件
 *
 * 用法：
 *   const BottomBar = require('./components/bottom-bar');
 *   this.bottomBar = new BottomBar(this.ctx, this.width, this.height, this.statusBarHeight);
 *
 *   // 配置按钮
 *   this.bottomBar.setButtons([
 *     { id: 'undo',   text: '↩️ 撤销', enabled: true },
 *     { id: 'hint',   text: '💡 提示', enabled: true },
 *     { id: 'reset',  text: '🔄 重开', enabled: true }
 *   ]);
 *
 *   // 绘制
 *   this.bottomBar.draw();
 *
 *   // 点击处理
 *   const action = this.bottomBar.handleClick(x, y); // 'undo' | 'hint' | 'reset' | null
 *   if (action === 'undo') { ... }
 */
const roundRect = require('../../utils/round-rect');

class BottomBar {
  constructor(ctx, width, height, statusBarHeight, opts) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.statusBarHeight = statusBarHeight || 44;
    this.opts = Object.assign({
      bgColor: 'rgba(255,255,255,0.06)',
      activeColor: '#6BCB77',
      textColor: '#fff',
      disabledColor: 'rgba(255,255,255,0.3)',
      btnHeight: 36,
      btnGap: 10,
      btnRadius: 18,
      bottomMargin: 30,
      maxBtnWidth: 90
    }, opts);
    this._buttons = [];
    this._buttonRects = [];
  }

  /**
   * 设置底部按钮列表
   * @param {Array} buttons - [{id, text, enabled?, color?, icon?}]
   * @param {boolean} showRuleBtn - 是否显示规则按钮（默认显示）
   */
  setButtons(buttons, showRuleBtn = true) {
    this._buttons = buttons || [];
    if (showRuleBtn) {
      this._buttons.unshift({ id: 'rule', text: '📖 规则' });
    }
    this._buttonRects = [];
  }

  /**
   * 启用/禁用某个按钮
   */
  setEnabled(id, enabled) {
    for (let i = 0; i < this._buttons.length; i++) {
      if (this._buttons[i].id === id) {
        this._buttons[i].enabled = enabled;
        break;
      }
    }
  }

  /**
   * 绘制底部工具栏
   */
  draw() {
    if (this._buttons.length === 0) return;

    const ctx = this.ctx;
    const btnH = this.opts.btnHeight;
    const gap = this.opts.btnGap;
    const totalBtns = this._buttons.length;
    const maxBtnW = this.opts.maxBtnWidth;
    const btnW = Math.min(maxBtnW, (this.width - gap * (totalBtns + 1)) / totalBtns);
    const startX = (this.width - (btnW * totalBtns + gap * (totalBtns - 1))) / 2;
    const y = this.height - this.opts.bottomMargin - btnH;

    this._buttonRects = [];
    for (let i = 0; i < this._buttons.length; i++) {
      const btn = this._buttons[i];
      const bx = startX + i * (btnW + gap);
      const enabled = btn.enabled !== false;

      roundRect(ctx, bx, y, btnW, btnH, this.opts.btnRadius);
      ctx.fillStyle = enabled
        ? (btn.color || this.opts.bgColor)
        : this.opts.disabledColor;
      ctx.fill();

      ctx.fillStyle = enabled
        ? (btn.textColor || this.opts.textColor)
        : 'rgba(255,255,255,0.4)';
      ctx.font = '13px Arial, -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(btn.text, bx + btnW / 2, y + btnH / 2 + 5);

      this._buttonRects.push({ x: bx, y: y, w: btnW, h: btnH, id: btn.id });
    }

    ctx.textAlign = 'left';
  }

  /**
   * 处理底部栏点击
   * @returns {string|null} 按钮 id 或 null
   */
  handleClick(x, y) {
    for (let i = 0; i < this._buttonRects.length; i++) {
      const r = this._buttonRects[i];
      const btn = this._buttons[i];
      if (btn.enabled === false) continue;
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
        return r.id;
      }
    }
    return null;
  }

  /**
   * 底部栏占用的顶部 Y 坐标（棋盘下边界）
   */
  get topY() {
    return this.height - this.opts.bottomMargin - this.opts.btnHeight - 10;
  }
}

module.exports = BottomBar;
