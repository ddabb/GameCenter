/**
 * menu.js - 主菜单 v3.0
 * 顶部标题 + 游戏网格，底部固定导航栏（设置/成就/排行/商城/我的）
 */
const roundRect = require('../utils/round-rect.js');
const sound = require('./sound-manager');

class Menu {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 20;

    const CheckInManager = require('./check-in.js');
    this.checkin = new CheckInManager();
    this._showCheckin = false;
    this._checkinResult = null;

    // 每日挑战
    const { DailyChallenge } = require('./daily-challenge');
    this.dailyChallenge = new DailyChallenge();
    this._dailyBanner = null;

    // 底部导航栏
    this._bottomBarH = 60 + this.safeAreaBottom;
    this._bottomBarY = this.height - this._bottomBarH;
    this._navItems = [
      { key: 'settings',     icon: '⚙️', label: '设置' },
      { key: 'achievements', icon: '🏆', label: '成就' },
      { key: 'leaderboard',  icon: '📊', label: '排行' },
      { key: 'prop-shop',    icon: '🛒', label: '商城' },
      { key: 'profile',      icon: '👤', label: '我的' },
    ];
    const navW = this.width / this._navItems.length;
    this._navItems.forEach((item, i) => {
      item.x = i * navW;
      item.y = this._bottomBarY;
      item.w = navW;
      item.h = this._bottomBarH;
      item.iconSize = 26;
    });

    // 游戏列表
    this.games = [
      { name: 'one-stroke',    title: '一笔画',    icon: '✏️', color: '#F6AD55' },
      { name: 'othello',       title: '黑白棋',    icon: '⚫', color: '#4A5568' },
      { name: 'frog-escape',   title: '青蛙逃生',  icon: '🐸', color: '#48BB78' },
      { name: 'akari',         title: '灯塔',      icon: '💡', color: '#ECC94B' },
      { name: 'sokoban',       title: '推箱子',    icon: '📦', color: '#ED8936' },
      { name: 'nurikabe',      title: '数墙',      icon: '🧱', color: '#718096' },
      { name: 'tents',         title: '帐篷',      icon: '⛺', color: '#38A169' },
      { name: '24point',       title: '24点',      icon: '🧮', color: '#E53E3E' },
      { name: 'slither-link', title: '数回',      icon: '🔗', color: '#3182CE' },
      { name: 'nonogram',      title: '数织',      icon: '🎨', color: '#805AD5' },
      { name: 'battleship',    title: '海战',      icon: '🚢', color: '#00B5D8' },
      { name: 'merge-abc',     title: 'ABC合成',   icon: '🔤', color: '#D69E2E' },
    ];

    this.gameTotalLevels = {
      'othello': 30, 'akari': 3000, 'sokoban': 3003, 'nurikabe': 3001,
      'tents': 3000, '24point': 9999, 'slither-link': 3000, 'nonogram': 3001,
      'battleship': 3000, 'merge-abc': 9999, 'frog-escape': 9999, 'one-stroke': 3000,
    };

    // 布局计算
    this.padding = 16;
    this.gridGap = 10;
    this.cols = 3;
    this.headerH = this.statusBarHeight + 52;  // 标题区高度
    this.bannerH = 50;                          // 每日挑战区
    this.contentTop = this.headerH + this.bannerH + 10;
    this.contentBottom = this._bottomBarY - 8;
    this.contentH = this.contentBottom - this.contentTop;
    this.rowH = 90;   // 每行高度（卡片+间距）
    this.rows = Math.ceil(this.games.length / this.cols);
    this.buttonSize = Math.min(
      (this.width - this.padding * 2 - this.gridGap * (this.cols - 1)) / this.cols,
      (this.contentH - this.gridGap * (this.rows - 1)) / this.rows
    );
    const totalGridH = this.rows * this.buttonSize + (this.rows - 1) * this.gridGap;
    this.startY = this.contentTop + (this.contentH - totalGridH) / 2;

