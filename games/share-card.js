/**
 * share-card.js — 通关分享卡片生成器
 * 将当前游戏画面生成分享图片
 */

class ShareCard {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * 生成分享图（返回临时文件路径）
   * @param {object} options
   * @param {string} options.gameName 游戏名称
   * @param {string} options.gameTitle 中文标题
   * @param {number} options.level 关卡号
   * @param {number} options.moves 步数（可选）
   * @param {number} options.time 用时秒（可选）
   * @param {string} options.quote 名言/鼓励语
   */
  generate(options) {
    const { gameName, gameTitle, level, moves, time, quote } = options;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 背景
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 装饰圆
    ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.2, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 72, 153, 0.08)';
    ctx.beginPath();
    ctx.arc(w * 0.2, h * 0.7, 60, 0, Math.PI * 2);
    ctx.fill();

    // 标题
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 通关！', w / 2, 80);

    // 游戏名
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(gameTitle, w / 2, 130);

    // 关卡信息
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '16px Arial';
    let info = `第 ${level} 关`;
    if (moves) info += ` · ${moves} 步`;
    if (time) {
      const min = Math.floor(time / 60);
      const sec = time % 60;
      info += ` · ${min}:${sec < 10 ? '0' : ''}${sec}`;
    }
    ctx.fillText(info, w / 2, 175);

    // 分割线
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.2, 200);
    ctx.lineTo(w * 0.8, 200);
    ctx.stroke();

    // 名言
    const quotes = [
      '每一道谜题，都是一次思维的旅行 🌟',
      '坚持思考，答案就在不远处 💪',
      '逻辑之美，在于一步步接近真相 🎯',
      '你的大脑，比你想象的更强大 🧠',
      '挑战没有终点，只有新的起点 🚀'
    ];
    const q = quote || quotes[Math.floor(Math.random() * quotes.length)];
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px Arial';
    // 简单换行
    const words = q;
    ctx.fillText(words, w / 2, 250);

    // 底部小程序名
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '12px Arial';
    ctx.fillText('SolvePuzzle · 益智解谜', w / 2, h - 30);

    // 导出为图片
    return new Promise((resolve, reject) => {
      try {
        tt.canvasToTempFilePath({
          canvasId: this.ctx.canvas ? undefined : undefined, // 抖音小游戏API
          canvas: this.ctx.canvas,
          success: (res) => resolve(res.tempFilePath),
          fail: (err) => reject(err)
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 调用抖音分享
   * @param {string} tempFilePath 图片临时路径
   * @param {object} options
   */
  static share(tempFilePath, options = {}) {
    tt.shareAppMessage({
      title: options.title || '我在SolvePuzzle挑战了益智谜题！',
      imageUrl: tempFilePath,
      query: options.query || ''
    });
  }
}

module.exports = { ShareCard };
