/**
 * HeaderBar - 通用顶部栏组件
 *
 * 用法：
 *   const HeaderBar = require('./components/header-bar');
 *   this.headerBar = new HeaderBar(this.ctx, this.width, this.statusBarHeight);
 *
 *   // 绘制（draw 中调用）
 *   this.headerBar.draw({ title: '灯塔', info: '关卡 1', steps: 5 });
 *
 *   // 点击处理
 *   if (this.headerBar.isBackButton(x, y)) { ... }
 */
const roundRect = require('../../utils/round-rect');

class HeaderBar {
  constructor(ctx, width, statusBarHeight, opts) {
    this.ctx = ctx;
    this.width = width;
    this.statusBarHeight = statusBarHeight || 44;
    this.opts = Object.assign({
      bgColor: '#1a1a2e',        // 顶部背景色
      textColor: '#fff',          // 标题文字色
      infoColor: 'rgba(255,255,255,0.6)', // 信息文字色
      backColor: 'rgba(255,255,255,0.12)', // 返回按钮背景色
      titleFontSize: 18,
      infoFontSize: 13,
      height: 44,                 // 标题栏高度（不含 status bar）
      showDifficulty: false       // 是否显示难度选择
    }, opts);
    this._backBtn = { x: 15, y: this.statusBarHeight + 8, w: 70, h: 32 };
  }

  /**
   * 绘制顶部栏
   * @param {Object} params
   * @param {string} params.title - 游戏标题
   * @param {string} [params.info] - 右侧信息文本（如 "关卡 1"）
   * @param {string} [params.info2] - 第二行信息
   * @param {Array}  [params.rightItems] - 右侧自定义项 [{text, color}]
   * @param {boolean} [params.noTitle] - 不画标题（仅返回按钮）
   */
  draw(params) {
    const ctx = this.ctx;
    const y0 = this.statusBarHeight;

    // 返回按钮
    roundRect(ctx, 15, y0 + 8, 70, 32, 8);
    ctx.fillStyle = this.opts.backColor;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '14px Arial, -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('← 返回', 50, y0 + 29);

    if (params && !params.noTitle) {
      // 标题
      ctx.fillStyle = this.opts.textColor;
      ctx.font = 'bold ' + this.opts.titleFontSize + 'px Arial, -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(params.title, this.width / 2, y0 + 30);

      // 右侧信息
      if (params.info) {
        ctx.fillStyle = this.opts.infoColor;
        ctx.font = this.opts.infoFontSize + 'px Arial, -apple-system';
        ctx.textAlign = 'right';
        ctx.fillText(params.info, this.width - 15, y0 + 20);
      }
      if (params.info2) {
        ctx.fillStyle = this.opts.infoColor;
        ctx.font = this.opts.infoFontSize + 'px Arial, -apple-system';
        ctx.textAlign = 'right';
        ctx.fillText(params.info2, this.width - 15, y0 + 38);
      }

      // 右侧自定义项（如分数等）
      if (params.rightItems) {
        ctx.textAlign = 'right';
        let ry = y0 + 20;
        for (let i = 0; i < params.rightItems.length; i++) {
          const item = params.rightItems[i];
          ctx.fillStyle = item.color || this.opts.infoColor;
          ctx.font = (item.bold ? 'bold ' : '') + (item.fontSize || this.opts.infoFontSize) + 'px Arial, -apple-system';
          ctx.fillText(item.text, this.width - 15, ry);
          ry += (item.fontSize || this.opts.infoFontSize) + 6;
        }
      }
    }

    // 恢复默认对齐
    ctx.textAlign = 'left';
  }

  /**
   * 判断点击是否在返回按钮上
   */
  isBackButton(x, y) {
    const b = this._backBtn;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;
  }

  get boardStartY() {
    return this.statusBarHeight + this.opts.height + 10;
  }
}

module.exports = HeaderBar;
