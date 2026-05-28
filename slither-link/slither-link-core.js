/**
 * slither-link-core.js — 数回（Slither Link）纯逻辑
 */

/**
 * 检查当前边状态是否形成单一闭合回路
 * @returns {{ valid: boolean, reason: string }}
 */
function isSingleLoop(hEdges, vEdges, size) {
  const n = size;

  // 统计每个格点的度数
  const dotDegree = Array.from({ length: n + 1 }, () => new Array(n + 1).fill(0));

  for (let r = 0; r <= n; r++) {
    for (let c = 0; c < n; c++) {
      if (hEdges[r][c] === 1) {
        dotDegree[r][c]++;
        dotDegree[r][c + 1]++;
      }
    }
  }

  for (let r = 0; r < n; r++) {
    for (let c = 0; c <= n; c++) {
      if (vEdges[r][c] === 1) {
        dotDegree[r][c]++;
        dotDegree[r + 1][c]++;
      }
    }
  }

  // 找到第一个有度数的格点作为 BFS 起点
  let startR = -1, startC = -1;
  let totalDotsWithDegree = 0;
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      if (dotDegree[r][c] > 0) {
        if (startR === -1) { startR = r; startC = c; }
        totalDotsWithDegree++;
      }
    }
  }

  if (totalDotsWithDegree === 0) {
    return { valid: false, reason: '还没有画线' };
  }

  // 检查所有有连接的点度数是否恰好为2
  for (let r = 0; r <= n; r++) {
    for (let c = 0; c <= n; c++) {
      if (dotDegree[r][c] > 0 && dotDegree[r][c] !== 2) {
        return { valid: false, reason: '线条有分叉或断点' };
      }
    }
  }

  // BFS 检查连通性
  const visited = new Set();
  const queue = [[startR, startC]];
  visited.add(`${startR},${startC}`);

  while (queue.length > 0) {
    const [cr, cc] = queue.shift();
    if (cc + 1 <= n && hEdges[cr][cc] === 1 && !visited.has(`${cr},${cc + 1}`)) {
      visited.add(`${cr},${cc + 1}`); queue.push([cr, cc + 1]);
    }
    if (cc - 1 >= 0 && hEdges[cr][cc - 1] === 1 && !visited.has(`${cr},${cc - 1}`)) {
      visited.add(`${cr},${cc - 1}`); queue.push([cr, cc - 1]);
    }
    if (cr + 1 <= n && vEdges[cr][cc] === 1 && !visited.has(`${cr + 1},${cc}`)) {
      visited.add(`${cr + 1},${cc}`); queue.push([cr + 1, cc]);
    }
    if (cr - 1 >= 0 && vEdges[cr - 1][cc] === 1 && !visited.has(`${cr - 1},${cc}`)) {
      visited.add(`${cr - 1},${cc}`); queue.push([cr - 1, cc]);
    }
  }

  if (visited.size !== totalDotsWithDegree) {
    return { valid: false, reason: '线条未连成完整回路' };
  }

  return { valid: true, reason: '' };
}

/**
 * 保存游戏进度（解锁下一关 + 记录通关）
 */
function saveGameProgress(gameName, difficulty, level) {
  try {
    const key = 'progress_' + gameName + '_' + (difficulty || 'easy');
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

module.exports = { isSingleLoop, saveGameProgress };
