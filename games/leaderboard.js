/**
 * leaderboard.js - 排行榜页面
 */
const sound = require('./sound-manager');

class Leaderboard {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    // 模拟排行榜数据
    this.rankings = [
      { rank: 1, name: '玩家A', score: 12500, avatar: '🏆' },
      { rank: 2, name: '玩家B', score: 10200, avatar: '🥈' },
      { rank: 3, name: '玩家C', score: 8900, avatar: '🥉' },
      { rank: 4, name: '你', score: 7650, avatar: '😊' },
      { rank: 5, name: '玩家D', score: 6200, avatar: '🎮' },
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
    ctx.fillText('排行榜', tw / 2, this.statusBarHeight + 33);

    // 排行列表
    const listY = this.statusBarHeight + 70;
    const cardH = 60;
    const cardGap = 8;
    const padding = 15;

    this.rankings.forEach((item, idx) => {
      const ry = listY + idx * (cardH + cardGap);
      if (ry + cardH > this.height - 20) return;

      // 卡片背景（自己高亮）
      ctx.fillStyle = item.name === '你' ? '#EBF4FF' : '#ffffff';
      ctx.fillRect(padding, ry, tw - padding * 2, cardH);

      // 排名
      ctx.fillStyle = item.rank <= 3 ? '#F6AD55' : '#999999';
      ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('#' + item.rank, padding + 10, ry + 38);

      // 头像
      ctx.font = '24px -apple-system';
      ctx.fillText(item.avatar, padding + 45, ry + 40);

      // 名称
      ctx.fillStyle = '#333333';
      ctx.font = '16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.name, padding + 80, ry + 28);

      // 分数
      ctx.fillStyle = '#5677FC';
      ctx.font = 'bold 14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(item.score + '分', tw - padding - 10, ry + 38);
    });

    // 提示
    const tipY = this.height - 40;
    ctx.fillStyle = '#999999';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('完成更多关卡提升排名', tw / 2, tipY);
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
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Leaderboard;
