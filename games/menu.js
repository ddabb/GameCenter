/**
 * menu.js - 主菜单 v3.1
 * 顶部标题 + 游戏网格，底部固定导航栏（设置/成就/排行/商城/我的）
 * 优化：安全区域适配 + 响应式布局
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
    this.safeAreaTop = systemInfo.safeAreaInsets?.top || 0;
    this.safeAreaBottom = systemInfo.safeAreaInsets?.bottom || 20;

    const CheckInManager = require('./check-in.js');
    this.checkin = new CheckInManager();
    this._showCheckin = false;
    this._checkinResult = null;

    this._sudokuBanner = null;

    this._bottomBarH = 60 + this.safeAreaBottom;
    this._bottomBarY = this.height - this._bottomBarH;
    this._navItems = [
      { key: 'home',        icon: '🎮', label: '首页' },
      { key: 'prop-shop',    icon: '🛒', label: '商城' },
      { key: 'profile',      icon: '👤', label: '我的' },
    ];
    const navW = this.width / this._navItems.length;
    this._navItems.forEach((item, i) => {
      item.x = i * navW;
      item.y = this._bottomBarY;
      item.w = navW;
      item.h = this._bottomBarH;
      item.iconSize = Math.max(22, Math.round(this._bottomBarH * 0.35));
    });

    this.games = [
      { name: 'one-stroke',    title: '一笔画',    icon: '✍️', color: '#F6AD55', cardImage: null },
      { name: 'othello',       title: '黑白棋',    icon: '⚫', color: '#4A5568', cardImage: null },
      { name: 'sweep-frog',    title: '扫青蛙',    icon: '🐸', color: '#48BB78', cardImage: null },
      { name: 'akari',         title: '灯塔',      icon: '💡', color: '#ECC94B', cardImage: null },
      { name: 'sokoban',       title: '推箱子',    icon: '📦', color: '#ED8936', cardImage: null },
      { name: 'nurikabe',      title: '数墙',      icon: '🧱', color: '#718096', cardImage: null },
      { name: 'tents',         title: '帐篷',      icon: '⛺', color: '#38A169', cardImage: null },
      { name: '24point',       title: '24点',      icon: '🧮', color: '#E53E3E', cardImage: null },
      { name: 'slither-link', title: '数回',      icon: '🔗', color: '#3182CE', cardImage: null },
      { name: 'nonogram',      title: '数织',      icon: '🎨', color: '#805AD5', cardImage: null },
      { name: 'battleship',    title: '战舰',      icon: '🚢', color: '#00B5D8', cardImage: null },
      { name: 'merge-abc',     title: '合成ABC',   icon: '🔤', color: '#D69E2E', cardImage: null },
    ];

    this._loadGameCardImages();

    this.gameTotalLevels = {
      'othello': 30, 'akari': { easy: 1000, medium: 1000, hard: 1000 },
      'sokoban': { easy: 1000, medium: 1000, hard: 1000 },
      'nurikabe': { easy: 1000, medium: 1000, hard: 1000 },
      'tents': { easy: 1000, medium: 1000, hard: 1000 },
      '24point': { easy: 500, medium: 500, hard: 500 },
      'slither-link': { easy: 1000, medium: 1000, hard: 1000 },
      'nonogram': { easy: 1000, medium: 1000, hard: 1000 },
      'battleship': { easy: 1000, medium: 1000, hard: 1000 },
      'merge-abc': 9999, 'sweep-frog': 9999, 'one-stroke': { easy: 1000, medium: 1000, hard: 1000 },
    };
    this._difficultyGames = ['akari', 'tents', 'slither-link', 'one-stroke', 'nonogram', 'nurikabe', 'sokoban', 'battleship', '24point'];

    this.padding = 16;
    this.cols = this._calculateCols();
    this.rows = Math.ceil(this.games.length / this.cols);
    this.headerH = this.safeAreaTop + this.statusBarHeight + 52;
    this.sudokuBannerH = 50;
    this.contentTop = this.headerH + this.sudokuBannerH + 8;
    this.contentBottom = this._bottomBarY - 8;
    this.contentH = this.contentBottom - this.contentTop;

    // iOS 风格图标布局：一行四个，图标占宽度约 22%
    const availW = this.width - this.padding * 2;
    this.iconSize = Math.min(Math.floor(availW * 0.22), 72);
    this.hGap = Math.max(8, Math.floor((availW - this.cols * this.iconSize) / (this.cols - 1)));
    this.vGap = 24;
    this.labelGap = 6;
    this.labelFontSize = Math.max(10, Math.floor(this.iconSize * 0.16));
    this.rowHeight = this.iconSize + this.labelGap + this.labelFontSize + 2;

    const totalGridH = this.rows * this.rowHeight + (this.rows - 1) * this.vGap;
    this.gridOffsetX = (this.width - (this.cols * this.iconSize + (this.cols - 1) * this.hGap)) / 2;
    this.startY = this.contentTop + 4;

    // 兼容旧变量名
    this.buttonSize = this.iconSize;
    this.gridGap = this.hGap;
    this.animationTime = 0;
    this.bindEvents();
    this.draw();
  }

  _loadGameCardImages() {
    this.games.forEach(game => {
      const img = wx.createImage();
      img.onload = () => {
        game.cardImage = img;
        console.log(`[Menu] 加载卡片图片成功: ${game.name}`);
      };
      img.onerror = () => {
        console.warn(`[Menu] 加载卡片图片失败: ${game.name}`);
        game.cardImage = null;
      };
      img.src = `assets/images/games/${game.name}/menu-card.png`;
    });
  }

  _calculateCols() {
    return 4;
  }

  bindEvents() {
    this.clickHandler = (e) => {
      const t = e.touches ? e.touches[0] : e;
      const x = t.clientX, y = t.clientY;

      for (const item of this._navItems) {
        if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
          sound.play('click');
          if (item.key !== 'home') this.switchGame(item.key);
          return;
        }
      }

      const sb = this._sudokuBanner;
      if (sb && x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
        sound.play('click');
        this.switchGame('sudoku-daily');
        return;
      }

      const cb = this._checkinBtn;
      if (cb && x >= cb.x && x <= cb.x + cb.w && y >= cb.y && y <= cb.y + cb.h) {
        sound.play('click');
        this.switchGame('checkin');
        return;
      }

      for (let i = 0; i < this.games.length; i++) {
        const col = i % this.cols;
        const row = Math.floor(i / this.cols);
        const bx = this.gridOffsetX + col * (this.iconSize + this.hGap);
        const by = this.startY + row * (this.rowHeight + this.vGap);
        const hitH = this.iconSize + this.labelGap + this.labelFontSize + 8;
        if (x >= bx && x <= bx + this.iconSize && y >= by && y <= by + hitH) {
          const gameName = this.games[i].name;
          const noLevelSelect = ['othello', 'sweep-frog', 'merge-abc'];
          this.switchGame(noLevelSelect.includes(gameName) ? gameName : 'level-select', gameName);
          return;
        }
      }
    };
    this.canvas.addEventListener('click', this.clickHandler);
  }

  _hitRedeemBtn(x, y) { return false; }
  _hitCheckinBtn(x, y) { return false; }

  update() {
    this.animationTime += 0.05;
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;

    ctx.clearRect(0, 0, W, H);
    if (!this._bgGradient) {
      this._bgGradient = ctx.createLinearGradient(0, 0, 0, H);
      this._bgGradient.addColorStop(0, '#EEF2FF');
      this._bgGradient.addColorStop(1, '#E8EAF6');
    }
    ctx.fillStyle = this._bgGradient;
    ctx.fillRect(0, 0, W, H);

    this._drawHeader();
    this._drawSudokuBanner();
    this._drawGrid();
    this._drawBottomBar();

    if (this._showCheckin) this._drawCheckinPopup();
  }

  _drawHeader() {
    const ctx = this.ctx;
    const W = this.width;
    const SH = this.statusBarHeight;
    const SAT = this.safeAreaTop;
    const headerTop = 0;
    const headerBottom = SAT + SH + 50;

    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(0, headerTop, W, headerBottom - headerTop);
    ctx.strokeStyle = '#E0E3ED';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerBottom);
    ctx.lineTo(W, headerBottom);
    ctx.stroke();

    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 22px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🎮 指尖谜题', this.padding, SAT + SH + 34);
  }

  _drawSudokuBanner() {
    const ctx = this.ctx;
    const W = this.width;
    const PROGRESS_KEY = 'sudoku_daily_progress';
    const todayDate = this._getTodayDate();

    let completed = false;
    try {
      const saved = wx.getStorageSync(PROGRESS_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        completed = data[todayDate] && data[todayDate].completed;
      }
    } catch (e) {}

    const bx = this.padding;
    const by = this.headerH + 6;
    const bw = W - this.padding * 2;
    const bh = this.sudokuBannerH - 6;

    const checkinBtnW = 85;
    const sudokuW = bw - checkinBtnW - 8;

    this._checkinBtn = { x: bx, y: by, w: checkinBtnW, h: bh };
    this._sudokuBanner = { x: bx + checkinBtnW + 8, y: by, w: sudokuW, h: bh };

    const checkinX = bx;
    const checkinY = by;
    const checkinChecked = this.checkin.isCheckedInToday();
    
    const checkinGradient = ctx.createLinearGradient(checkinX, checkinY, checkinX, checkinY + bh);
    if (checkinChecked) {
      checkinGradient.addColorStop(0, '#E8F5E9');
      checkinGradient.addColorStop(1, '#C8E6C9');
    } else {
      checkinGradient.addColorStop(0, '#FCE4EC');
      checkinGradient.addColorStop(1, '#F8BBD9');
    }
    ctx.fillStyle = checkinGradient;
    ctx.beginPath();
    _rr(ctx, checkinX, checkinY, checkinBtnW, bh, 12);
    ctx.fill();

    ctx.fillStyle = checkinChecked ? '#4CAF50' : '#EC407A';
    ctx.font = '18px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText(checkinChecked ? '✅' : '📅', checkinX + checkinBtnW / 2, checkinY + 18);

    ctx.fillStyle = checkinChecked ? '#2E7D32' : '#C2185B';
    ctx.font = 'bold 11px -apple-system';
    ctx.fillText(checkinChecked ? '已签到' : '签到', checkinX + checkinBtnW / 2, checkinY + 38);

    const sudokuX = bx + checkinBtnW + 8;
    
    ctx.fillStyle = completed ? 'rgba(76,175,80,0.08)' : 'rgba(156,39,176,0.08)';
    ctx.beginPath();
    _rr(ctx, sudokuX, by, sudokuW, bh, 12);
    ctx.fill();

    ctx.fillStyle = completed ? '#4CAF50' : '#9C27B0';
    ctx.beginPath();
    _rr(ctx, sudokuX, by, 4, bh, [12, 0, 0, 12]);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = completed ? '#2E7D32' : '#444';
    ctx.font = 'bold 13px -apple-system';
    ctx.fillText(completed ? '✅ 今日数独已完成' : '🧩 每日数独', sudokuX + 14, by + 20);

    ctx.fillStyle = '#888';
    ctx.font = '12px -apple-system';
    ctx.fillText('数独挑战 · 思维训练', sudokuX + 14, by + 38);

    ctx.textAlign = 'right';
    ctx.fillStyle = completed ? '#4CAF50' : '#9C27B0';
    ctx.font = 'bold 13px -apple-system';
    ctx.fillText(completed ? '已完成 ✓' : '去挑战 >', sudokuX + sudokuW - 14, by + 30);
  }

  _getTodayDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  _drawGrid() {
    const ctx = this.ctx;
    for (let i = 0; i < this.games.length; i++) {
      const game = this.games[i];
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      const bx = this.gridOffsetX + col * (this.iconSize + this.hGap);
      const hover = Math.sin(this.animationTime + i * 0.6) * 2;
      const by = this.startY + row * (this.rowHeight + this.vGap) + hover;
      const S = this.iconSize;

      if (game.cardImage) {
        ctx.drawImage(game.cardImage, bx, by, S, S);
      }

      ctx.fillStyle = '#333333';
      ctx.font = `${this.labelFontSize}px -apple-system, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(game.title, bx + S / 2, by + S + this.labelGap + this.labelFontSize * 0.8);
    }
  }

  _drawBottomBar() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    const by = this._bottomBarY, bh = this._bottomBarH;

    if (!this._bottomBarGradient) {
      this._bottomBarGradient = ctx.createLinearGradient(0, by, 0, by + bh);
      this._bottomBarGradient.addColorStop(0, '#FFFFFF');
      this._bottomBarGradient.addColorStop(1, '#F8F9FA');
    }
    ctx.fillStyle = this._bottomBarGradient;
    ctx.fillRect(0, by, W, bh);
    
    ctx.strokeStyle = '#E8ECF0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, by);
    ctx.lineTo(W, by);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, by, W, 2);

    const navW = W / this._navItems.length;
    const navColors = ['#6677FC', '#F6AD55', '#4CAF50'];
    
    this._navItems.forEach((item, i) => {
      const ix = item.x, iy = by + 8, ih = bh - 8;
      const cx = ix + navW / 2;
      const color = navColors[i % navColors.length];

      const circleGradient = ctx.createRadialGradient(cx, iy + 18, 0, cx, iy + 18, 18);
      circleGradient.addColorStop(0, color + '20');
      circleGradient.addColorStop(1, color + '08');
      ctx.fillStyle = circleGradient;
      ctx.beginPath();
      ctx.arc(cx, iy + 18, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '24px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(item.icon, cx, iy + 26);

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 12px -apple-system';
      ctx.fillText(item.label, cx, by + bh - 10);

      item.x = ix; item.y = by; item.w = navW; item.h = bh;
    });
  }

  _drawCheckinPopup() {
    const ctx = this.ctx;
    const W = this.width, H = this.height;
    const popW = W * 0.82, popH = 320;
    const popX = (W - popW) / 2, popY = (H - popH) / 2 - 20;

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    _rr(ctx, popX, popY, popW, popH, 20);
    ctx.fill();

    ctx.fillStyle = '#1A1A2E';
    ctx.font = 'bold 18px -apple-system';
    ctx.textAlign = 'center';
    ctx.fillText('📅 每日签到', W / 2, popY + 38);

    const streak = this.checkin.getStreak();
    ctx.fillStyle = '#FF6B6B';
    ctx.font = 'bold 14px -apple-system';
    ctx.fillText('🔥 连续 ' + streak + ' 天', W / 2, popY + 60);

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