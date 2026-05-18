/**
 * 隐私政策页面 - Canvas渲染
 */
class PrivacyPolicy {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.padding = 16;

    this.policyText = [
      '隐私政策',
      '',
      '更新日期：2026年5月18日',
      '',
      '一、信息收集',
      '本应用不收集、存储或传输任何个人身份信息。',
      '您的游戏进度数据仅保存在本地设备存储中，',
      '不会上传至任何服务器。',
      '',
      '二、数据存储',
      '· 游戏进度：使用设备本地存储保存',
      '· 成就记录：仅存储在本地设备',
      '· 每日挑战：基于日期本地计算',
      '',
      '三、第三方服务',
      '本应用不集成任何第三方SDK、',
      '统计分析工具或广告平台。',
      '不与任何第三方共享用户数据。',
      '',
      '四、权限使用',
      '本应用仅需以下权限：',
      '· 本地存储：保存游戏进度',
      '· 振动反馈：游戏交互效果（可选）',
      '',
      '五、数据安全',
      '所有数据均存储在本地设备，',
      '卸载应用后数据将自动清除。',
      '我们不会通过网络传输任何用户数据。',
      '',
      '六、未成年人保护',
      '本应用内容适合所有年龄段用户，',
      '不包含任何不适合未成年人的内容，',
      '不收集未成年人个人信息。',
      '',
      '七、政策更新',
      '如本政策发生变更，',
      '将在应用内公示新版本。',
      '',
      '八、联系我们',
      '如有疑问，请通过抖音平台',
      '联系开发者：泽楠思维实验室',
    ];

    this.scrollY = 0;
    this.maxScroll = 0;
    this.lineHeight = 22;
    this.fontSize = 14;
    this.titleFontSize = 18;
    this.bindEvents();
  }

  bindEvents() {
    this.clickHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let x = touch.clientX;
      let y = touch.clientY;

      // 返回按钮
      if (y >= 15 && y <= 55 && x >= this.padding && x <= this.padding + 70) {
        this.switchGame('profile');
        return;
      }
    };

    // 触摸滚动
    this.touchStartY = 0;
    this.touchStartScrollY = 0;

    this.touchStartHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      this.touchStartY = touch.clientY;
      this.touchStartScrollY = this.scrollY;
    };

    this.touchMoveHandler = (e) => {
      let touch = e.touches ? e.touches[0] : e;
      let deltaY = this.touchStartY - touch.clientY;
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.touchStartScrollY + deltaY));
    };

    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: true });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: true });
  }

  update() {}

  draw() {
    this.drawBackground();
    this.drawHeader();
    this.drawContent();
  }

  drawBackground() {
    let gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawHeader() {
    // 返回按钮
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.beginPath();
    this.ctx.roundRect(this.padding, 15, 70, 35, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', this.padding + 35, 38);

    // 标题
    this.ctx.font = 'bold 18px Arial';
    this.ctx.fillText('🔒 隐私政策', this.width / 2, 38);
  }

  drawContent() {
    const startY = 65;
    const endY = this.height - 20;
    const contentWidth = this.width - this.padding * 2;

    // 计算总高度
    const totalHeight = this.policyText.length * this.lineHeight;
    this.maxScroll = Math.max(0, totalHeight - (endY - startY));

    this.ctx.save();

    // 裁剪区域
    this.ctx.beginPath();
    this.ctx.rect(0, startY, this.width, endY - startY);
    this.ctx.clip();

    this.ctx.translate(0, -this.scrollY);

    for (let i = 0; i < this.policyText.length; i++) {
      const line = this.policyText[i];
      const y = startY + i * this.lineHeight;

      if (line === '隐私政策') {
        this.ctx.fillStyle = '#fff';
        this.ctx.font = `bold ${this.titleFontSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(line, this.width / 2, y + 20);
      } else if (line.startsWith('一') || line.startsWith('二') || line.startsWith('三') ||
                 line.startsWith('四') || line.startsWith('五') || line.startsWith('六') ||
                 line.startsWith('七') || line.startsWith('八')) {
        this.ctx.fillStyle = '#FFC107';
        this.ctx.font = `bold ${this.fontSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(line, this.padding, y);
      } else if (line === '' || line === '更新日期：2026年5月18日') {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = `${this.fontSize - 1}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(line, this.width / 2, y);
      } else {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        this.ctx.font = `${this.fontSize}px Arial`;
        this.ctx.textAlign = 'left';
        this.ctx.fillText(line, this.padding, y);
      }
    }

    this.ctx.restore();

    // 滚动指示条
    if (this.maxScroll > 0) {
      const trackH = endY - startY;
      const thumbH = Math.max(30, trackH * (trackH / totalHeight));
      const thumbY = startY + (this.scrollY / this.maxScroll) * (trackH - thumbH);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      this.ctx.beginPath();
      this.ctx.roundRect(this.width - 6, thumbY, 3, thumbH, 2);
      this.ctx.fill();
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
  }
}

module.exports = PrivacyPolicy;
