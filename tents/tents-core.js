/**
 * tents-core.js — 帐篷谜题（Tents）核心逻辑
 *
 * 提供帐篷谜题的纯数据逻辑函数，不涉及 Canvas 绘制：
 *   - calcLayout：计算棋盘布局参数（格子大小、偏移量）
 *   - calcRowHints / calcColHints：根据树木分布计算行列提示数
 *   - countRowTents / countColTents：统计当前行列已放置的帐篷数
 *   - checkVictory：完整通关验证（帐篷-树匹配、不相邻、行列计数一致）
 *   - saveProgress：保存关卡进度到本地存储
 *
 * @subpackage tents
 */

/**
 * 计算布局参数
 */
function calcLayout(size, width, height, headerBar, statusBarHeight) {
  const topY = (headerBar ? headerBar.boardStartY : statusBarHeight + 79);
  const bottomY = height - 76;
  const hintMargin = 25;
  const statusH = 35;

  const availH = bottomY - topY - statusH - hintMargin;
  const availW = width - hintMargin * 2 - 20;

  const maxCellH = availH / size;
  const maxCellW = availW / size;
  let cellSize = Math.floor(Math.min(maxCellH, maxCellW, 50));
  cellSize = Math.max(cellSize, 20);

  const boardOffsetX = (width - cellSize * size) / 2 + hintMargin / 2;
  const boardOffsetY = topY + statusH + hintMargin;

  return { cellSize, boardOffsetX, boardOffsetY };
}

/**
 * 行提示计算（根据当前 board 统计树的数量 → 实际帐篷需求）
 */
function calcRowHints(board, size) {
  const hints = [];
  for (let r = 0; r < size; r++) {
    let cnt = 0;
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 1) cnt++;
    }
    hints.push(cnt);
  }
  return hints;
}

function calcColHints(board, size) {
  const hints = [];
  for (let c = 0; c < size; c++) {
    let cnt = 0;
    for (let r = 0; r < size; r++) {
      if (board[r][c] === 1) cnt++;
    }
    hints.push(cnt);
  }
  return hints;
}

function countRowTents(tents, row) {
  let count = 0;
  for (let c = 0; c < tents[row].length; c++) {
    if (tents[row][c] === 1) count++;
  }
  return count;
}

function countColTents(tents, size, col) {
  let count = 0;
  for (let r = 0; r < size; r++) {
    if (tents[r][col] === 1) count++;
  }
  return count;
}

/**
 * 完整通关检查
 * @returns {boolean}
 */
function checkVictory(tents, board, size, rowHints, colHints) {
  if (!size || size <= 0) return false;

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const allDirs = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];

  // 每个帐篷必须有相邻的树
  const treeWithTent = {};
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 1) treeWithTent[`${r},${c}`] = false;
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (tents[r][c] === 1) {
        let hasAdjacentTree = false;
        for (const [dr, dc] of dirs) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === 1) {
            hasAdjacentTree = true;
            treeWithTent[`${nr},${nc}`] = true;
          }
        }
        if (!hasAdjacentTree) return false;
      }
    }
  }

  // 每棵树至少有一个帐篷
  for (const key in treeWithTent) {
    if (!treeWithTent[key]) return false;
  }

  // 帐篷不相邻（8方向）
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (tents[r][c] === 1) {
        for (const [dr, dc] of allDirs) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size && tents[nr][nc] === 1) {
            return false;
          }
        }
      }
    }
  }

  // 行/列计数匹配
  for (let r = 0; r < size; r++) {
    if (countRowTents(tents, r) !== rowHints[r]) return false;
  }
  for (let c = 0; c < size; c++) {
    if (countColTents(tents, size, c) !== colHints[c]) return false;
  }

  return true;
}

function saveProgress(gameName, difficulty, level) {
  try {
    const key = 'progress_' + gameName + '_' + (difficulty || 'easy');
    const saved = wx.getStorageSync(key);
    let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
    if (level >= progress.unlocked) progress.unlocked = level + 1;
    if (!progress.stars[level]) progress.stars[level] = 1;
    wx.setStorageSync(key, JSON.stringify(progress));
  } catch (e) {
    console.log('[Tents] 保存进度失败', e);
  }
}

module.exports = {
  calcLayout,
  calcRowHints,
  calcColHints,
  countRowTents,
  countColTents,
  checkVictory,
  saveProgress
};
