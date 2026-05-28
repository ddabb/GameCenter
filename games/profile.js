/**
 * profile.js — "我的"页面 v3.0
 * 
 * 集成：进度统计、功能入口（签到/兑换码/成就/排行）、设置开关、隐私/关于
 * 不跳转设置页，所有功能入口在页内展示
 */
const roundRect = require('../utils/round-rect.js');
const sound = require('./sound-manager');

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

    // 设置
    try {
      const raw = wx.getStorageSync('settings');
      this.settings = raw && typeof raw === 'object' ? raw : {};
    } catch (e) { this.settings = {}; }

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
      'battleship': { title: '战舰', icon: '🚢', color: '#00B5D8', totalLevels: 3000 },
      'merge-abc': { title: '合成ABC', icon: '🔤', color: '#D69E2E', totalLevels: 9999 },
      'sweep-frog': { title: '扫青蛙', icon: '🐸', color: '#48BB78', totalLevels: 9999 },
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
        const parsed = saved ? JSON.parse(saved) : null;
        this.progress[game.name] = parsed && parsed.stars ? parsed : { unlocked: 1, stars: {} };
      } catch (e) {
        this.progress[game.name] = { unlocked: 1, stars: {} };
      }
      const prog = this.progress[game.name];
      const stars = prog.stars || {};
      const completed = Object.keys(stars).length;
      totalCompleted += completed;
      for (const s of Object.values(stars)) totalStars += s;
      totalLevels += game.totalLevels;
    }
    this.totalCompleted = totalCompleted;
    this.totalStars = totalStars;
    this.totalLevels = totalLevels;

    // 成就
    try {
      const { AchievementManager } = require('./achievement-manager.js');
      const am = AchievementManager.getInstance();
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

    

    // 农历工具
    try {
      const { Solar, Lunar } = require('./lunar-javascript.js');
      this.Solar = Solar;
      this.Lunar = Lunar;
    } catch (e) {
      this.Solar = null;
      this.Lunar = null;
    }
  }

  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      // 返回按钮
      if (this.backBtn && x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w && y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
        this.switchGame('menu');
        return;
      }

      // 功能入口点击检测
      if (this._funcItems) {
        for (const item of this._funcItems) {
          if (y >= item.y && y <= item.y + item.h && x >= item.x && x <= item.x + item.w) {
            this._onFuncItemClick(item.key);
            return;
          }
        }
      }

      // 设置 toggle 点击
      if (this._settingItems) {
        for (const item of this._settingItems) {
          if (item.type === 'toggle' && item.toggleRegion) {
            const tr = item.toggleRegion;
            if (y >= tr.y && y <= tr.y + tr.h && x >= tr.x && x <= tr.x + tr.w) {
              const newVal = this.settings[item.key] !== false;
              this._setSetting(item.key, !newVal);
              this.draw();
              return;
            }
          }
          // link类型（隐私/关于）
          if (item.type === 'link' && y >= item.y && y <= item.y + item.h && x >= item.x && x <= item.x + item.w) {
            if (item.key === 'privacy') this.switchGame('privacy');
            if (item.key === 'about') this._showAbout();
            return;
          }
        }
      }

      // 底部隐私政策
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

  _onFuncItemClick(key) {
    if (key === 'redeem') {
      this.switchGame('redeem-code');
    } else if (key === 'achievements') {
      this.switchGame('achievements');
    } else if (key === 'leaderboard') {
      this.switchGame('leaderboard');
    }
  }

  

  _setSetting(key, val) {
    this.settings[key] = val;
    try { wx.setStorageSync('settings', this.settings); } catch (e) {}
    if (key === 'sound') sound.setSoundEnabled(val);
    if (key === 'vibration') sound.setVibrationEnabled(val);
  }

  _showAbout() {
    wx.showModal({
      title: '关于我们',
      content: 'SolvePuzzle v1.5.0\n12款经典益智游戏合集\n27000+关卡等你挑战\n\n如有建议，欢迎反馈！',
      showCancel: false
    });
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    this.drawBackground();
    this.drawHeader();

    let y = this.statusBarHeight + 115; // 顶部导航50 + 余额卡片44 + 间距
    y = this.drawOverview(y);
    y = this.drawFuncEntries(y);
    y = this.drawGameListHeader(y);
    y = this.drawSettings(y);
    y = this.drawFooter(y);
  }

  drawBackground() {
    const ctx = this.ctx;
    const tw = this.width;
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);
  }

  drawHeader() {
    const ctx = this.ctx;
    const tw = this.width;
    
    // 顶部导航栏（白色背景）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    
    // 标题
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('我的', tw / 2, this.statusBarHeight + 33);
    
    // 返回按钮
    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };
    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);
    
    // 余额显示
    const curY = this.statusBarHeight + 58;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    roundRect(ctx, 15, curY, tw - 30, 44, 8);
    ctx.fill();
    
    ctx.fillStyle = '#333333';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('余额', 25, curY + 30);
    
    ctx.fillStyle = '#F6AD55';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.fillText('💰' + this.coins, 60, curY + 30);
    
    ctx.fillStyle = '#9F7AEA';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('💎' + this.gems + ' ', tw - 25, curY + 30);
  }

  drawOverview(y) {
    const ctx = this.ctx;
    const W = this.width;
    const p = this.padding;

    // ── 第一行：通关 / 星星 / 成就 ──
    const row1H = 70;
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
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
      ctx.fillStyle = '#333';
      ctx.font = 'bold 18px Arial';
      ctx.fillText(String(item.value), cx, y + 48);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.font = '11px Arial';
      ctx.fillText(item.label, cx, y + 63);
    });
    y += row1H + 8;

    // ── 第二行：货币 + 签到 ──
    const row2H = 50;
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.beginPath();
    roundRect(ctx, p, y, W - p * 2, row2H, 12);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.font = '13px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('💰', p + 15, y + 22);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(String(this.coins), p + 35, y + 22);

    ctx.textAlign = 'left';
    ctx.font = '13px Arial';
    ctx.fillStyle = '#333';
    ctx.fillText('💎', p + 120, y + 22);
    ctx.fillStyle = '#64B5F6';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(String(this.gems), p + 140, y + 22);

    

    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.font = '11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`共 ${this.totalLevels} 关`, p + 15, y + 42);
    ctx.textAlign = 'right';
    ctx.fillText(`通关率 ${this.totalLevels > 0 ? Math.round(this.totalCompleted / this.totalLevels * 100) : 0}%`, W - p - 12, y + 42);

    y += row2H + 8;
    return y;
  }

  drawFuncEntries(y) {
    const ctx = this.ctx;
    const W = this.width;
    const p = this.padding;
    const itemH = 48;
    const gap = 1;

    const funcDefs = [
      { key: 'redeem',      icon: '🎁', label: '兑换码',       badge: '' },
      { key: 'achievements', icon: '🏆', label: `成就 (${this.achievementUnlocked}/${this.achievementTotal})`, badge: '' },
      { key: 'leaderboard', icon: '📊', label: '排行榜',       badge: '' },
    ];

    this._funcItems = funcDefs.map((def, i) => {
      const item = { ...def, x: p, y: y + i * (itemH + gap), w: W - p * 2, h: itemH };
      return item;
    });

    // 区标题
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('快捷功能', p + 5, y + 8);
    y += 16;

    // 重新计算位置
    this._funcItems = funcDefs.map((def, i) => {
      const item = { ...def, x: p, y: y + i * (itemH + gap), w: W - p * 2, h: itemH };
      return item;
    });

    this._funcItems.forEach(item => {
      // 行背景
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      roundRect(ctx, item.x, item.y, item.w, item.h, 8);
      ctx.fill();

      // 图标+文字
      ctx.fillStyle = '#333';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.icon, item.x + 15, item.y + 30);
      ctx.font = '15px Arial';
      ctx.fillText(item.label, item.x + 42, item.y + 30);

      // badge
      if (item.badge) {
        ctx.fillStyle = '#4CAF50';
        ctx.font = '13px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(item.badge, item.x + 42 + ctx.measureText(item.label).width + 8, item.y + 30);
      }

      // 右箭头
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.font = '18px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('›', item.x + item.w - 15, item.y + 32);
    });

    y = this._funcItems[this._funcItems.length - 1].y + itemH + 12;
    return y;
  }

  drawGameListHeader(y) {
    const ctx = this.ctx;
    const p = this.padding;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📊 各游戏进度', p + 5, y + 12);
    return y + 20;
  }

  drawSettings(y) {
    const ctx = this.ctx;
    const W = this.width;
    const p = this.padding;
    const itemH = 48;
    const gap = 1;

    // 区标题
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('⚙️ 设置', p + 5, y + 12);
    y += 18;

    const settingDefs = [
      { key: 'sound',     label: '音效', type: 'toggle' },
      { key: 'music',     label: '音乐', type: 'toggle' },
      { key: 'vibration', label: '震动', type: 'toggle' },
      { key: 'privacy',   label: '🔒 隐私政策', type: 'link' },
      { key: 'about',     label: 'ℹ️ 关于我们', type: 'link' },
    ];

    this._settingItems = settingDefs.map((def, i) => {
      const item = { ...def, x: p, y: y + i * (itemH + gap), w: W - p * 2, h: itemH };
      return item;
    });

    this._settingItems.forEach(item => {
      // 行背景
      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      ctx.beginPath();
      roundRect(ctx, item.x, item.y, item.w, item.h, 8);
      ctx.fill();

      // 标签
      ctx.fillStyle = '#333';
      ctx.font = '15px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(item.label, item.x + 15, item.y + 30);

      if (item.type === 'toggle') {
        const on = this.settings[item.key] !== false;
        const tw = 50, th = 26;
        const tx = item.x + item.w - 15 - tw;
        const ty = item.y + (item.h - th) / 2;

        // 轨道
        ctx.fillStyle = on ? '#5677FC' : '#ccc';
        ctx.beginPath();
        roundRect(ctx, tx, ty, tw, th, th / 2);
        ctx.fill();

        // 滑块
        const cx = on ? tx + tw - 3 : tx + 3;
        const cy = ty + th / 2;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(cx, cy, th / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        item.toggleRegion = { x: tx, y: ty, w: tw, h: th };
      } else {
        // 右箭头
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.font = '18px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('›', item.x + item.w - 15, item.y + 32);
      }
    });

    y = this._settingItems[this._settingItems.length - 1].y + itemH + 12;
    return y;
  }

  drawFooter(y) {
    // 不再需要单独的隐私政策按钮，已合入设置区
  }

  

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    this.canvas.removeEventListener('touchmove', this.touchMoveHandler);
  }
}

module.exports = Profile;
