/**
 * prop-shop.js - 道具商城页面
 * 使用金币购买提示、撤销、答案等道具
 */
const CheckInManager = require('./check-in');
const sound = require('./sound-manager');

class PropShop {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    // 加载货币
    this.currency = CheckInManager.getCurrency();

    // 道具列表
    this.props = [
      {
        key: 'hint', title: '💡 提示', desc: '显示一个格子的正确答案',
        price: 10, icon: '💡', color: '#ECC94B',
        limit: '每关限用3次'
      },
      {
        key: 'undo', title: '↩️ 撤销', desc: '撤销上一步操作',
        price: 5, icon: '↩️', color: '#4299E1',
        limit: '每关不限次数'
      },
      {
        key: 'answer', title: '🔍 答案', desc: '直接显示本关答案',
        price: 50, icon: '🔍', color: '#48BB78',
        limit: '每关限用1次'
      },
      {
        key: 'extra_life', title: '❤️ 额外生命', desc: '错误时不立即结束',
        price: 30, icon: '❤️', color: '#F56565',
        limit: '仅部分游戏有效'
      },
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

    // 顶部条
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('道具商城', tw / 2, this.statusBarHeight + 33);
    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 30);

    // 货币展示
    const curY = this.statusBarHeight + 58;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(15, curY, tw - 30, 44, 8);
    ctx.fill();

    ctx.fillStyle = '#F6AD55';
    ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💰 ' + this.currency.coins, tw / 2 - 60, curY + 30);

    ctx.fillStyle = '#9F7AEA';
    ctx.fillText('💎 ' + this.currency.gems, tw / 2 + 60, curY + 30);

    ctx.fillStyle = '#5677FC';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('余额', tw / 2 - 30, curY + 30);

    // 提示文字
    const tipY = curY + 52;
    ctx.fillStyle = '#888888';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('道具在游戏中使用，道具商城仅供购买储备', tw / 2, tipY);

    // 道具列表
    const listY = tipY + 18;
    const cardH = 76;
    const cardGap = 10;
    const padding = 15;

    this.props.forEach((prop, idx) => {
      const ry = listY + idx * (cardH + cardGap);
      if (ry + cardH > this.height - 20) return;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(padding, ry, tw - padding * 2, cardH, 10);
      ctx.fill();

      // 左侧色条
      ctx.fillStyle = prop.color;
      ctx.beginPath();
      ctx.roundRect(padding, ry, 4, cardH, 2);
      ctx.fill();

      // 图标
      ctx.font = '32px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(prop.icon, padding + 38, ry + 48);

      // 名称
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(prop.title, padding + 68, ry + 28);

      // 描述+限制
      ctx.fillStyle = '#888888';
      ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText(prop.desc + ' · ' + prop.limit, padding + 68, ry + 48);

      // 购买按钮
      const btnW = 68, btnH = 32;
      const btnX = tw - padding - btnW;
      const btnY = ry + (cardH - btnH) / 2;
      const canAfford = this.currency.coins >= prop.price;

      ctx.fillStyle = canAfford ? '#5677FC' : '#CCCCCC';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, btnH / 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💰 ' + prop.price, btnX + btnW / 2, btnY + 21);

      prop._buyBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    });
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    if (this._hit(this.backBtn, x, y)) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('menu');
      return;
    }

    // 点击购买按钮
    for (let i = 0; i < this.props.length; i++) {
      const prop = this.props[i];
      if (prop._buyBtn) {
        const b = prop._buyBtn;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this._buyProp(prop);
          return;
        }
      }
    }
  }

  _buyProp(prop) {
    if (this.currency.coins < prop.price) {
      wx.showToast({ title: '金币不足', icon: 'none' });
      return;
    }

    // 扣除金币，发放道具
    CheckInManager.spendCoins(prop.price);
    // TODO: 发放道具到背包（prop-bag storage）
    try {
      const bag = wx.getStorageSync('prop_bag') || {};
      bag[prop.key] = (bag[prop.key] || 0) + 1;
      wx.setStorageSync('prop_bag', bag);
    } catch (e) {}

    this.currency = CheckInManager.getCurrency();
    wx.showToast({ title: '购买成功！', icon: 'success' });
    this.draw();
  }

  _hit(btn, x, y) {
    return x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h;
  }

  destroy() {
    this.canvas.removeEventListener('click', this._clickHandler);
  }
}

module.exports = PropShop;