/**
 * hint-manager.js — 通用提示管理器
 * 
 * 策略：
 * - 有答案数据的游戏（nonogram/battleship/slither-link/akari）：揭示一个正确格子
 * - 无答案数据的游戏（nurikabe/tents/sokoban/24point/merge-abc/othello）：显示"暂无提示"
 * - 每关3次提示机会，用完提示按钮灰显
 * - 提示消耗通过 storage 持久化（可选）或仅当次有效
 */

const HINT_GAMES_WITH_ANSWER = ['nonogram', 'battleship', 'slither-link', 'akari'];

class HintManager {
  constructor(maxHints = 3) {
    this.maxHints = maxHints;
    this.usedHints = 0;
    this.lastHint = null; // { row, col, value }
    this._flashTimer = null;
    this._flashVisible = false;
  }

  /**
   * 是否还能提示
   */
  canHint() {
    return this.usedHints < this.maxHints;
  }

  /**
   * 获取提示（各游戏调用）
   * @param {string} gameName 
   * @param {Array} answerData 答案数据（grid或answer数组）
   * @param {Array} currentData 当前用户状态
   * @returns {object|null} { row, col, value } 或 null
   */
  getHint(gameName, answerData, currentData) {
    if (!this.canHint()) return null;

    // 找到第一个答案与当前状态不一致的格子
    const size = answerData.length;
    const candidates = [];
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < (Array.isArray(answerData[r]) ? answerData[r].length : 0); c++) {
        const answer = Array.isArray(answerData[r]) ? answerData[r][c] : null;
        const current = currentData ? (currentData[r] ? currentData[r][c] : null) : null;
        
        // 找不同的位置
        if (answer !== null && answer !== undefined && answer !== current) {
          candidates.push({ row: r, col: c, value: answer });
        }
      }
    }

    if (candidates.length === 0) return null;

    // 随机选一个
    const hint = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastHint = hint;
    this.usedHints++;
    this._flashVisible = true;
    this._startFlash();

    return hint;
  }

  /**
   * 开始闪烁动画（3秒后停止）
   */
  _startFlash() {
    if (this._flashTimer) clearInterval(this._flashTimer);
    let count = 0;
    this._flashTimer = setInterval(() => {
      count++;
      this._flashVisible = count % 2 === 0;
      if (count > 8) {
        clearInterval(this._flashTimer);
        this._flashTimer = null;
        this._flashVisible = false;
        this.lastHint = null;
      }
    }, 300);
  }

  /**
   * 是否正在闪烁
   */
  isFlashing() {
    return this._flashVisible && this.lastHint;
  }

  /**
   * 绘制提示高亮（在游戏draw中调用）
   */
  drawHighlight(ctx, offsetX, offsetY, cellSize) {
    if (!this.isFlashing() || !this.lastHint) return;
    
    const { row, col } = this.lastHint;
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    
    ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
    ctx.fill();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * 重置（新关卡时调用）
   */
  reset() {
    this.usedHints = 0;
    this.lastHint = null;
    this._flashVisible = false;
    if (this._flashTimer) {
      clearInterval(this._flashTimer);
      this._flashTimer = null;
    }
  }

  clear() {
    this.reset();
  }
}

module.exports = { HintManager, HINT_GAMES_WITH_ANSWER };
