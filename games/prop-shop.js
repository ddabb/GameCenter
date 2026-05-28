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
      // 原生 roundRect 需要数组格式的半径参数
      const originalRoundRect = ctx.roundRect.bind(ctx);
      ctx.roundRect = function(x, y, w, h, r) {
        const radii = Array.isArray(r) ? r : [r, r, r, r];
        originalRoundRect(x, y, w, h, radii);
      };
    }

    this.backBtn = { x: 10, y: this.statusBarHeight + 8, w: 70, h: 32 };

    this.currency = CheckInManager.getCurrency();
    this.props = Object.entries(PROP_CONFIG).map(([key, config]) => ({
      key,
      name: config.name,
      title: config.icon + ' ' + config.name,
      desc: config.desc,
      price: config.price,
      icon: config.icon,
      image: null,
      color: key === 'hint' ? '#ECC94B' : (key === 'undo' ? '#4299E1' : (key === 'answer' ? '#48BB78' : '#F56565')),
      limit: config.perLevel > 0 ? `每关限用${config.perLevel}次` : '每关不限次数'
    }));

    // 加载 twemoji 图标图片
    this._imagesLoaded = 0;
    this.props.forEach(prop => {
      const img = wx.createImage();
      img.onload = () => {
        prop.image = img;
        this._imagesLoaded++;
        if (this._imagesLoaded >= this.props.length) this.draw();
      };
      img.onerror = () => {
        this._imagesLoaded++;
        if (this._imagesLoaded >= this.props.length) this.draw();
      };
      img.src = `assets/images/props/${prop.key}.png`;
    });

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

    // 顶部导航栏
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, tw, this.statusBarHeight + 50);
    const navCenterY = this.statusBarHeight + 25;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#333333';
    ctx.font = 'bold 17px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('道具商城', tw / 2, navCenterY);

    ctx.fillStyle = '#5677FC';
    ctx.font = '15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, navCenterY);

    ctx.textBaseline = 'alphabetic';

    // 余额显示
    const curY = this.statusBarHeight + 58;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(15, curY, tw - 30, 44, 8);
    ctx.fill();

    const balCenterY = curY + 22;
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#333333';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('余额', 25, balCenterY);

    ctx.fillStyle = '#F6AD55';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💰 ' + this.currency.coins + ' 金币', 60, balCenterY);

    ctx.fillStyle = '#9F7AEA';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('💎 ' + this.currency.gems + ' 宝石', tw - 25, balCenterY);

    ctx.textBaseline = 'alphabetic';

    // 提示文字
    const tipY = curY + 60;
    ctx.fillStyle = '#888888';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('道具在游戏中使用，道具商城仅供购买储备', tw / 2, tipY);

    // 道具列表（跟随提示文字底部动态计算）
    const listY = tipY + 24;
    const cardH = 76;
    const cardGap = 10;
    const padding = 15;

    this.props.forEach((prop, idx) => {
      const ry = listY + idx * (cardH + cardGap);
      if (ry + cardH > this.height - 20) return;

      // 卡片背景
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(padding, ry, tw - padding * 2, cardH, 10);
      ctx.fill();

      // 左侧彩色条
      ctx.fillStyle = prop.color;
      ctx.beginPath();
      ctx.roundRect(padding, ry, 4, cardH, 2);
      ctx.fill();

      // 图标（左对齐，垂直居中）
      const imgSize = 42;
      const imgX = padding + 12;
      const imgY = ry + (cardH - imgSize) / 2;
      if (prop.image) {
        ctx.drawImage(prop.image, imgX, imgY, imgSize, imgSize);
      } else {
        // 图片未加载完成时 emoji 兜底
        ctx.font = '32px -apple-system';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(prop.icon, imgX + imgSize / 2, ry + cardH / 2);
        ctx.textBaseline = 'alphabetic';
      }

      // 标题
      ctx.fillStyle = '#333333';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(prop.name, padding + 68, ry + 30);

      // 描述
      ctx.fillStyle = '#888888';
      ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
      const stockText = prop.count > 0 ? `库存${prop.count} · ` : '';
      ctx.fillText(stockText + prop.desc + ' · ' + prop.limit, padding + 68, ry + 52);

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
      ctx.textBaseline = 'middle';
      ctx.fillText('💰' + prop.price + '金币', btnX + btnW / 2, btnY + btnH / 2);
      ctx.textBaseline = 'alphabetic';

      prop._buyBtn = { x: btnX, y: btnY, w: btnW, h: btnH };
    });
  }

  _onClick(e) {
    const t = e.touches ? e.touches[0] : e;
    const x = t.clientX, y = t.clientY;

    // 返回按钮
    if (x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
        y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
      this.canvas.removeEventListener('click', this._clickHandler);
      this.switchGame('menu');  // 返回菜单页面
      return;
    }

    // 购买按钮
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
