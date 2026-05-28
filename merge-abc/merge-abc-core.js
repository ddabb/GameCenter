/**
 * merge-abc-core.js — ABC合成记核心逻辑（纯函数 + 数据常量）
 *
 * 基于 2048 机制改编：同字母合并为下一个字母（A→B→C→...→Z）。
 *
 * 包含：
 *   - 字母常量与分数表
 *   - 颜色映射（按字母级别）
 *   - 四方向移动算法（compress + merge）
 *   - 游戏结束检测
 *   - 存档/进度保存
 */

const TILES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const SCORES = {
  A: 3, B: 6, C: 12, D: 24, E: 48, F: 96, G: 192,
  H: 384, I: 768, J: 1536, K: 3072, L: 6144, M: 12288,
  N: 24576, O: 49152, P: 98304, Q: 196608, R: 393216,
  S: 786432, T: 1572864, U: 3145728, V: 6291456,
  W: 12582912, X: 25165824, Y: 50331648, Z: 100663296
};

const COLORS = {
  A: { bg: '#eee4da', color: '#776e65' },
  B: { bg: '#ede0c8', color: '#776e65' },
  C: { bg: '#f2b179', color: '#f9f6f2' },
  D: { bg: '#f59563', color: '#f9f6f2' },
  E: { bg: '#f67c5f', color: '#f9f6f2' },
  F: { bg: '#f65e3b', color: '#f9f6f2' },
  G: { bg: '#edcf72', color: '#f9f6f2' },
  H: { bg: '#edcc61', color: '#f9f6f2' },
  I: { bg: '#edc850', color: '#f9f6f2' },
  J: { bg: '#edc53f', color: '#f9f6f2' },
  K: { bg: '#edc22e', color: '#f9f6f2' },
  L: { bg: '#3c3a32', color: '#f9f6f2' },
  M: { bg: '#3c3a32', color: '#f9f6f2' },
  N: { bg: '#3c3a32', color: '#f9f6f2' },
  O: { bg: '#f9d423', color: '#fff' },
  P: { bg: '#f9d423', color: '#fff' },
  Q: { bg: '#f9d423', color: '#fff' },
  R: { bg: '#f9d423', color: '#fff' },
  S: { bg: '#f9d423', color: '#fff' },
  T: { bg: '#f9d423', color: '#fff' },
  U: { bg: '#f9d423', color: '#fff' },
  V: { bg: '#f9d423', color: '#fff' },
  W: { bg: '#f9d423', color: '#fff' },
  X: { bg: '#f9d423', color: '#fff' },
  Y: { bg: '#f9d423', color: '#fff' },
  Z: { bg: '#ff4e50', color: '#fff' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function isInButton(x, y, bx, by, bw, bh) {
  return x >= bx && x <= bx + bw && y >= by && y <= by + bh;
}

function getRandomTile() {
  const r = Math.random();
  if (r < 0.75) return 'A';
  if (r < 0.85) return 'B';
  if (r < 0.95) return 'C';
  return 'D';
}

function addNewTile(board) {
  const empty = [];
  board.forEach((cell, i) => { if (cell === '') empty.push(i); });
  if (empty.length === 0) return false;
  const idx = empty[Math.floor(Math.random() * empty.length)];
  board[idx] = getRandomTile();
  return true;
}

function getScore(board) {
  let total = 0;
  for (let i = 0; i < board.length; i++) {
    total += SCORES[board[i]] || 0;
  }
  return total;
}

function getNextTile(tile) {
  const idx = TILES.indexOf(tile);
  return idx < TILES.length - 1 ? TILES[idx + 1] : '';
}

function compress(arr) {
  const result = arr.filter(x => x !== '');
  while (result.length < 4) result.push('');
  return result;
}

function merge(arr) {
  const result = [];
  let i = 0;
  while (i < arr.length) {
    if (i < arr.length - 1 && arr[i] === arr[i + 1] && arr[i] !== '') {
      result.push(getNextTile(arr[i]));
      i += 2;
    } else if (arr[i] !== '') {
      result.push(arr[i]);
      i++;
    } else {
      i++;
    }
  }
  while (result.length < 4) result.push('');
  const merged = JSON.stringify(result) !== JSON.stringify(arr);
  return [merged, result];
}

function moveLeft(board) {
  let moved = false;
  for (let row = 0; row < 4; row++) {
    let temp = [];
    for (let col = 0; col < 4; col++) {
      if (board[row * 4 + col] !== '') temp.push(board[row * 4 + col]);
    }
    temp = compress(temp);
    const [mergeHappened, result] = merge(temp);
    if (mergeHappened) moved = true;
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      if (result[col] !== board[idx]) { board[idx] = result[col] || ''; moved = true; }
    }
  }
  return moved;
}

function moveRight(board) {
  let moved = false;
  for (let row = 0; row < 4; row++) {
    let temp = [];
    for (let col = 3; col >= 0; col--) {
      if (board[row * 4 + col] !== '') temp.push(board[row * 4 + col]);
    }
    temp = compress(temp);
    const [mergeHappened, result] = merge(temp);
    if (mergeHappened) moved = true;
    for (let col = 3; col >= 0; col--) {
      const idx = row * 4 + col;
      if (result[3 - col] !== board[idx]) { board[idx] = result[3 - col] || ''; moved = true; }
    }
  }
  return moved;
}

function moveUp(board) {
  let moved = false;
  for (let col = 0; col < 4; col++) {
    let temp = [];
    for (let row = 0; row < 4; row++) {
      if (board[row * 4 + col] !== '') temp.push(board[row * 4 + col]);
    }
    temp = compress(temp);
    const [mergeHappened, result] = merge(temp);
    if (mergeHappened) moved = true;
    for (let row = 0; row < 4; row++) {
      const idx = row * 4 + col;
      if (result[row] !== board[idx]) { board[idx] = result[row] || ''; moved = true; }
    }
  }
  return moved;
}

function moveDown(board) {
  let moved = false;
  for (let col = 0; col < 4; col++) {
    let temp = [];
    for (let row = 3; row >= 0; row--) {
      if (board[row * 4 + col] !== '') temp.push(board[row * 4 + col]);
    }
    temp = compress(temp);
    const [mergeHappened, result] = merge(temp);
    if (mergeHappened) moved = true;
    for (let row = 3; row >= 0; row--) {
      const idx = row * 4 + col;
      if (result[3 - row] !== board[idx]) { board[idx] = result[3 - row] || ''; moved = true; }
    }
  }
  return moved;
}

function canMove(board) {
  const hasEmpty = board.some(cell => cell === '');
  if (hasEmpty) return true;
  for (let i = 0; i < 16; i++) {
    if (i % 4 !== 3 && board[i] === board[i + 1]) return true;
    if (i + 4 < 16 && board[i] === board[i + 4]) return true;
  }
  return false;
}

function checkGameOver(board) {
  return !canMove(board);
}

function saveBestScore(score, bestScore) {
  if (score > bestScore) {
    bestScore = score;
    wx.setStorageSync('merge_abc_best', bestScore);
  }
  return bestScore;
}

function saveGameData(board, score, bestScore, gameOver, history) {
  const data = JSON.stringify({ board, score, bestScore, gameOver, history });
  wx.setStorageSync('merge_abc_saved', data);
}

function saveGameProgress(gameName, level) {
  try {
    const key = 'progress_' + gameName;
    const saved = wx.getStorageSync(key);
    let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
    if (level >= progress.unlocked) {
      progress.unlocked = level + 1;
    }
    if (!progress.stars[level]) {
      progress.stars[level] = 1;
    }
    wx.setStorageSync(key, JSON.stringify(progress));
  } catch (e) {
    console.log('保存进度失败', e);
  }
}

module.exports = {
  TILES, SCORES, COLORS,
  roundRect, isInButton,
  getRandomTile, addNewTile, getScore, getNextTile,
  compress, merge,
  moveLeft, moveRight, moveUp, moveDown,
  canMove, checkGameOver,
  saveBestScore, saveGameData, saveGameProgress,
};
