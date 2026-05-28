/**
 * sokoban-core.js - 推箱子核心逻辑
 * 纯数据逻辑，不涉及 Canvas 绘制
 */

/**
 * 判断坐标是否为墙
 */
function isWall(grid, size, r, c) {
  return r < 0 || r >= size || c < 0 || c >= size || grid[r][c] === 1;
}

/**
 * 查找指定坐标的箱子索引
 */
function getBox(boxes, r, c) {
  return boxes.findIndex(b => b.r === r && b.c === c);
}

/**
 * 执行一次移动，修改 grid/boxes/player/history（原地修改）
 * @returns {{ moved: boolean, victory: boolean }}
 */
function movePiece(grid, size, boxes, player, history, targets, dr, dc) {
  let nr = player.r + dr;
  let nc = player.c + dc;

  if (isWall(grid, size, nr, nc)) return { moved: false, victory: false };

  let boxIdx = getBox(boxes, nr, nc);

  if (boxIdx >= 0) {
    let br = nr + dr;
    let bc = nc + dc;
    if (isWall(grid, size, br, bc) || getBox(boxes, br, bc) >= 0) {
      return { moved: false, victory: false };
    }
    history.push({ r: boxes[boxIdx].r, c: boxes[boxIdx].c });
    boxes[boxIdx].r = br;
    boxes[boxIdx].c = bc;
  } else {
    history.push(null);
  }

  player.r = nr;
  player.c = nc;

  const win = checkVictory(boxes, targets);
  return { moved: true, victory: win };
}

/**
 * 检查是否胜利（所有目标上都有箱子）
 */
function checkVictory(boxes, targets) {
  for (let t of targets) {
    let onTarget = boxes.some(b => b.r === t.r && b.c === t.c);
    if (!onTarget) return false;
  }
  return true;
}

/**
 * 保存关卡进度
 */
function saveProgress(gameName, level, difficulty) {
  try {
    // 总进度
    const baseKey = 'progress_' + gameName;
    const saved = wx.getStorageSync(baseKey);
    let progress = saved ? JSON.parse(saved) : { unlocked: 1, stars: {} };
    if (level >= (progress.unlocked || 1)) {
      progress.unlocked = level + 1;
    }
    if (!progress.stars[level]) {
      progress.stars[level] = 1;
    }
    wx.setStorageSync(baseKey, JSON.stringify(progress));

    // 按难度的进度
    const diffKey = `progress_${gameName}_${difficulty || 'easy'}`;
    const diffSaved = wx.getStorageSync(diffKey);
    let diffProgress = diffSaved ? JSON.parse(diffSaved) : { unlocked: 1, stars: {} };
    if (level >= (diffProgress.unlocked || 1)) {
      diffProgress.unlocked = level + 1;
    }
    if (!diffProgress.stars[level]) {
      diffProgress.stars[level] = 1;
    }
    wx.setStorageSync(diffKey, JSON.stringify(diffProgress));
  } catch (e) {
    console.log('保存进度失败', e);
  }
}

module.exports = {
  isWall,
  getBox,
  movePiece,
  checkVictory,
  saveProgress
};
