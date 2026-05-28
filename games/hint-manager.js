/**
 * hint-manager.js — 通用提示管理器
 * 
 * 策略：
 * - 有答案数据的游戏（nonogram/battleship/slither-link/akari）：揭示一个正确格子
 * - 无答案数据的游戏（nurikabe/tents/sokoban/24point/merge-abc/othello）：显示"暂无提示"
 * - 每关3次提示机会，用完提示按钮灰显
 * - 提示消耗通过 storage 持久化（可选）或仅当次有效
 */
const roundRect = require('../utils/round-rect.js');

const HINT_GAMES_WITH_ANSWER = ['nonogram', 'battleship', 'slither-link', 'akari'];

class HintManager {
  constructor(maxHints = 3) {
    this.maxHints = maxHints;
    this.usedHints = 0;
    this.lastHint = null;
    this._flashTimer = null;
    this._flashVisible = false;
    this._ctx = null;
  }

  setContext(ctx) {
    this._ctx = ctx;
  }

  canHint() {
    return this.usedHints < this.maxHints;
  }

  getHint(gameName, puzzleData, currentData) {
    if (!this.canHint()) return null;

    if (gameName === 'akari') {
      return this._getAkariHint(puzzleData, currentData);
    }

    if (gameName === 'nonogram' || gameName === 'battleship' || gameName === 'slither-link') {
      return this._getHintFromGrid(puzzleData, currentData);
    }

    return null;
  }

  _getAkariHint(puzzleData, currentData) {
    if (!puzzleData || !puzzleData.grid) return null;
    
    const grid = puzzleData.grid;
    const size = grid.length;
    const lights = currentData;
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (grid[r][c] >= 2) continue;
        if (lights && lights[r] && lights[r][c]) continue;
        
        if (puzzleData.answer && Array.isArray(puzzleData.answer)) {
          const isAnswer = puzzleData.answer.some(([ar, ac]) => ar === r && ac === c);
          if (isAnswer) {
            const hint = { row: r, col: c, value: true };
            this.lastHint = hint;
            this.usedHints++;
            return hint;
          }
        }
      }
    }
    
    return null;
  }

  _getHintFromGrid(puzzleData, currentData) {
    let answerData = puzzleData;
    
    if (puzzleData.grid) {
      answerData = puzzleData.grid;
    } else if (puzzleData.answer) {
      return null;
    }
    
    const size = answerData.length;
    const candidates = [];
    
    for (let r = 0; r < size; r++) {
      const rowData = answerData[r];
      if (!rowData) continue;
      const rowLen = Array.isArray(rowData) ? rowData.length : 0;
      
      for (let c = 0; c < rowLen; c++) {
        const answer = Array.isArray(rowData) ? rowData[c] : null;
        const current = currentData && currentData[r] ? currentData[r][c] : null;
        
        if (answer !== null && answer !== undefined && answer !== current) {
          candidates.push({ row: r, col: c, value: answer });
        }
      }
    }

    if (candidates.length === 0) return null;

    const hint = candidates[Math.floor(Math.random() * candidates.length)];
    this.lastHint = hint;
    this.usedHints++;
    this._flashVisible = true;
    this._startFlash();

    return hint;
  }

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

  isFlashing() {
    return this._flashVisible && this.lastHint;
  }

  drawHighlight(ctx, offsetX, offsetY, cellSize) {
    if (!this.isFlashing() || !this.lastHint) return;
    
    const { row, col } = this.lastHint;
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    
    ctx.fillStyle = 'rgba(76, 175, 80, 0.4)';
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
    } else {
      ctx.rect(x + 2, y + 2, cellSize - 4, cellSize - 4);
    }
    ctx.fill();
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

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
