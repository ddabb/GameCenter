/**
 * one-stroke-core.js — 一笔画核心算法（GridPathFinder）
 *
 * 使用 DFS 回溯法在网格中搜索一条经过所有有效格子的路径。
 * 生成的路径满足：每个格子恰好经过一次，相邻格子正交移动。
 *
 * 包含：
 *   - GridPathFinder：DFS路径搜索、获取邻居、生成有效谜题
 */

class GridPathFinder {
  constructor(rows, cols, holes) {
    this.rows = rows;
    this.cols = cols;
    this.holes = new Set(holes);
    this.path = [];
    this.visited = new Set();
    this.passedPot = 0;
  }

  setPassedPotAndPath(pot, start, visited) {
    this.passedPot = pot;
    this.path = [start];
    this.visited = new Set([start]);
  }

  run(depth) {
    const total = this.rows * this.cols - this.holes.size;
    return this._dfs(this.path[0], total);
  }

  _dfs(current, total) {
    if (this.path.length === total) {
      return true;
    }
    const neighbors = this._getNeighbors(current);
    for (const n of neighbors) {
      if (this.visited.has(n)) continue;
      this.path.push(n);
      this.visited.add(n);
      if (this._dfs(n, total)) return true;
      this.path.pop();
      this.visited.delete(n);
    }
    return false;
  }

  _getNeighbors(idx) {
    const r = Math.floor(idx / this.cols);
    const c = idx % this.cols;
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const result = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
      const nIdx = nr * this.cols + nc;
      if (this.holes.has(nIdx)) continue;
      result.push(nIdx);
    }
    return result;
  }

  getPath() {
    return this.path.slice();
  }

  /**
   * 静态方法：生成一个有效谜题（随机路径 + 随机洞）
   */
  static generateValidPuzzle(rows, cols, holeRatio) {
    const total = rows * cols;
    const holeCount = Math.floor(total * holeRatio);
    const finder = new GridPathFinder(rows, cols, []);
    const start = Math.floor(Math.random() * total);
    finder.setPassedPotAndPath(0, start, true);
    finder.run(0);
    const path = finder.getPath();

    const holes = [];
    const candidate = path.slice(1, -1);
    for (let i = 0; i < holeCount && i < candidate.length; i++) {
      const ri = Math.floor(Math.random() * candidate.length);
      holes.push(candidate[ri]);
      candidate.splice(ri, 1);
    }
    return holes;
  }
}

module.exports = GridPathFinder;
