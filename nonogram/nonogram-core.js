/**
 * nonogram-core.js — 数织（Nonogram）核心逻辑（纯函数）
 *
 * 游戏规则：
 *   1. 边缘数字表示该行/列中连续填充格子的段长度
 *   2. 玩家根据提示推断哪些格子需要填充（1=填充，2=标记空）
 *   3. 支持自动标记已完成的行/列为空
 *
 * 包含：
 *   - 棋盘初始化
 *   - 行/列匹配检查
 *   - 自动标记空行/列
 *   - 通关检查
 *   - 进度保存 & 奖励处理
 */

const { getInstance: getRewardManager } = require('../games/reward-manager');

function initGrid(size) {
  const grid = [];
  for (let r = 0; r < size; r++) {
    grid[r] = [];
    for (let c = 0; c < size; c++) {
      grid[r][c] = 0;
    }
  }
  return grid;
}

function checkLineMatch(line, hints) {
  const enc = [];
  let run = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === 1) {
      run++;
    } else if (run > 0) {
      enc.push(run);
      run = 0;
    }
  }
  if (run > 0) enc.push(run);
  if (enc.length !== hints.length) return false;
  for (let i = 0; i < enc.length; i++) {
    if (enc[i] !== hints[i]) return false;
  }
  return true;
}

function checkAndMarkEmpty(grid, size, rowHints, colHints, r, c) {
  let changed = false;

  const rowHint = rowHints[r];
  if (rowHint && rowHint.length) {
    const rowSum = rowHint.reduce((a, b) => a + b, 0);
    let rowFilled = 0, rowEmpty = 0;
    for (let cc = 0; cc < size; cc++) {
      if (grid[r][cc] === 1) rowFilled++;
      else if (grid[r][cc] === 2) rowEmpty++;
    }
    if (rowFilled === rowSum && rowFilled + rowEmpty < size) {
      if (checkLineMatch(grid[r], rowHint)) {
        for (let cc = 0; cc < size; cc++) {
          if (grid[r][cc] === 0) {
            grid[r][cc] = 2;
            changed = true;
          }
        }
      }
    }
  }

  const colHint = colHints[c];
  if (colHint && colHint.length) {
    const colSum = colHint.reduce((a, b) => a + b, 0);
    let colFilled = 0, colEmpty = 0;
    for (let rr = 0; rr < size; rr++) {
      if (grid[rr][c] === 1) colFilled++;
      else if (grid[rr][c] === 2) colEmpty++;
    }
    if (colFilled === colSum && colFilled + colEmpty < size) {
      if (checkLineMatch(grid.map(g => g[c]), colHint)) {
        for (let rr = 0; rr < size; rr++) {
          if (grid[rr][c] === 0) {
            grid[rr][c] = 2;
            changed = true;
          }
        }
      }
    }
  }

  return changed;
}

function checkVictory(grid, answer, size) {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (answer[r][c] === 1 && grid[r][c] !== 1) return false;
      if (answer[r][c] === 0 && grid[r][c] === 1) return false;
    }
  }
  return true;
}

function saveProgress(gameName, level, difficulty) {
  try {
    const baseKey = 'progress_' + gameName;
    let saved = wx.getStorageSync(baseKey);
    let progress = saved ? JSON.parse(saved) : { unlocked: 1 };
    if (level >= (progress.unlocked || 1)) {
      progress.unlocked = level + 1;
      wx.setStorageSync(baseKey, JSON.stringify(progress));
    }
    const diffKey = `progress_${gameName}_${difficulty || 'easy'}`;
    let diffSaved = wx.getStorageSync(diffKey);
    let diffProgress = diffSaved ? JSON.parse(diffSaved) : { unlocked: 1 };
    if (level >= (diffProgress.unlocked || 1)) {
      diffProgress.unlocked = level + 1;
      wx.setStorageSync(diffKey, JSON.stringify(diffProgress));
    }
  } catch (e) {}
}

function processVictoryReward(gameName, difficulty, level, timer) {
  const rewardMgr = getRewardManager();
  const rewardResult = rewardMgr.processVictory(gameName, {
    difficulty: difficulty || 'easy',
    level: level,
    time: timer
  });
  rewardMgr.showRewardToast(rewardResult);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

module.exports = {
  initGrid,
  checkLineMatch,
  checkAndMarkEmpty,
  checkVictory,
  saveProgress,
  processVictoryReward,
  roundRect,
};
