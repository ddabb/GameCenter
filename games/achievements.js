/**
 * achievements.js - 成就页面
 */
const sound = require('./sound-manager');

class Achievements {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    // 模拟成就数据
    this.achievements = [
      { id: 1, name: '新手入门', desc: '完成第一关', icon: '🎯', unlocked: true },
      { id: 2, name: '连胜将军', desc: '连续完成5关', icon: '🔥', unlocked: true },
      { id: 3, name: '全能选手', desc: '尝试所有游戏', icon: '🎮', unlocked: false },
      { id: 4, name: '速度之星', desc: '30秒内完成一关', icon: '⚡', unlocked: false },
      { id: 5, name: '坚持不懈', desc: '累计完成100关', icon: '💪', unlocked: false },
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
    ctx.fillText('成就', tw / 2, this.statusBarHeight + 33);

    // 统计
    const unlocked = this.achievements.filter(a => a.unlocked).length;
    const total = this.achievements.length;
    ctx.fillStyle = '#999999';
    ctx.font = '13px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`已解锁 ${unlocked}/${total}`, tw / 2, this.statusBarHeight + 55);

    // 成就列表
    const listY = this.statusBarHeight + 70;
    const cardH = 70;
    const cardGap = 10;
    const padding = 15;

    this.achievements.forEach((ach, idx) => {
      const ry = listY + idx * (cardH + cardGap);
      if (ry + cardH > this.height - 20) return;

      // 卡片背景
      ctx.fillStyle = ach.unlocked ? '#ffffff' : '#f0f0f0';
      ctx.fillRect(padding, ry, tw - padding * 2, cardH);

      // 图标
      ctx.font = '32px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(ach.icon, padding + 30, ry + 45);

      // 名称
      ctx.fillStyle = ach.unlocked ? '#333333' : '#999999';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ach.name, padding + 60, ry + 28);

      // 描述
      ctx.fillStyle = '#888888';
      ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText(ach.desc, padding + 60, ry + 48);

      // 状态
      if (ach.unlocked) {
        ctx.fillStyle = '#48BB78';
        ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('✓ 已解锁', tw - padding, ry + 40);
      } else {
        ctx.fillStyle = '#CCCCCC';
        ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('🔒 未解锁', tw - padding, ry + 40);
      }
    });
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

module.exports = Achievements;
