class ShareCard {
  constructor(ctx, width = 500, height = 400) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
    this.gameIcons = {
      'akari': '💡', 'battleship': '🚢', 'nonogram': '🎨', 'nurikabe': '🧱',
      'tents': '⛺', 'slither-link': '🔗', 'sokoban': '📦', '24point': '🧮',
      'othello': '⚫', 'one-stroke': '✏️', 'sweep-frog': '🐸', 'merge-abc': '🔤'
    };
  }

  async generate(options) {
    const { gameName, gameTitle, level, stars = 3, customText } = options;
    
    let tempCanvas, tempCtx;
    const W = this.width, H = this.height;

    if (typeof wx !== 'undefined' && wx.createCanvas) {
      tempCanvas = wx.createCanvas();
    } else if (typeof document !== 'undefined' && document.createElement) {
      tempCanvas = document.createElement('canvas');
    } else {
      return Promise.resolve('');
    }
    
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    tempCtx = tempCanvas.getContext('2d');

    const gradient = tempCtx.createLinearGradient(0, 0, W, H);
    gradient.addColorStop(0, '#6677FC');
    gradient.addColorStop(0.5, '#8B5CF6');
    gradient.addColorStop(1, '#EC4899');
    tempCtx.fillStyle = gradient;
    tempCtx.fillRect(0, 0, W, H);

    tempCtx.fillStyle = 'rgba(255,255,255,0.15)';
    tempCtx.beginPath();
    tempCtx.arc(W * 0.8, H * 0.2, 60, 0, Math.PI * 2);
    tempCtx.fill();
    tempCtx.beginPath();
    tempCtx.arc(W * 0.2, H * 0.8, 40, 0, Math.PI * 2);
    tempCtx.fill();

    const padding = 30;
    const cardW = W - padding * 2;
    const cardH = H - padding * 2 - 30;
    const cardX = padding;
    const cardY = padding + 15;

    tempCtx.fillStyle = 'rgba(255,255,255,0.95)';
    tempCtx.beginPath();
    this._roundRect(tempCtx, cardX, cardY, cardW, cardH, 20);
    tempCtx.fill();

    const icon = this.gameIcons[gameName] || '🎮';
    tempCtx.font = 'bold ' + (W / 8) + 'px -apple-system';
    tempCtx.textAlign = 'center';
    tempCtx.fillText(icon, W / 2, cardY + cardH * 0.35);

    tempCtx.fillStyle = '#1A1A2E';
    tempCtx.font = 'bold ' + (W / 14) + 'px -apple-system,BlinkMacSystemFont,sans-serif';
    tempCtx.fillText(gameTitle, W / 2, cardY + cardH * 0.58);

    tempCtx.fillStyle = '#666666';
    tempCtx.font = (W / 22) + 'px -apple-system,BlinkMacSystemFont,sans-serif';
    tempCtx.fillText(`第 ${level} 关 通关！`, W / 2, cardY + cardH * 0.7);

    const starsStr = '⭐'.repeat(stars);
    tempCtx.font = (W / 18) + 'px -apple-system';
    tempCtx.fillText(starsStr, W / 2, cardY + cardH * 0.82);

    if (customText) {
      tempCtx.fillStyle = '#999999';
      tempCtx.font = (W / 28) + 'px -apple-system,BlinkMacSystemFont,sans-serif';
      tempCtx.fillText(customText, W / 2, cardY + cardH * 0.92);
    }

    tempCtx.fillStyle = '#EEEEEE';
    tempCtx.font = (W / 28) + 'px -apple-system,BlinkMacSystemFont,sans-serif';
    tempCtx.fillText('🎮 指尖谜题', W / 2, cardY + cardH + 22);

    return new Promise((resolve) => {
      try {
        if (tempCanvas.toBlob) {
          tempCanvas.toBlob((blob) => {
            if (blob) {
              const path = URL.createObjectURL(blob);
              resolve(path);
            } else {
              resolve(tempCanvas.toDataURL('image/png', 0.9));
            }
          }, 'image/png', 0.9);
        } else if (tempCanvas.toDataURL) {
          const dataUrl = tempCanvas.toDataURL('image/png', 0.9);
          resolve(dataUrl);
        } else {
          resolve('');
        }
      } catch (e) {
        console.error('[ShareCard] generate error:', e);
        resolve('');
      }
    });
  }

  async share(options = {}) {
    const { path, title = '我在指尖谜题挑战成功！', 
            content = '快来和我一起挑战吧！', 
            success, fail, complete } = options;

    if (typeof wx !== 'undefined') {
      if (wx.showShareMenu) {
        wx.showShareMenu({ withShareTicket: true });
      }

      if (wx.shareAppMessage) {
        wx.shareAppMessage({
          title: title,
          imageUrl: path,
          query: 'share=1',
          success: () => {
            if (success) success();
          },
          fail: (err) => {
            if (fail) fail(err);
          },
          complete: () => {
            if (complete) complete();
          }
        });
      } else if (navigator.share) {
        try {
          await navigator.share({
            title: title,
            text: content,
            url: window.location.href + '?share=1'
          });
          if (success) success();
        } catch (err) {
          if (fail) fail(err);
        } finally {
          if (complete) complete();
        }
      }
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
}

module.exports = { ShareCard };