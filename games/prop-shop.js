/**
 * prop-shop.js - 道具商城页面
 * 使用金币购买提示、撤销、答案等道具
 */
const CheckInManager = require('./check-in');
const sound = require('./sound-manager');
const { PropManager, PROP_CONFIG, getInstance } = require('./prop-manager');

class PropShop {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.propMgr = getInstance();

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    this.currency = CheckInManager.getCurrency();
    this.props = Object.entries(PROP_CONFIG).map(([key, config]) => ({
      key,
      title: config.icon + ' ' + config.name,
      desc: config.desc,
      price: config.price,
      icon: config.icon,
      color: key === 'hint' ? '#ECC94B' : (key === 'undo' ? '#4299E1' : (key === 'answer' ? '#48BB78' : '#F56565')),
      limit: config.perLevel > 0 ? `每关限用${config.perLevel}次` : '每关不限次数'
    }));

    this._clickHandler = this._onClick.bind(this);
    this.canvas.addEventListener('click', this._clickHandler);
    this.draw();
  }

  _refreshData() {
    this.currency = CheckInManager.getCurrency();
    this.props.forEach(prop => {
      prop.count = this.propMgr.getPropCount(prop.key);
    });
  }

  draw() {
    const ctx = this.ctx;
    const tw = this.width;
    this._refreshData();

    ctx.clearRect(0, 0, tw, this.height);
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, tw, this.height);

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

    const tipY = curY + 52;
    ctx.fillStyle = '#888888';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('道具在游戏中使用，道具商城仅供购买储备', tw / 2, tipY);

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

      ctx.fillStyle = prop.color;
      ctx.beginPath();
      ctx.roundRect(padding, ry, 4, cardH, 2);
      ctx.fill();

      ctx.font = '32px -apple-system';
      ctx.textAlign = 'center';
      ctx.fillText(prop.icon, padding + 38, ry + 48);

      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(prop.title, padding + 68, ry + 28);

      ctx.fillStyle = '#888888';
      ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
      const stockText = prop.count > 0 ? `库存${prop.count} · ` : '';
      ctx.fillText(stockText + prop.desc + ' · ' + prop.limit, padding + 68, ry + 48);

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

    CheckInManager.spendCoins(prop.price);
    this.propMgr.addProp(prop.key, 1);
    sound.play('click');
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