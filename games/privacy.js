/**
 * privacy.js - 隐私政策页面
 */
const sound = require('./sound-manager');

class Privacy {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    // 隐私政策内容（简化）
    this.content = [
      '隐私政策',
      '',
      '生效日期：2026年5月20日',
      '',
      '1. 信息收集',
      '我们收集您提供的账号信息、游戏进度等必要数据。',
      '',
      '2. 信息使用',
      '用于游戏功能实现、客服支持和活动通知。',
      '',
      '3. 信息保护',
      '采用行业标准加密技术保护您的数据安全。',
      '',
      '4. 第三方共享',
      '仅在法律要求时向第三方披露您的信息。',
      '',
      '5. 您的权利',
      '可随时申请查看、修改或删除您的个人数据。',
      '',
      '6. 联系我们',
      '如有疑问请联系：puzzle@example.com',
      '',
      '7. 政策更新',
      '重大变更将通过游戏内公告通知您。',
    ];

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    this.draw();
  }

  draw() {
    const ctx = this.ctx;
    const tw = this.width;

    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);

    // 顶部导航栏
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    
    // 返回按钮
    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);

    // 标题
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('隐私政策', tw / 2, this.statusBarHeight + 33);

    // 内容区域
    const contentY = this.statusBarHeight + 70;
    const lineH = 22;
    
    ctx.fillStyle = '#333333';
    ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';

    this.content.forEach((line, idx) => {
      const y = contentY + idx * lineH;
      if (y > this.height - 30) return;

      // 标题加粗
      if (idx === 0 || line.startsWith('生效')) {
        ctx.font = 'bold 15px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.fillStyle = '#1a202c';
      } else if (line.match(/^\d\./)) {
        ctx.font = 'bold 13px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.fillStyle = '#2d3748';
      } else {
        ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.fillStyle = '#4a5568';
      }

      ctx.fillText(line, 20, y);
    });

    // 底部确认按钮
    const btnY = this.height - 60;
    ctx.fillStyle = '#5677FC';
    ctx.fillRect(40, btnY, tw - 80, 44);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('我已阅读并同意', tw / 2, btnY + 28);
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    // 返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('profile');  // 返回「我的」页面
      return;
    }

    // 确认按钮
    const btnY = this.height - 60;
    if (x >= 40 && x <= tw - 40 && y >= btnY && y <= btnY + 44) {
      sound.play('click');
      wx.showToast({ title: '感谢您的同意！', icon: 'success' });
      setTimeout(() => {
        this.canvas.removeEventListener('click', this._clickHandler);
        this.switchGame('profile');
      }, 1500);
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Privacy;
