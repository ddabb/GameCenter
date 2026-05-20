/**
 * profile.js — "我的"页面 v2.0
 * 
 * 集成：进度统计、成就、签到、货币、隐私政策
 * 不跳转，所有内容页内展示
 */
const roundRect = require('../utils/round-rect.js');

class Profile {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.padding = 15;

    // 游戏信息
    this.gameInfo = {
      'othello': { title: '黑白棋', icon: '⚫', color: '#4A5568', totalLevels: 30 },
      'akari': { title: '灯塔', icon: '💡', color: '#ECC94B', totalLevels: 3000 },
      'sokoban': { title: '推箱子', icon: '📦', color: '#ED8936', totalLevels: 3003 },
      'nurikabe': { title: '数墙', icon: '🧱', color: '#718096', totalLevels: 3001 },
      'tents': { title: '帐篷', icon: '⛺', color: '#38A169', totalLevels: 3000 },
      '24point': { title: '24点', icon: '🧮', color: '#E53E3E', totalLevels: 9999 },
      'slither-link': { title: '数回', icon: '🔗', color: '#3182CE', totalLevels: 3000 },
      'nonogram': { title: '数织', icon: '🎨', color: '#805AD5', totalLevels: 3001 },
      'battleship': { title: '海战', icon: '🚢', color: '#00B5D8', totalLevels: 3000 },
      'merge-abc': { title: 'ABC合成', icon: '🔤', color: '#D69E2E', totalLevels: 9999 },
      'frog-escape': { title: '青蛙逃生', icon: '🐸', color: '#48BB78', totalLevels: 9999 },
      'one-stroke': { title: '一笔画', icon: '✏️', color: '#F6AD55', totalLevels: 3000 }
    };
    this.games = Object.keys(this.gameInfo).map(k => ({ name: k, ...this.gameInfo[k] }));

