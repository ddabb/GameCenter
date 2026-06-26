/**
 * LoadingOverlay - 通用数据加载过场动画组件
 *
 * 用法：
 *   const LoadingOverlay = require('./components/loading-overlay');
 *   this.loadingOverlay = new LoadingOverlay(this.ctx, this.width, this.height, {
 *     bgColor: '#0a1628',          // 可选，默认 #0a1628
 *     gameName: '游戏名'            // 可选，自定义加载文案
 *   });
 *
 *   // 加载前
 *   this.loadingOverlay.start();
 *   const data = await LevelLoader.load(...);
 *   this.loadingOverlay.stop();
 *
 *   // draw 中检查
 *   if (this.loadingOverlay.active) {
 *     this.loadingOverlay.draw();
 *     return;
 *   }
 */

class LoadingOverlay {
  constructor(ctx, width, height, opts) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this._active = false;
    this._phase = 0;
    this._timer = null;
    this._bgColor = (opts && opts.bgColor) || '#0a1628';

    const gameName = (opts && opts.gameName) ? opts.gameName : '';
    this._messages = (opts && opts.messages) ? opts.messages : [
      '正在加载关卡数据',
      '从云端获取谜题',
      gameName ? '正在准备' + gameName : '正在准备中...',
      '唤醒脑细胞',
      '马上就好'
    ];
  }

  get active() {
    return this._active;
  }

  start() {
    if (this._active) return;
    this._active = true;
    this._phase = 0;
    // 立即绘制第一帧
    this.draw();
    this._timer = setInterval(() => {
      this._phase++;
      this.draw();
    }, 150);
  }

  stop() {
    if (!this._active) return;
    this._active = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  draw() {
    if (!this._active) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w / 2;
    const cy = h / 2;

    // 背景
    ctx.fillStyle = this._bgColor;
    ctx.fillRect(0, 0, w, h);

    // 旋转加载圆环
    const r = 28;
    const ringW = 3;
    const phase = this._phase * 0.12;

    // 灰色底环
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = ringW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy - 40, r, 0, Math.PI * 2);
    ctx.stroke();

    // 金色旋转弧
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = ringW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy - 40, r, phase, phase + Math.PI * 1.2);
    ctx.stroke();

    // 加载文字
    const msg = this._messages[Math.floor(this._phase / 3) % this._messages.length];
    const dots = '.'.repeat((this._phase % 3) + 1);

    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(msg + dots, cx, cy + 22);

    ctx.textAlign = 'left';
  }

  destroy() {
    this.stop();
  }
}

module.exports = LoadingOverlay;
