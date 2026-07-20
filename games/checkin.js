/**
 * checkin.js - 签到页面
 * 
 * 功能：
 * - 显示当月签到日历（至少一个月数据）
 * - 支持月份切换
 * - 显示连续签到天数
 * - 显示签到奖励
 */
const roundRect = require('../utils/round-rect.js');

class Checkin {
  constructor(ctx, canvas, systemInfo, switchGame) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.systemInfo = systemInfo;
    this.switchGame = switchGame;
    this.width = systemInfo.windowWidth;
    this.height = systemInfo.windowHeight;
    this.statusBarHeight = systemInfo.statusBarHeight || 44;
    this.padding = 16;

    this.currentYear = new Date().getFullYear();
    this.currentMonth = new Date().getMonth() + 1;
    this.checkinResult = null;

    try {
      const CheckInManager = require('./checkin');
      this.checkinManager = new CheckInManager();
    } catch (e) {
      this.checkinManager = null;
    }

    this.Solar = null;
    this.Lunar = null;
    this._lunarLoading = false;
    this._loadLunarSubpackage();

    this.bindEvents();
    this.draw();
  }

  _loadLunarSubpackage() {
    if (this._lunarLoading || this.Solar) return;
    this._lunarLoading = true;
    const self = this;
    wx.loadSubpackage({
      name: 'lunar',
      success: function () {
        try {
          const { Solar, Lunar } = require('../lunar/lunar-javascript.js');
          self.Solar = Solar;
          self.Lunar = Lunar;
        } catch (e) {
          self.Solar = null;
          self.Lunar = null;
        }
        self._lunarLoading = false;
        self.draw();
      },
      fail: function () {
        self._lunarLoading = false;
      }
    });
  }

  bindEvents() {
    this.clickHandler = (e) => {
      const touch = e.touches ? e.touches[0] : e;
      const x = touch.clientX;
      const y = touch.clientY;

      if (this.backBtn && x >= this.backBtn.x && x <= this.backBtn.x + this.backBtn.w &&
          y >= this.backBtn.y && y <= this.backBtn.y + this.backBtn.h) {
        this.switchGame('menu');
        return;
      }

      if (this.prevMonthBtn && x >= this.prevMonthBtn.x && x <= this.prevMonthBtn.x + this.prevMonthBtn.w &&
          y >= this.prevMonthBtn.y && y <= this.prevMonthBtn.y + this.prevMonthBtn.h) {
        this._prevMonth();
        return;
      }

      if (this.nextMonthBtn && x >= this.nextMonthBtn.x && x <= this.nextMonthBtn.x + this.nextMonthBtn.w &&
          y >= this.nextMonthBtn.y && y <= this.nextMonthBtn.y + this.nextMonthBtn.h) {
        this._nextMonth();
        return;
      }

      if (this.checkinBtn && x >= this.checkinBtn.x && x <= this.checkinBtn.x + this.checkinBtn.w &&
          y >= this.checkinBtn.y && y <= this.checkinBtn.y + this.checkinBtn.h) {
        this._doCheckin();
        return;
      }

      if (this._dayCells) {
        for (const cell of this._dayCells) {
          if (x >= cell.x && x <= cell.x + cell.size && y >= cell.y && y <= cell.y + cell.size) {
            if (cell.today && !cell.checked && this.checkinManager) {
              this._doCheckin();
            }
            return;
          }
        }
      }
    };

    this.canvas.addEventListener('click', this.clickHandler);
  }

  _prevMonth() {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.checkinResult = null;
    this.draw();
  }

  _nextMonth() {
    const today = new Date();
    const maxYear = today.getFullYear();
    const maxMonth = today.getMonth() + 1;
    
    if (this.currentYear < maxYear || (this.currentYear === maxYear && this.currentMonth < maxMonth)) {
      if (this.currentMonth === 12) {
        this.currentMonth = 1;
        this.currentYear++;
      } else {
        this.currentMonth++;
      }
      this.checkinResult = null;
      this.draw();
    }
  }

  _doCheckin() {
    if (!this.checkinManager) return;
    const result = this.checkinManager.checkIn();
    this.checkinResult = result;
    this.draw();
  }

  getLunarText(year, month, day) {
    if (!this.Solar) return '';
    try {
      const solar = this.Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      return lunar.getDayInChinese();
    } catch (e) {
      return '';
    }
  }

  draw() {
    const ctx = this.ctx;
    const W = this.width;
    const H = this.height;

    ctx.fillStyle = '#F8FAFC';
    ctx.fillRect(0, 0, W, H);

    let currentY = this.drawHeader(ctx, W);
    currentY += 12;
    
    const streak = this.checkinManager ? this.checkinManager.getStreak() : 0;
    const checkedInToday = this.checkinManager ? this.checkinManager.isCheckedInToday() : false;
    currentY = this.drawStreakPanel(ctx, W, streak, checkedInToday, currentY);
    currentY += 16;
    
    currentY = this.drawCalendar(ctx, W, H, currentY);
    currentY += 12;
    currentY = this.drawRewardRules(ctx, W, currentY);
    
    if (this.checkinResult) {
      this.drawCheckinResult(ctx, W);
    }
  }

  drawHeader(ctx, W) {
    const navH = this.statusBarHeight + 48;
    
    const headerGradient = ctx.createLinearGradient(0, 0, 0, navH + 50);
    headerGradient.addColorStop(0, '#FDF2F8');
    headerGradient.addColorStop(1, '#FEF7FF');
    ctx.fillStyle = headerGradient;
    ctx.fillRect(0, 0, W, navH + 50);

    this.backBtn = { x: 12, y: this.statusBarHeight + 6, w: 65, h: 32 };
    ctx.fillStyle = '#5B21B6';
    ctx.font = 'bold 15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('‹ 返回', this.backBtn.x, this.statusBarHeight + 28);

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 18px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📅 每日签到', W / 2, this.statusBarHeight + 30);

    const monthBarY = navH + 8;
    const monthBarH = 40;
    
    const monthBarGradient = ctx.createLinearGradient(0, monthBarY, 0, monthBarY + monthBarH);
    monthBarGradient.addColorStop(0, '#FFFFFF');
    monthBarGradient.addColorStop(1, '#FEF7FF');
    ctx.fillStyle = monthBarGradient;
    ctx.beginPath();
    roundRect(ctx, this.padding, monthBarY, W - this.padding * 2, monthBarH, 12);
    ctx.fill();

    const btnSize = 36;
    this.prevMonthBtn = { x: this.padding + 10, y: monthBarY + 2, w: btnSize, h: btnSize };
    ctx.fillStyle = '#5B21B6';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('‹', this.prevMonthBtn.x + btnSize / 2, monthBarY + 26);

    ctx.fillStyle = '#1F2937';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.currentYear}年${this.currentMonth}月`, W / 2, monthBarY + 27);

    const today = new Date();
    const canGoNext = this.currentYear < today.getFullYear() || 
                      (this.currentYear === today.getFullYear() && this.currentMonth < today.getMonth() + 1);
    
    this.nextMonthBtn = { x: W - this.padding - btnSize - 10, y: monthBarY + 2, w: btnSize, h: btnSize };
    ctx.fillStyle = canGoNext ? '#5B21B6' : '#CBD5E1';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('›', this.nextMonthBtn.x + btnSize / 2, monthBarY + 26);

    return monthBarY + monthBarH;
  }

  drawStreakPanel(ctx, W, streak, checkedInToday, startY) {
    const panelH = 44;
    
    const panelGradient = ctx.createLinearGradient(0, startY, 0, startY + panelH);
    panelGradient.addColorStop(0, '#FDF2F8');
    panelGradient.addColorStop(1, '#FCE7F3');
    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    roundRect(ctx, this.padding, startY, W - this.padding * 2, panelH, 16);
    ctx.fill();

    ctx.shadowColor = 'rgba(244, 114, 182, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = panelGradient;
    ctx.beginPath();
    roundRect(ctx, this.padding, startY, W - this.padding * 2, panelH, 16);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.fillStyle = '#BE185D';
    ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    
    let statusText = '';
    if (checkedInToday) {
      statusText = `✅ 今日已签到 🔥${streak}天`;
    } else {
      statusText = `📅 待签到 🔥${streak}天`;
    }
    ctx.fillText(statusText, W / 2, startY + 28);

    return startY + panelH;
  }

  drawCalendar(ctx, W, H, startY) {
    if (!this.checkinManager) return startY;

    const daySize = Math.min(48, (W - this.padding * 2 - 24) / 7);
    const dayGap = 4;
    const weekHeaderH = 34;

    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    roundRect(ctx, this.padding, startY, W - this.padding * 2, weekHeaderH, 10);
    ctx.fill();
    
    weekDays.forEach((day, i) => {
      const x = this.padding + 12 + i * daySize;
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 12px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(day, x + daySize / 2, startY + 20);
    });

    const calBodyStartY = startY + weekHeaderH + 8;
    const monthData = this.checkinManager.getMonthStatus(this.currentYear, this.currentMonth);
    const today = new Date();
    const isCurrentMonth = this.currentYear === today.getFullYear() && 
                          this.currentMonth === today.getMonth() + 1;

    this._dayCells = [];

    const firstWeekday = monthData[0] ? monthData[0].weekday : 1;
    const startOffset = firstWeekday;

    const rows = Math.ceil((monthData.length + startOffset) / 7);

    monthData.forEach((day, idx) => {
      const row = Math.floor((idx + startOffset) / 7);
      const col = (idx + startOffset) % 7;
      const cellX = this.padding + 12 + col * daySize;
      const cellY = calBodyStartY + row * (daySize + dayGap);

      const isToday = isCurrentMonth && day.day === today.getDate();
      const isChecked = day.checked;
      const isFuture = isCurrentMonth && day.day > today.getDate();

      this._dayCells.push({
        x: cellX,
        y: cellY,
        size: daySize,
        today: isToday,
        checked: isChecked,
        day: day.day
      });

      if (isFuture) {
        ctx.fillStyle = '#F1F5F9';
        ctx.beginPath();
        ctx.arc(cellX + daySize / 2, cellY + daySize / 2, daySize / 2 - 3, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#CBD5E1';
        ctx.font = 'bold 13px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(day.day, cellX + daySize / 2, cellY + daySize / 2 + 4);
      } else if (isToday && !isChecked) {
        const gradient = ctx.createRadialGradient(
          cellX + daySize / 2 - 4, cellY + daySize / 2 - 4, 0,
          cellX + daySize / 2, cellY + daySize / 2, daySize / 2 - 1
        );
        gradient.addColorStop(0, '#EC4899');
        gradient.addColorStop(1, '#BE185D');
        ctx.fillStyle = gradient;
        
        ctx.shadowColor = 'rgba(236, 72, 153, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(cellX + daySize / 2, cellY + daySize / 2, daySize / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 15px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(day.day, cellX + daySize / 2, cellY + daySize / 2 + 5);

        const lunarText = this.getLunarText(day.year, day.month, day.day);
        if (lunarText) {
          ctx.fillStyle = '#EC4899';
          ctx.font = '9px -apple-system,BlinkMacSystemFont,sans-serif';
          ctx.fillText(lunarText, cellX + daySize / 2, cellY + daySize / 2 + 22);
        }
      } else if (isChecked) {
        const gradient = ctx.createRadialGradient(
          cellX + daySize / 2 - 3, cellY + daySize / 2 - 3, 0,
          cellX + daySize / 2, cellY + daySize / 2, daySize / 2 - 3
        );
        gradient.addColorStop(0, '#34D399');
        gradient.addColorStop(1, '#10B981');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cellX + daySize / 2, cellY + daySize / 2, daySize / 2 - 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', cellX + daySize / 2, cellY + daySize / 2 + 4);

        const lunarText = this.getLunarText(day.year, day.month, day.day);
        if (lunarText) {
          ctx.fillStyle = '#10B981';
          ctx.font = '9px -apple-system,BlinkMacSystemFont,sans-serif';
          ctx.fillText(lunarText, cellX + daySize / 2, cellY + daySize / 2 + 20);
        }

        if (day.coins > 0) {
          ctx.fillStyle = '#FBBF24';
          ctx.font = 'bold 10px Arial';
          ctx.fillText(`${day.coins}💰金币`, cellX + daySize / 2, cellY + daySize / 2 - 10);
        }
      } else {
        ctx.fillStyle = '#E2E8F0';
        ctx.beginPath();
        ctx.arc(cellX + daySize / 2, cellY + daySize / 2, daySize / 2 - 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94A3B8';
        ctx.font = 'bold 13px -apple-system,BlinkMacSystemFont,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(day.day, cellX + daySize / 2, cellY + daySize / 2 + 4);

        const lunarText = this.getLunarText(day.year, day.month, day.day);
        if (lunarText) {
          ctx.fillStyle = '#94A3B8';
          ctx.font = '9px -apple-system,BlinkMacSystemFont,sans-serif';
          ctx.fillText(lunarText, cellX + daySize / 2, cellY + daySize / 2 + 20);
        }
      }
    });

    const btnW = 150;
    const btnH = 46;
    const btnPadding = 30;
    
    const calEndY = calBodyStartY + rows * (daySize + dayGap) + btnPadding;
    const btnY = Math.min(calEndY, H - btnH - 20);
    
    const canCheckin = this.checkinManager && !this.checkinManager.isCheckedInToday() && isCurrentMonth;
    
    this.checkinBtn = {
      x: (W - btnW) / 2,
      y: btnY,
      w: btnW,
      h: btnH
    };

    if (canCheckin) {
      const btnGradient = ctx.createLinearGradient(this.checkinBtn.x, this.checkinBtn.y, this.checkinBtn.x, this.checkinBtn.y + this.checkinBtn.h);
      btnGradient.addColorStop(0, '#EC4899');
      btnGradient.addColorStop(1, '#BE185D');
      ctx.fillStyle = btnGradient;
      
      ctx.shadowColor = 'rgba(236, 72, 153, 0.4)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      roundRect(ctx, this.checkinBtn.x, this.checkinBtn.y, this.checkinBtn.w, this.checkinBtn.h, this.checkinBtn.h / 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('立即签到', this.checkinBtn.x + this.checkinBtn.w / 2, this.checkinBtn.y + this.checkinBtn.h / 2 + 6);
    } else {
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      roundRect(ctx, this.checkinBtn.x, this.checkinBtn.y, this.checkinBtn.w, this.checkinBtn.h, this.checkinBtn.h / 2);
      ctx.fill();

      ctx.fillStyle = '#64748B';
      ctx.font = 'bold 16px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isCurrentMonth ? '今日已签到' : '该月已过期', this.checkinBtn.x + this.checkinBtn.w / 2, this.checkinBtn.y + this.checkinBtn.h / 2 + 6);
    }

    return btnY + btnH;
  }

  drawRewardRules(ctx, W, startY) {
    const panelH = 72;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    roundRect(ctx, this.padding, startY, W - this.padding * 2, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = '#FBCFE8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    roundRect(ctx, this.padding, startY, W - this.padding * 2, panelH, 12);
    ctx.stroke();

    ctx.fillStyle = '#9D174D';
    ctx.font = 'bold 13px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📋 签到规则', W / 2, startY + 20);

    const rules = [
      { left: '连续签到 7天=20💰', right: '14天=30💰' },
      { left: '连续签到 21天=40💰', right: '28天=50💰' }
    ];
    const col1X = W / 2 - 50;
    const col2X = W / 2 + 50;

    ctx.fillStyle = '#6B7280';
    ctx.font = '12px -apple-system,BlinkMacSystemFont,sans-serif';
    rules.forEach((row, i) => {
      ctx.textAlign = 'right';
      ctx.fillText(row.left, col1X, startY + 42 + i * 18);
      ctx.textAlign = 'left';
      ctx.fillText(row.right, col2X, startY + 42 + i * 18);
    });

    return startY + panelH;
  }

  drawCheckinResult(ctx, W) {
    if (!this.checkinResult) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, W, this.height);

    const dialogW = W * 0.75;
    const dialogH = 190;
    const dialogX = (W - dialogW) / 2;
    const dialogY = (this.height - dialogH) / 2 - 20;

    const dialogGradient = ctx.createLinearGradient(dialogX, dialogY, dialogX, dialogY + dialogH);
    dialogGradient.addColorStop(0, '#FFFFFF');
    dialogGradient.addColorStop(1, '#FEF7FF');
    ctx.fillStyle = dialogGradient;
    
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    ctx.beginPath();
    roundRect(ctx, dialogX, dialogY, dialogW, dialogH, 20);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    if (this.checkinResult.success) {
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 22px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 签到成功！', W / 2, dialogY + 50);

      const coins = this.checkinResult.reward ? this.checkinResult.reward.coins : 0;
      ctx.fillStyle = '#F59E0B';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(`+${coins}💰金币`, W / 2, dialogY + 90);

      ctx.fillStyle = '#374151';
      ctx.font = '14px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.fillText(`🔥 连续签到 ${this.checkinResult.streak} 天`, W / 2, dialogY + 125);
    } else {
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 20px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❌ ' + (this.checkinResult.message || '签到失败'), W / 2, dialogY + 85);
    }

    const closeBtn = { x: dialogX + 30, y: dialogY + dialogH - 50, w: dialogW - 60, h: 38 };
    const btnGradient = ctx.createLinearGradient(closeBtn.x, closeBtn.y, closeBtn.x, closeBtn.y + closeBtn.h);
    btnGradient.addColorStop(0, '#5B21B6');
    btnGradient.addColorStop(1, '#7C3AED');
    ctx.fillStyle = btnGradient;
    ctx.beginPath();
    roundRect(ctx, closeBtn.x, closeBtn.y, closeBtn.w, closeBtn.h, closeBtn.h / 2);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px -apple-system,BlinkMacSystemFont,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('确定', W / 2, closeBtn.y + closeBtn.h / 2 + 5);

    setTimeout(() => {
      this.checkinResult = null;
      this.draw();
    }, 2500);
  }

  destroy() {
    this.canvas.removeEventListener('click', this.clickHandler);
  }
}

module.exports = Checkin;