    this.loadAllData();
    this.scrollY = 0;
    this.maxScroll = 0;
    this.animationTime = 0;
    this.bindEvents();
  }

  loadAllData() {
    // 进度
    this.progress = {};
    let totalCompleted = 0, totalStars = 0, totalLevels = 0;
    for (const game of this.games) {
      try {
        const saved = wx.getStorageSync(`progress_${game.name}`);
        this.progress[game.name] = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
      } catch (e) {
        this.progress[game.name] = { unlocked: 1, stars: {} };
      }
      const prog = this.progress[game.name];
      const completed = Object.keys(prog.stars).length;
      totalCompleted += completed;
      for (const s of Object.values(prog.stars)) totalStars += s;
      totalLevels += game.totalLevels;
    }
    this.totalCompleted = totalCompleted;
    this.totalStars = totalStars;
    this.totalLevels = totalLevels;

    // 成就
    try {
      const { AchievementManager } = require('./achievement-manager.js');
      const am = new AchievementManager();
      this.achievementUnlocked = am.getUnlockedCount();
      this.achievementTotal = am.getTotalCount();
    } catch (e) {
      this.achievementUnlocked = 0;
      this.achievementTotal = 0;
    }

    // 货币
    try {
      const cur = JSON.parse(wx.getStorageSync('currency') || '{"coins":0,"gems":0}');
      this.coins = cur.coins || 0;
      this.gems = cur.gems || 0;
    } catch (e) {
      this.coins = 0;
      this.gems = 0;
    }

    // 签到
    try {
      const CheckInManager = require('./check-in.js');
      const ci = new CheckInManager();
      this.checkinStreak = ci.getStreak();
      this.checkedInToday = ci.isCheckedInToday();
    } catch (e) {
      this.checkinStreak = 0;
      this.checkedInToday = false;
    }
  }

  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      // 返回按钮
      if (y >= 15 && y <= 55 && x >= this.padding && x <= this.padding + 70) {
        this.switchGame('menu');
        return;
      }

      // 隐私政策
      if (y >= this.height - 55 && y <= this.height - 20) {
        if (x >= this.width - this.padding - 90 && x <= this.width - this.padding) {
          this.switchGame('privacy');
          return;
        }
      }
    };

    // 滚动
    this.touchStartY = 0;
    this.touchStartScrollY = 0;
    this.touchStartHandler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      this.touchStartY = t.clientY;
      this.touchStartScrollY = this.scrollY;
    };
    this.touchMoveHandler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const dy = this.touchStartY - t.clientY;
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.touchStartScrollY + dy));
    };

    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: true });
    this.canvas.addEventListener('touchmove', this.touchMoveHandler, { passive: true });
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    this.drawBackground();
    this.drawHeader();
    this.drawOverview();
    this.drawGameList();
    this.drawFooter();
  }

  drawBackground() {
    const g = this.ctx.createLinearGradient(0, 0, 0, this.height);
    g.addColorStop(0, '#1a1a2e');
    g.addColorStop(1, '#16213e');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawHeader() {
    // 返回按钮
    this.ctx.fillStyle = 'rgba(255,255,255,0.1)';
    this.ctx.beginPath();
    roundRect(this.ctx, this.padding, 15, 70, 35, 8);
    this.ctx.fill();
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('← 返回', this.padding + 35, 38);

    // 标题
    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('👤 我的', this.width / 2, 38);
  }

  drawOverview() {
    const ctx = this.ctx;
    const W = this.width;
    const p = this.padding;
    let y = 65;

    // ── 第一行：通关 / 星星 / 成就 ──
    const row1H = 70;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    roundRect(ctx, p, y, W - p * 2, row1H, 12);
    ctx.fill();

    const cols3 = [
      { icon: '🎮', value: this.totalCompleted, label: '已通关' },
      { icon: '⭐', value: this.totalStars, label: '星星' },
      { icon: '🏆', value: `${this.achievementUnlocked}/${this.achievementTotal}`, label: '成就' },
    ];
    cols3.forEach((item, i) => {
      const cx = p + (W - p * 2) / 3 * i + (W - p * 2) / 6;
      ctx.font = '22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(item.icon, cx, y + 25);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(String(item.value), cx, y + 48);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Arial';
      ctx.fillText(item.label, cx, y + 63);
    });
    y += row1H + 8;

    // ── 第二行：货币 + 签到 ──
    const row2H = 50;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    roundRect(ctx, p, y, W - p * 2, row2H, 12);
    ctx.fill();

    // 金币
    ctx.textAlign = 'left';
    ctx.font = '13px Arial';
    ctx.fillText('💰', p + 15, y + 22);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(String(this.coins), p + 35, y + 22);

    // 钻石
    ctx.textAlign = 'left';
    ctx.font = '13px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText('💎', p + 120, y + 22);
    ctx.fillStyle = '#64B5F6';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(String(this.gems), p + 140, y + 22);

    // 签到
    ctx.textAlign = 'right';
    ctx.fillStyle = this.checkedInToday ? '#4CAF50' : '#FFC107';
    ctx.font = '13px Arial';
    const checkinText = this.checkedInToday
      ? `✅ 已签到 🔥${this.checkinStreak}天`
      : `📅 待签到 🔥${this.checkinStreak}天`;
    ctx.fillText(checkinText, W - p - 12, y + 22);

    // 总关卡
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`共 ${this.totalLevels} 关`, p + 15, y + 42);
    ctx.textAlign = 'right';
    ctx.fillText(`通关率 ${this.totalLevels > 0 ? Math.round(this.totalCompleted / this.totalLevels * 100) : 0}%`, W - p - 12, y + 42);

    y += row2H + 8;

    // ── 各游戏进度标题 ──
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📊 各游戏进度', p + 5, y + 12);
  }

  drawGameList() {
    const ctx = this.ctx;
    const p = this.padding;
    const W = this.width;
    const itemH = 55;
    const startY = 208;
    const endY = this.height - 65;
    const totalH = this.games.length * itemH;
    this.maxScroll = Math.max(0, totalH - (endY - startY));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, startY, W, endY - startY);
    ctx.clip();

    const offset = -this.scrollY;

    for (let i = 0; i < this.games.length; i++) {
      const game = this.games[i];
      const info = this.gameInfo[game.name];
      const prog = this.progress[game.name];
      const completed = Object.keys(prog.stars).length;
      const stars = Object.values(prog.stars).reduce((a, b) => a + b, 0);
      const ratio = info.totalLevels > 0 ? completed / info.totalLevels : 0;

      const iy = startY + offset + i * itemH;
      if (iy + itemH < startY || iy > endY) continue;

      // 背景条
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.beginPath();
      roundRect(ctx, p, iy + 2, W - p * 2, itemH - 6, 8);
      ctx.fill();

      // 图标
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(info.icon, p + 22, iy + 30);

      // 名称 + 关卡数
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(info.title, p + 48, iy + 22);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Arial';
      ctx.fillText(`${completed}/${info.totalLevels}`, p + 48, iy + 38);

      // 进度条
      const barX = p + 120;
      const barW = W - barX - 70;
      const barH = 6;
      const barY = iy + 27;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      roundRect(ctx, barX, barY, barW, barH, 3);
      ctx.fill();
      if (ratio > 0) {
        ctx.fillStyle = info.color;
        ctx.beginPath();
        roundRect(ctx, barX, barY, barW * ratio, barH, 3);
        ctx.fill();
      }

      // 百分比
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '11px Arial';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(ratio * 100)}%`, W - p - 12, iy + 32);
    }

    ctx.restore();
  }

  drawFooter() {
    const ctx = this.ctx;
    const p = this.padding;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, this.height - 55, this.width, 55);

    // 隐私政策
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    roundRect(ctx, this.width - p - 90, this.height - 45, 90, 30, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🔒 隐私政策', this.width - p - 45, this.height - 26);
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
  }
}

module.exports = Profile;