    this.animationTime = 0;
    this.bindEvents();
    this.draw();
  }

  bindEvents() {
    this.clickHandler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;

      // 底部导航栏
      for (const item of this._navItems) {
        if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
          sound.play('click');
          this.switchGame(item.key);
          return;
        }
      }

      // 兑换码按钮（右侧第二个）
      if (this._hitRedeemBtn(x, y)) {
        sound.play('click');
        this.switchGame('redeem-code');
        return;
      }

      // 签到按钮（右上角小图标）
      if (this._hitCheckinBtn(x, y)) {
        sound.play('click');
        this._showCheckin = !this._showCheckin;
        this.draw();
        return;
      }

      // 签到弹窗
      if (this._showCheckin) {
        const W = this.width, H = this.height;
        const popW = W * 0.82, popH = 320;
        const popX = (W - popW) / 2, popY = (H - popH) / 2 - 40;
        const btnW = 120, btnH = 40;
        const btnX = (W - btnW) / 2, btnY = popY + popH - 60;
        if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
          const result = this.checkin.checkIn();
          if (result.success) this._checkinResult = result;
          this.draw();
          return;
        }
        // 外部关闭
        if (x < popX || x > popX + popW || y < popY || y > popY + popH) {
          this._showCheckin = false;
          this._checkinResult = null;
          this.draw();
          return;
        }
        return;
      }

      // 每日挑战横幅
      const db = this._dailyBanner;
      if (db && x >= db.x && x <= db.x + db.w && y >= db.y && y <= db.y + db.h) {
        const dc = this.dailyChallenge.getToday();
        const noLevelSelect = ['othello', 'frog-escape', 'merge-abc'];
        this.switchGame(noLevelSelect.includes(dc.game) ? dc.game : 'level-select', dc.game);
        return;
      }

      // 游戏卡片
      for (let i = 0; i < this.games.length; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        const bx = this.padding + col * (this.buttonSize + this.gridGap);
        const by = this.startY + row * (this.buttonSize + this.gridGap);
        if (x >= bx && x <= bx + this.buttonSize && y >= by && y <= by + this.buttonSize) {
          const gameName = this.games[i].name;
          const noLevelSelect = ['othello', 'frog-escape', 'merge-abc'];
          this.switchGame(noLevelSelect.includes(gameName) ? gameName : 'level-select', gameName);
          return;
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _hitRedeemBtn(x, y) {
    const bx = this.width - 88, by = this.statusBarHeight + 14, bw = 36, bh = 36;
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  _hitCheckinBtn(x, y) {
    const bx = this.width - 44, by = this.statusBarHeight + 14, bw = 36, bh = 36;
    return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
  }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    // 背景
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#EEF2FF');
    bg.addColorStop(1, '#E8EAF6');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this._drawHeader();
    this._drawDailyBanner();
    this._drawGrid();
    this._drawBottomBar();

    if (this._showCheckin) this._drawCheckinPopup();
  }

  _drawHeader() {
    const ctx = this.ctx;
    const W = this.width;
    const SH = this.statusBarHeight;

    // 毛玻璃顶栏
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, 0, W, SH + 50);
    ctx.strokeStyle = '#E0E3ED';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, SH + 50);
    ctx.lineTo(W, SH + 50);
    ctx.stroke();

    // 标题
    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 22px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎮 指尖谜题', this.padding, SH + 34);

    // 兑换码按钮（右侧第二个）
    const redeemX = W - 88, redeemY = SH + 14, redeemW = 36, redeemH = 36;
    const redeemGradient = ctx.createRadialGradient(redeemX + redeemW / 2, redeemY + redeemH / 2, 0, redeemX + redeemW / 2, redeemY + redeemH / 2, redeemH / 2);
    redeemGradient.addColorStop(0, 'rgba(255,152,0,0.4)');
    redeemGradient.addColorStop(1, 'rgba(255,152,0,0.2)');
    ctx.fillStyle = redeemGradient;
    ctx.beginPath();
    ctx.arc(redeemX + redeemW / 2, redeemY + redeemH / 2, redeemH / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '18px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('🎁', redeemX + redeemW / 2, redeemY + redeemH / 2 + 6);

    // 签到按钮（右上角）
    const bx = W - 44, by = SH + 14, bw = 36, bh = 36;
    const todayChecked = this.checkin.isCheckedInToday();
    const checkinGradient = ctx.createRadialGradient(bx + bw / 2, by + bh / 2, 0, bx + bw / 2, by + bh / 2, bh / 2);
    if (todayChecked) {
      checkinGradient.addColorStop(0, 'rgba(76,175,80,0.35)');
      checkinGradient.addColorStop(1, 'rgba(76,175,80,0.15)');
    } else {
      checkinGradient.addColorStop(0, 'rgba(255,193,7,0.4)');
      checkinGradient.addColorStop(1, 'rgba(255,193,7,0.2)');
    }
    ctx.fillStyle = checkinGradient;
    ctx.beginPath();
    ctx.arc(bx + bw / 2, by + bh / 2, bh / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '18px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(todayChecked ? '✅' : '📅', bx + bw / 2, by + bh / 2 + 6);
  }

  _drawDailyBanner() {
    const ctx = this.ctx;
    const W = this.width;
    const dc = this.dailyChallenge.getToday();
    const streak = this.dailyChallenge.getStreak();
    const bx = this.padding, by = this.headerH + 6;
    const bw = W - this.padding * 2, bh = this.bannerH - 6;

    this._dailyBanner = { x: bx, y: by, w: bw, h: bh };

    // 卡片
    ctx.fillStyle = dc.completed ? 'rgba(76,175,80,0.08)' : 'rgba(102,126,234,0.08)';
    ctx.beginPath();
    _rr(ctx, bx, by, bw, bh, 12);
    ctx.fill();

    // 左侧色条
    ctx.fillStyle = dc.completed ? '#4CAF50' : '#6677FC';
    ctx.beginPath();
    _rr(ctx, bx, by, 4, bh, [12, 0, 0, 12]);
    ctx.fill();

    // 文案
    ctx.textAlign = 'left';
    ctx.fillStyle = dc.completed ? '#2E7D32' : '#444';
    ctx.font = 'bold 13px -apple-system';
    ctx.fillText(dc.completed ? '✅ 今日挑战已完成' : '📅 每日挑战', bx + 14, by + 20);

    ctx.fillStyle = '#888';
    ctx.font = '12px -apple-system';
    ctx.fillText(dc.gameTitle + ' · 第' + dc.level + '关', bx + 14, by + 38);

    // 右侧连胜
    if (streak > 0) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#FF6B6B';
      ctx.font = 'bold 13px -apple-system';
      ctx.fillText('🔥 ' + streak + '天', bx + bw - 14, by + 30);
    } else {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#AAA';
      ctx.font = '12px -apple-system';
      ctx.fillText('去挑战 >', bx + bw - 14, by + 30);
    }
  }

  _drawGrid() {
    const ctx = this.ctx;
    for (let i = 0; i < this.games.length; i++) {
      const game = this.games[i];
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const bx = this.padding + col * (this.buttonSize + this.gridGap);
      const hover = Math.sin(this.animationTime + i * 0.6) * 2;
      const by = this.startY + row * (this.buttonSize + this.gridGap) + hover;
      const S = this.buttonSize;

      // 阴影
      ctx.fillStyle = 'rgba(102,126,234,0.15)';
      ctx.beginPath();
      _rr(ctx, bx + 2, by + 3, S, S, 14);
      ctx.fill();

      // 卡片主体
      const grad = ctx.createLinearGradient(bx, by, bx + S, by + S);
      grad.addColorStop(0, this._lighten(game.color, 20));
      grad.addColorStop(1, game.color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      _rr(ctx, bx, by, S, S, 14);
      ctx.fill();

      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      _rr(ctx, bx + 6, by + 6, S - 12, S * 0.38, 8);
      ctx.fill();

      // 图标
      ctx.font = (S * 0.42) + 'px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(game.icon, bx + S / 2, by + S / 2 + 8);

      // 名称
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (S * 0.19) + 'px -apple-system';
      ctx.fillText(game.title, bx + S / 2, by + S - 24);

      // 进度
      try {
        const raw = wx.getStorageSync('progress_' + game.name);
        if (raw) {
          const prog = JSON.parse(raw);
          const done = Object.keys(prog.stars || {}).length;
          const total = this.gameTotalLevels[game.name] || 30;
          if (done > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.75)';
            ctx.font = (S * 0.15) + 'px -apple-system';
            ctx.fillText(done + '/' + total, bx + S / 2, by + S - 8);

            // 进度条
            const bW = S * 0.72, bH = 3;
            const bX = bx + (S - bW) / 2, bY = by + S - 3;
            const r = Math.min(done / total, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillRect(bX, bY, bW, bH);
            ctx.fillStyle = '#fff';
            ctx.fillRect(bX, bY, bW * r, bH);
          }
        }
      } catch (e) {}
    }
  }

  _drawBottomBar() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    const by = this._bottomBarY, bh = this._bottomBarH;

    // 渐变底栏背景
    const bgGradient = ctx.createLinearGradient(0, by, 0, by + bh);
    bgGradient.addColorStop(0, '#FFFFFF');
    bgGradient.addColorStop(1, '#F8F9FA');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, by, W, bh);
    
    // 顶部阴影线
    ctx.strokeStyle = '#E8ECF0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo(W, by);
    ctx.stroke();

    // 底部阴影
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, by, W, 2);

    const navW = W / this._navItems.length;
    const navColors = ['#6677FC', '#F6AD55', '#4CAF50', '#FF6B6B', '#9F7AEA'];
    
    this._navItems.forEach((item, i) => {
      const ix = item.x, iy = by + 8, ih = bh - 8;
      const cx = ix + navW / 2;
      const color = navColors[i % navColors.length];

      // 图标圆背景 - 使用更鲜艳的颜色
      const circleGradient = ctx.createRadialGradient(cx, iy + 18, 0, cx, iy + 18, 18);
      circleGradient.addColorStop(0, color + '20');
      circleGradient.addColorStop(1, color + '08');
      ctx.fillStyle = circleGradient;
      ctx.beginPath();
      ctx.arc(cx, iy + 18, 18, 0, Math.PI * 2);
      ctx.fill();

      // 图标 - 使用更清晰的显示
      ctx.font = '24px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(item.icon, cx, iy + 26);

      // 标签 - 使用更深的颜色提高对比度
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 12px -apple-system';
      ctx.fillText(item.label, cx, by + bh - 10);

      // 更新坐标
      item.x = ix; item.y = by; item.w = navW; item.h = bh;
    });
  }

  _drawCheckinPopup() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    const popW = W * 0.82, popH = 320;
    const popX = (W - popW) / 2, popY = (H - popH) / 2 - 20;

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);

    // 弹窗
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    _rr(ctx, popX, popY, popW, popH, 20);
    ctx.fill();

    // 标题
    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 18px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('📅 每日签到', W / 2, popY + 38);

    // 连续签到
    const streak = this.checkin.getStreak();
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 14px -apple-system';
    ctx.fillText('🔥 连续 ' + streak + ' 天', W / 2, popY + 60);

    // 本周
    const week = this.checkin.getWeekStatus();
    const dayW = (popW - 40) / 7;
    const dayStartX = popX + 20;
    const dayY = popY + 80;
    const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
    week.forEach((d, i) => {
      const dx = dayStartX + i * dayW;
      ctx.beginPath();
      ctx.arc(dx + dayW / 2, dayY + 20, 18, 0, Math.PI * 2);
      ctx.fillStyle = d.checked ? '#4CAF50' : (d.isToday ? '#FFC107' : '#f0f0f0');
      ctx.fill();
      ctx.fillStyle = d.checked ? '#fff' : '#999';
      ctx.font = 'bold 12px -apple-system';
      ctx.fillText(dayLabels[i], dx + dayW / 2, dayY + 24);
      ctx.fillStyle = d.checked ? '#4CAF50' : '#bbb';
      ctx.font = '10px -apple-system';
      ctx.fillText(d.checked ? '✓' : (d.reward.coins + '💰'), dx + dayW / 2, dayY + 50);
    });

    // 结果
    if (this._checkinResult && this._checkinResult.success) {
      const r = this._checkinResult;
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 16px -apple-system';
      ctx.fillText('✅ 签到成功！', W / 2, popY + 170);
      ctx.fillStyle = '#555';
      ctx.font = '14px -apple-system';
      ctx.fillText('获得 ' + r.reward.coins + ' 💰' + (r.reward.gems > 0 ? ' + ' + r.reward.gems + ' 💎' : ''), W / 2, popY + 195);
      if (r.bonus) {
        ctx.fillStyle = '#FF6B6B';
        ctx.fillText('🎊 ' + r.bonus.label + '：' + r.bonus.coins + ' 💰 + ' + r.bonus.gems + ' 💎', W / 2, popY + 218);
      }
    } else if (this.checkin.isCheckedInToday()) {
      ctx.fillStyle = '#999';
      ctx.font = '14px -apple-system';
      ctx.fillText('今日已签到 ✅', W / 2, popY + 185);
    }

    // 按钮
    const btnW = 120, btnH = 40;
    const btnX = (W - btnW) / 2, btnY = popY + popH - 60;
    const done = this.checkin.isCheckedInToday();
    ctx.fillStyle = done ? '#E0E0E0' : '#6677FC';
    ctx.beginPath();
    _rr(ctx, btnX, btnY, btnW, btnH, 20);
    ctx.fill();
    ctx.fillStyle = done ? '#999' : '#fff';
    ctx.font = 'bold 14px -apple-system';
    ctx.fillText(done ? '已签到' : '签到', btnX + btnW / 2, btnY + btnH / 2 + 5);
  }

  _lighten(hex, pct) {
    let num = parseInt(hex.replace('#', ''), 16);
    let amt = Math.round(2.55 * pct);
    let R = Math.min(255, (num >> 16) + amt);
    let G = Math.min(255, ((num >> 8) & 0xff) + amt);
    let B = Math.min(255, (num & 0xff) + amt);
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

function _rr(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  const [tl, tr, br, bl] = r.length === 1 ? [r[0], r[0], r[0], r[0]] : r;
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + w - tr, y);
  ctx.arcTo(x + w, y, x + w, y + tr, tr);
  ctx.lineTo(x + w, y + h - br);
  ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
  ctx.lineTo(x + bl, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl, bl);
  ctx.lineTo(x, y + tl);
  ctx.arcTo(x, y, x + tl, y, tl);
  ctx.closePath();
}

module.exports = Menu;
