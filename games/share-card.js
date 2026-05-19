class ShareCard {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  async generate(options) {
    const { gameName, gameTitle, level } = options;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = this.width;
    tempCanvas.height = this.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#2d2d2d';
    tempCtx.fillRect(0, 0, this.width, this.height);

    tempCtx.fillStyle = '#fff';
    tempCtx.font = 'bold ' + (this.width / 14) + 'px Arial';
    tempCtx.textAlign = 'center';
    tempCtx.fillText(gameTitle, this.width / 2, this.height / 3);

    tempCtx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    tempCtx.font = (this.width / 20) + 'px Arial';
    tempCtx.fillText(`第 ${level} 关 通关！`, this.width / 2, this.height / 2);

    tempCtx.fillStyle = '#8BC34A';
    tempCtx.font = (this.width / 24) + 'px Arial';
    tempCtx.fillText('🎉 挑战成功！', this.width / 2, this.height * 2 / 3);

    return new Promise((resolve) => {
      tempCanvas.toBlob((blob) => {
        if (blob) {
          const path = URL.createObjectURL(blob);
          resolve(path);
        } else {
          resolve('');
        }
      }, 'image/png');
    });
  }

  static share(path) {
    if (typeof wx !== 'undefined' && wx.shareAppMessage) {
      wx.shareAppMessage({
        imageUrl: path
      });
    } else if (navigator.share) {
      navigator.share({
        title: '游戏分享',
        text: '我完成了游戏挑战！',
        url: window.location.href
      });
    }
  }
}

module.exports = { ShareCard };