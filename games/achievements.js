/**
 * achievements.js - 成就页面 v2.0
 * 支持触摸滚动 + 滚动条指示器 + 统计总览
 */
const { AchievementManager } = require('./achievement-manager');
const roundRect = require('../utils/round-rect.js');
const sound = require('./sound-manager');

class Achievements {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.am = AchievementManager.getInstance();
    this.unlockedList = this.am.getUnlocked();
    this.lockedList = this.am.getLocked();
    this.currentPage = 0; // 0=全部, 1=已解锁, 2=进行中

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    // 滚动状态
    this.scrollY = 0;
    this.maxScroll = 0;
    this.lastTouchY = 0;
    this.velocity = 0;
    this.isScrolling = false;
    this.momentumTimer = null;

    // 布局常量
    this.tabY = this.statusBarHeight + 52;
    this.tabH = 36;
    this.statsH = 90;  // 统计卡片高度
    this.listStartY = this.tabY + this.tabH + 10 + this.statsH + 10;
    this.rowH = 72;
    this.rowGap = 8;
    this.padding = 15;

    // 触摸事件
    this._touchStart = this._onTouchStart.bind(this);
    this._touchMove = this._onTouchMove.bind(this);
    this._touchEnd = this._onTouchEnd.bind(this);
    this._clickHandler = this._onClick.bind(this);

    this.canvas.addEventListener('touchstart', this._touchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this._touchMove, { passive: false });
    this.canvas.addEventListener('touchend', this._touchEnd, { passive: false });
    this.canvas.addEventListener('click', this._clickHandler);

    // 限制滚动速度
    this._velocityDecay = 0.92;
    this._minVelocity = 0.5;

