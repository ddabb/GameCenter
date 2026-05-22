/**
 * leaderboard.js - 排行榜页面
 * 展示各游戏通关数量排名（本地数据）
 */
const AchievementManager = require('./achievement-manager');
const roundRect = require('../utils/round-rect.js');
const sound = require('./sound-manager');
const { ShareCard } = require('./share-card');

class Leaderboard {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };
    this.shareBtn = { x: this.width - 80, y: this.statusBarHeight + 8, w: 70, h: 32 };
    this.tabs = [
      { key: 'all', label: '总览' },
      { key: 'akari', label: '灯塔' },
      { key: 'one-stroke', label: '一笔画' },
      { key: 'slither-link', label: '数回' },
      { key: 'tents', label: '帐篷' },
    ];
    this.showShareBtn = true;
    this.currentTab = 'all';

    // 加载各游戏进度，汇总排序
    this.leaderboardData = this._loadAll();

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    this.draw();
  }

  _loadAll() {
    const games = ['akari','battleship','nonogram','nurikabe','tents',
                    'slither-link','sokoban','24point','othello','merge-abc','frog-escape','one-stroke'];
    const map = new Map(); // key → {name, title, unlocked, bestTime, totalWins}

    games.forEach(g => {
      try {
        const raw = wx.getStorageSync('progress_' + g);
        const data = raw ? JSON.parse(raw) : null;
        const unlocked = data && data.unlocked ? data.unlocked - 1 : 0;
        
        const statsRaw = wx.getStorageSync('stats_' + g);
        const stats = statsRaw ? JSON.parse(statsRaw) : null;
        const totalWins = stats && stats.totalWins ? stats.totalWins : 0;
        const totalPlays = stats && stats.totalPlays ? stats.totalPlays : 0;
        const winRate = totalPlays > 0 ? Math.round((totalWins / totalPlays) * 100) : 0;
        
        const title = this._gameTitle(g);
        map.set(g, { name: g, title, unlocked, totalWins, winRate, plays: totalPlays });
      } catch (e) { map.set(g, { name: g, title: this._gameTitle(g), unlocked: 0, totalWins: 0, winRate: 0, plays: 0 }); }
    });

    const all = Array.from(map.values()).sort((a, b) => b.unlocked - a.unlocked);
    const totalUnlocked = all.reduce((s, v) => s + v.unlocked, 0);
    const totalWins = all.reduce((s, v) => s + v.totalWins, 0);
    map.set('all', { name: 'all', title: '我的战绩', unlocked: totalUnlocked, totalWins, winRate: 0, plays: 0 });

    return map;
  }

  _gameTitle(name) {
    const names = {
      'akari': '灯塔', 'battleship': '海战', 'nonogram': '数织', 'nurikabe': '数墙',
      'tents': '帐篷', 'slither-link': '数回', 'sokoban': '推箱子', '24point': '24点',
      'othello': '黑白棋', 'merge-abc': 'ABC合成', 'frog-escape': '青蛙逃生', 'one-stroke': '一笔画'
    };
    return names[name] || name;
  }

  draw() {
    const ctx = this.ctx;
    const tw = this.width;
    const tabH = 40;
    const topH = this.statusBarHeight + 50 + tabH;

    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);

    // 顶部条
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('排行榜', tw / 2, this.statusBarHeight + 33);
    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);
    
    // 分享按钮
    if (this.showShareBtn) {
      ctx.fillStyle = '#5677FC';
      ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('分享 ›', this.shareBtn.x + this.shareBtn.w - 8, this.statusBarHeight + 30);
    }

    // Tab 行
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, this.statusBarHeight + 50, tw, tabH);
    const tabW = tw / this.tabs.length;
    this.tabs.forEach((tab, i) => {
      const tx = i * tabW;
      ctx.fillStyle = tab.key === this.currentTab ? '#5677FC' : '#999999';
      ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(tab.label, tx + tabW / 2, this.statusBarHeight + 75);
      if (tab.key === this.currentTab) {
        ctx.fillStyle = '#5677FC';
        ctx.fillRect(tx + tabW * 0.3, this.statusBarHeight + 88, tabW * 0.4, 2);
      }
    });

    // 排行列表
    const data = this._getData();
    const startY = topH + 10;
    const rowH = 60;

    if (data.length === 0) {
      ctx.fillStyle = '#AAAAAA';
      ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无排行数据', tw / 2, startY + 60);
      return;
    }

    data.forEach((item, idx) => {
      const ry = startY + idx * (rowH + 8);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      roundRect(ctx, 15, ry, tw - 30, rowH, 8);
      ctx.fill();

      // 排名
      const rankColors = ['#FFD700','#C0C0C0','#CD7F32'];
      const rk = idx + 1;
      const rkColor = rk <= 3 ? rankColors[rk - 1] : '#888888';
      ctx.fillStyle = rkColor;
      ctx.font = rk <= 3 ? 'bold 18px -apple-system' : '14px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(rk <= 3 ? ['🥇','🥈','🥉'][rk-1] : String(rk), 40, ry + 38);

      // 游戏名
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.title, 70, ry + 26);

      // 关卡数和胜率
      ctx.fillStyle = '#888888';
      ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText(`通关 ${item.unlocked} 关 · 胜率 ${item.winRate}%`, 70, ry + 48);

      // 通关次数
      if (item.totalWins > 0) {
        ctx.fillStyle = '#5677FC';
        ctx.font = 'bold 14px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`${item.totalWins} 次通关`, tw - 25, ry + 38);
      }
    });
  }

  _getData() {
    const d = this.leaderboardData.get(this.currentTab);
    if (!d) return [];
    if (this.currentTab === 'all') {
      return Array.from(this.leaderboardData.values())
        .filter(v => v.name !== 'all')
        .sort((a, b) => b.unlocked - a.unlocked);
    }
    // 单游戏空榜单提示
    return [{ title: d.title, unlocked: d.unlocked }];
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    if (this._hit(this.backBtn, x, y)) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('menu');
      return;
    }

    if (this.showShareBtn && this._hit(this.shareBtn, x, y)) {
      this._shareRanking();
      return;
    }

    // Tab 切换
    const tw = this.width;
    const tabW = tw / this.tabs.length;
    for (let i = 0; i < this.tabs.length; i++) {
      const tx = i * tabW;
      if (y >= this.statusBarHeight + 50 && y <= this.statusBarHeight + 90 &&
          x >= tx && x <= tx + tabW) {
        this.currentTab = this.tabs[i].key;
        this.draw();
        return;
      }
    }
  }

  _hit(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  async _shareRanking() {
    try {
      const totalData = this.leaderboardData.get('all');
      const shareCard = new ShareCard(this.ctx, 500, 400);
      
      const imagePath = await shareCard.generate({
        gameName: 'akari',
        gameTitle: '我的战绩',
        level: totalData.unlocked,
        stars: Math.min(3, Math.floor(totalData.unlocked / 50)),
        customText: `共通关 ${totalData.unlocked} 关 · ${totalData.totalWins} 次胜利`
      });

      if (imagePath) {
        await shareCard.share({
          path: imagePath,
          title: `我在指尖谜题通关了 ${totalData.unlocked} 关！`,
          content: '快来和我一起挑战吧！'
        });
      }
    } catch (e) {
      console.log('分享失败', e);
    }
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = Leaderboard;