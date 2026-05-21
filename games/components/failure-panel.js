const roundRect = require('../../utils/round-rect');

class FailurePanel {
  constructor(ctx, width, height, opts) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.opts = Object.assign({
      title: '😢 游戏结束',
      subtitle: null,
      retryText: '再来一局',
      backText: '返回菜单',
      onConfettiDraw: null
    }, opts);
    this._retryBtn = null;
    this._backBtn = null;
  }

  setSubtitle(text) {
    this._subtitleText = text;
  }

  draw() {
    const ctx = this.ctx;

    if (this.opts.onConfettiDraw) this.opts.onConfettiDraw();

    const panelW = 260, panelH = 200;
    const panelX = (this.width - panelW) / 2;
    const panelY = (this.height - panelH) / 2;
    const btnW = 180, btnH = 42;
    const btnX = (this.width - btnW) / 2;
    let btnY = panelY + 95;

    this._retryBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    btnY += 52;
    this._backBtn = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, this.width, this.height);

    roundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fillStyle = '#2d1f1f';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 22px Arial, -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(this.opts.title, this.width / 2, panelY + 50);

    if (this._subtitleText || this.opts.subtitle) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '15px Arial, -apple-system';
      ctx.fillText(this._subtitleText || this.opts.subtitle, this.width / 2, panelY + 80);
    }

    roundRect(ctx, btnX, btnY - 52, btnW, btnH, 21);
    ctx.fillStyle = '#e74c3c';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 17px Arial, -apple-system';
    ctx.fillText(this.opts.retryText, this.width / 2, btnY - 25);

    roundRect(ctx, btnX, btnY, btnW, btnH, 21);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '15px Arial, -apple-system';
    ctx.fillText(this.opts.backText, this.width / 2, btnY + 27);
  }

  handleClick(x, y) {
    if (this._retryBtn && x >= this._retryBtn.x && x <= this._retryBtn.x + this._retryBtn.w &&
        y >= this._retryBtn.y && y <= this._retryBtn.y + this._retryBtn.h) {
      return 'retry';
    }
    if (this._backBtn && x >= this._backBtn.x && x <= this._backBtn.x + this._backBtn.w &&
        y >= this._backBtn.y && y <= this._backBtn.y + this._backBtn.h) {
      return 'back';
    }
    return null;
  }

  reset() {
    this._retryBtn = null;
    this._backBtn = null;
  }
}

module.exports = FailurePanel;