    this._calcMaxScroll();
    this.draw();
  }

  getItems() {
    return this.currentPage === 1 ? this.unlockedList
         : this.currentPage === 2 ? this.lockedList
         : [...this.unlockedList, ...this.lockedList];
  }

  _calcMaxScroll() {
    const items = this.getItems();
    const totalH = items.length * (this.rowH + this.rowGap);
    const viewH = this.height - this.listStartY;
    this.maxScroll = Math.max(0, totalH - viewH + 40); // 40px底部缓冲
  }

  // ========== 触摸滚动 ==========
  _onTouchStart(e) {
    e.preventDefault();
    const t = e.touches[0];
    this.lastTouchY = t.clientY;
    this.velocity = 0;
    this.isScrolling = true;
    if (this.momentumTimer) {
      clearInterval(this.momentumTimer);
      this.momentumTimer = null;
    }
    this._animating = false;
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (!this.isScrolling) return;
    const t = e.touches[0];
    const delta = this.lastTouchY - t.clientY;
    this.lastTouchY = t.clientY;
    this.velocity = delta;

    // 阻尼效果：越接近边界阻力越大
    const rubber = this._rubberBand(this.scrollY + delta);
    this.scrollY = rubber;
    this.draw();
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (!this.isScrolling) return;
    this.isScrolling = false;

    // 惯性滚动
    if (Math.abs(this.velocity) > this._minVelocity) {
      this._startMomentum();
    }
  }

  _rubberBand(y) {
    // 弹性边界
    if (y < 0) return y * 0.4;       // 顶部越界
    if (y > this.maxScroll) return this.maxScroll + (y - this.maxScroll) * 0.4;
    return y;
  }

  _startMomentum() {
    if (this.momentumTimer) clearInterval(this.momentumTimer);
    this._animating = true;

    const tick = () => {
      if (Math.abs(this.velocity) < this._minVelocity) {
        // 归位
        if (this.scrollY < 0 || this.scrollY > this.maxScroll) {
          this.velocity = (this.scrollY < 0 ? -this.scrollY : this.scrollY - this.maxScroll) * 3;
          this._animating = false;
        } else {
          clearInterval(this.momentumTimer);
          this.momentumTimer = null;
          this._animating = false;
          return;
        }
      }
      this.velocity *= this._velocityDecay;
      this.scrollY += this.velocity;
      this.scrollY = this._rubberBand(this.scrollY);
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY));
      this.draw();
    };

    this.momentumTimer = setInterval(tick, 16);
  }

  // ========== 绘制 ==========
  draw() {
    const ctx = this.ctx;
    const tw = this.width;

    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F0F2F5';
    ctx.fillRect(0, 0, tw, this.height);

    // 顶部背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);

    // 标题
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 成就', tw / 2, this.statusBarHeight + 32);

    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);

    // Tab
    this._drawTabs();

    // 统计卡片
    this._drawStats();

    // 列表区域（带裁剪）
    this._drawList();
  }

  _drawTabs() {
    const ctx = this.ctx;
    const tw = this.width;
    const tabs = ['全部', '已解锁', '进行中'];
    const tabW = tw / 3;
    const ty = this.tabY;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, ty, tw, this.tabH);

    // 底部细线
    ctx.strokeStyle = '#EEEEEE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, ty + this.tabH);
    ctx.lineTo(tw, ty + this.tabH);
    ctx.stroke();

    tabs.forEach((label, i) => {
      const isActive = i === this.currentPage;
      const tx = i * tabW + tabW / 2;

      ctx.fillStyle = isActive ? '#5677FC' : '#999999';
      ctx.font = isActive ? 'bold 15px -apple-system' : '15px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(label, tx, ty + 24);

      if (isActive) {
        // Tab下划线
        ctx.fillStyle = '#5677FC';
        ctx.fillRect(i * tabW + tabW * 0.3, ty + this.tabH - 3, tabW * 0.4, 3);
      }
    });
  }

  _drawStats() {
    const ctx = this.ctx;
    const tw = this.width;
    const sx = this.tabY + this.tabH + 10;
    const total = this.unlockedList.length + this.lockedList.length;
    const unlocked = this.unlockedList.length;
    const pct = total > 0 ? (unlocked / total * 100).toFixed(1) : '0.0';

    // 卡片
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    roundRect(ctx, this.padding, sx, tw - this.padding * 2, this.statsH, 12);
    ctx.fill();

    // 左侧：进度环
    const ringX = this.padding + 40;
    const ringY = sx + this.statsH / 2;
    const ringR = 28;
    const ringW = 6;

    // 背景环
    ctx.strokeStyle = '#E8E8E8';
    ctx.lineWidth = ringW;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.stroke();

    // 进度环
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (unlocked / total) * Math.PI * 2;
    ctx.strokeStyle = '#5677FC';
    ctx.lineWidth = ringW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, startAngle, endAngle);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // 百分比文字
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 14px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(pct + '%', ringX, ringY + 5);

    // 右侧：数值
    const numX = ringX + ringR + 30;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1A1A1A';
    ctx.font = 'bold 26px -apple-system';
    ctx.fillText(String(unlocked), numX, sx + 38);

    ctx.fillStyle = '#888888';
    ctx.font = '13px -apple-system';
    ctx.fillText('已解锁 / ' + total + ' 总成就', numX, sx + 58);

    // 右侧：进行中数
    const inProgress = this.lockedList.filter(a => a.progress > 0).length;
    if (inProgress > 0) {
      ctx.fillStyle = '#F6AD55';
      ctx.font = 'bold 14px -apple-system';
      ctx.textAlign = 'right';
      ctx.fillText('🔨 ' + inProgress + ' 进行中', tw - this.padding - 10, sx + 48);
    }
  }

  _drawList() {
    const ctx = this.ctx;
    const tw = this.width;
    const items = this.getItems();
    const listY = this.listStartY;

    // 裁剪区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, listY, tw, this.height - listY);
    ctx.clip();

    if (items.length === 0) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '14px -apple-system';
      ctx.textAlign = 'center';
      const msg = this.currentPage === 1 ? '还没有已解锁的成就' : '暂无进行中的成就';
      ctx.fillText(msg, tw / 2, listY + 60);
      ctx.restore();
      return;
    }

    const rowW = tw - this.padding * 2;

    items.forEach((item, idx) => {
      const ry = listY + idx * (this.rowH + this.rowGap) - this.scrollY;

      // 只绘制可见行
      if (ry + this.rowH < listY - 20 || ry > this.height + 20) return;

      // 卡片背景
      ctx.fillStyle = item.unlocked ? '#ffffff' : '#F8F8F8';
      ctx.beginPath();
      roundRect(ctx, this.padding, ry, rowW, this.rowH, 10);
      ctx.fill();

      // 左侧彩色边条
      const borderColor = item.unlocked ? '#5677FC' : '#DDDDDD';
      ctx.fillStyle = borderColor;
      ctx.beginPath();
      roundRect(ctx, this.padding, ry, 3, this.rowH, [10, 0, 0, 10]);
      ctx.fill();

      // 图标
      ctx.font = '26px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(item.unlocked ? '🏆' : '🔒', this.padding + 38, ry + 44);

      // 名称
      ctx.fillStyle = item.unlocked ? '#1A1A1A' : '#BBBBBB';
      ctx.font = 'bold 15px -apple-system';
      ctx.textAlign = 'left';
      ctx.fillText(item.title || item.name || '未知成就', this.padding + 68, ry + 26);

      // 描述
      ctx.fillStyle = '#999999';
      ctx.font = '12px -apple-system';
      ctx.fillText(item.desc, this.padding + 68, ry + 46);

      // 奖励
      if (item.reward) {
        ctx.fillStyle = '#F6AD55';
        ctx.font = '12px -apple-system';
        ctx.textAlign = 'right';
        ctx.fillText(item.reward, tw - this.padding - 12, ry + 28);
      }

      // 进度条（未解锁且有进度）
      if (!item.unlocked && item.progress !== undefined) {
        const px = tw - 140, py = ry + 54;
        const barW = 80, barH = 5;
        const prog = Math.min(item.progress / item.target, 1);

        ctx.fillStyle = '#E8E8E8';
        ctx.beginPath();
        roundRect(ctx, px, py, barW, barH, barH / 2);
        ctx.fill();

        if (prog > 0) {
          ctx.fillStyle = '#5677FC';
          ctx.beginPath();
          roundRect(ctx, px, py, barW * prog, barH, barH / 2);
          ctx.fill();
        }

        ctx.fillStyle = '#AAAAAA';
        ctx.font = '11px -apple-system';
        ctx.textAlign = 'right';
        ctx.fillText(item.progress + '/' + item.target, tw - this.padding - 12, ry + 58);
      }

      // 已解锁打勾
      if (item.unlocked) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '14px -apple-system';
        ctx.textAlign = 'right';
        ctx.fillText('✓', tw - this.padding - 12, ry + 28);
      }
    });

    ctx.restore();

    // 滚动条（仅在需要时显示）
    if (this.maxScroll > 5) {
      this._drawScrollbar();
    }
  }

  _drawScrollbar() {
    const ctx = this.ctx;
    const tw = this.width;
    const sx = tw - 5;
    const sy = this.listStartY;
    const sh = this.height - sy - 20;
    const thumbH = Math.max(40, sh * (sh / (this.maxScroll + sh + 40)));
    const thumbY = sy + (sh - thumbH) * Math.min(this.scrollY / Math.max(this.maxScroll, 1), 1);

    // 轨道
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    roundRect(ctx, sx - 3, sy, 4, sh, 2);
    ctx.fill();

    // 滑块
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    roundRect(ctx, sx - 3, thumbY, 4, thumbH, 2);
    ctx.fill();
  }

  // ========== 点击 ==========
  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    // 返回按钮
    if (this._hit(this.backBtn, x, y)) {
      this._cleanup();
      this.switchGame('menu');
      return;
    }

    // Tab 切换
    if (y >= this.tabY && y <= this.tabY + this.tabH) {
      const idx = Math.floor(x / (this.width / 3));
      if (idx >= 0 && idx < 3 && idx !== this.currentPage) {
        this.currentPage = idx;
        this.scrollY = 0;
        this._calcMaxScroll();
        this.draw();
      }
    }
  }

  _cleanup() {
    if (this.momentumTimer) clearInterval(this.momentumTimer);
    this.canvas.removeEventListener('touchstart', this._touchStart);
    this.canvas.removeEventListener('touchmove', this._touchMove);
    this.canvas.removeEventListener('touchend', this._touchEnd);
    this.canvas.removeEventListener('click', this._clickHandler);
  }

  _hit(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  destroy() {
    this._cleanup();
  }
}

// ========== Canvas圆角矩形辅助 ==========
function _roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  const [tl, tr, br, bl] = r.length === 1 ? [r[0], r[0], r[0], r[0]] : r;
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

module.exports = Achievements;
