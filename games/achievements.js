/**
 * achievements.js - 成就页面
 */
const sound = require('./sound-manager');

class Achievements {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    
    // roundRect polyfill（处理原生API和自定义实现）
    if (!ctx.roundRect) {
      ctx.roundRect = function(x, y, w, h, r) {
        const radii = Array.isArray(r) ? r : [r, r, r, r];
        const [tl, tr, br, bl] = radii;
        ctx.beginPath();
        ctx.moveTo(x + tl, y);
        ctx.lineTo(x + w - tr, y);
        ctx.arcTo(x + w, y, x + w, y + h, tr);
        ctx.lineTo(x + w, y + h - br);
        ctx.arcTo(x + w, y + h, x, y + h, br);
        ctx.lineTo(x + bl, y + h);
        ctx.arcTo(x, y + h, x, y, bl);
        ctx.lineTo(x, y + tl);
        ctx.arcTo(x, y, x + w, y, tl);
        ctx.closePath();
      };
    } else {
      const originalRoundRect = ctx.roundRect.bind(ctx);
      ctx.roundRect = function(x, y, w, h, r) {
        const radii = Array.isArray(r) ? r : [r, r, r, r];
        originalRoundRect(x, y, w, h, radii);
      };
    }
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    // 使用真实的成就管理器获取数据
    this.achievements = [];
    try {
      const { AchievementManager } = require('./achievement-manager.js');
      const am = AchievementManager.getInstance();
      this.achievements = am.getAll();
    } catch (e) {
      // 降级到模拟数据
      this.achievements = [
        { id: 1, title: '新手入门', desc: '完成第一关', icon: '🎯', unlocked: true },
        { id: 2, title: '连胜将军', desc: '连续完成5关', icon: '🔥', unlocked: true },
        { id: 3, title: '全能选手', desc: '尝试所有游戏', icon: '🎮', unlocked: false },
        { id: 4, title: '速度之星', desc: '30秒内完成一关', icon: '⚡', unlocked: false },
        { id: 5, title: '坚持不懈', desc: '累计完成100关', icon: '💪', unlocked: false },
      ];
    }

    // 滚动相关
    this.scrollY = 0;
    this.maxScrollY = 0;
    this.touchStartY = 0;
    this.touchStartScrollY = 0;
    this.isDragging = false;
    this.cardH = 70;
    this.cardGap = 10;
    this.listTop = this.statusBarHeight + 70;
    this._calcMaxScroll();

    this._clickHandler = this._onClick.bind(this);
    this._touchStartHandler = this._onTouchStart.bind(this);
    this._touchMoveHandler = this._onTouchMove.bind(this);
    this._touchEndHandler = this._onTouchEnd.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    this.canvas.addEventListener('touchstart', this._touchStartHandler);
    this.canvas.addEventListener('touchmove', this._touchMoveHandler);
    this.canvas.addEventListener('touchend', this._touchEndHandler);
    this.draw();
  }

  _calcMaxScroll() {
    const totalH = this.achievements.length * (this.cardH + this.cardGap) - this.cardGap;
    const viewH = this.height - this.listTop - 20;
    this.maxScrollY = Math.max(0, totalH - viewH);
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
    const padding = 15;

    this.achievements.forEach((ach, idx) => {
      const ry = this.listTop + idx * (this.cardH + this.cardGap) - this.scrollY;
      if (ry + this.cardH < 0 || ry > this.height) return;

      // 卡片背景
      ctx.fillStyle = ach.unlocked ? '#ffffff' : '#f0f0f0';
      ctx.fillRect(padding, ry, tw - padding * 2, this.cardH);

      // 图标
      ctx.font = '32px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(ach.icon, padding + 30, ry + 45);

      // 名称
      ctx.fillStyle = ach.unlocked ? '#333333' : '#999999';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(ach.title || ach.name, padding + 60, ry + 28);

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

    // 绘制滚动条
    this._drawScrollbar(ctx);
  }

  _drawScrollbar(ctx) {
    if (this.maxScrollY <= 0) return;
    
    const scrollbarW = 4;
    const scrollbarX = this.width - 8;
    const scrollbarH = this.height - this.listTop - 20;
    const scrollbarY = this.listTop + 10;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.beginPath();
    ctx.roundRect(scrollbarX, scrollbarY, scrollbarW, scrollbarH, 2);
    ctx.fill();
    
    const thumbH = Math.max(30, scrollbarH * (scrollbarH / (scrollbarH + this.maxScrollY)));
    const thumbY = scrollbarY + (this.scrollY / this.maxScrollY) * (scrollbarH - thumbH);
    
    ctx.fillStyle = '#CCCCCC';
    ctx.beginPath();
    ctx.roundRect(scrollbarX, thumbY, scrollbarW, thumbH, 2);
    ctx.fill();
  }

  _onTouchStart(e) {
    const t = e.touches ? e.touches[0] : e;
    this.touchStartY = t.clientY;
    this.touchStartScrollY = this.scrollY;
    this.isDragging = true;
  }

  _onTouchMove(e) {
    if (!this.isDragging || this.maxScrollY <= 0) return;
    
    const t = e.touches ? e.touches[0] : e;
    const deltaY = t.clientY - this.touchStartY;
    let newScrollY = this.touchStartScrollY - deltaY;
    
    newScrollY = Math.max(0, Math.min(newScrollY, this.maxScrollY));
    this.scrollY = newScrollY;
    this.draw();
  }

  _onTouchEnd() {
    this.isDragging = false;
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
    this.canvas.removeEventListener('touchstart', this._touchStartHandler);
    this.canvas.removeEventListener('touchmove', this._touchMoveHandler);
    this.canvas.removeEventListener('touchend', this._touchEndHandler);
  }
}

module.exports = Achievements;
