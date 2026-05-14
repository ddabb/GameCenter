/**
 * 数独核心算法工具
 * 提供生成、求解、验证、候选解计算等功能
 */

// Fisher-Yates 洗牌
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// 获取某个位置的候选数字
function getCandidates(grid, row, col) {
  if (grid[row][col] !== 0) return [];
  const used = {};
  for (let c = 0; c < 9; c++) if (grid[row][c] !== 0) used[grid[row][c]] = true;
  for (let r = 0; r < 9; r++) if (grid[r][col] !== 0) used[grid[r][col]] = true;
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) if (grid[r][c] !== 0) used[grid[r][c]] = true;
  const result = [];
  for (let n = 1; n <= 9; n++) if (!used[n]) result.push(n);
  return result;
}

// 计算所有候选解
function calculateAllCandidates(grid) {
  const result = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      row.push(getCandidates(grid, r, c));
    }
    result.push(row);
  }
  return result;
}

// 转换为显示格式
function toDisplayBoard(grid, showCandidates) {
  showCandidates = showCandidates || false;
  const allCandidates = showCandidates ? calculateAllCandidates(grid) : null;
  const result = [];
  for (let r = 0; r < 9; r++) {
    const row = [];
    for (let c = 0; c < 9; c++) {
      // 创建固定长度的候选数数组，用0表示占位
      let candidateNumbers = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      if (showCandidates && grid[r][c] === 0 && allCandidates) {
        // 将实际的候选数放在对应的位置
        allCandidates[r][c].forEach(num => {
          candidateNumbers[num - 1] = num;
        });
      }
      
      row.push({
        value: grid[r][c] === 0 ? '' : String(grid[r][c]),
        fixed: grid[r][c] !== 0,
        candidates: candidateNumbers,
        showCandidates: showCandidates && grid[r][c] === 0
      });
    }
    result.push(row);
  }
  return result;
}

// 验证输入合法性
function isValidInput(grid) {
  const seen = [];
  for (let i = 0; i < 27; i++) seen.push({});
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      if (v === 0) continue;
      const box = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      if (seen[r][v] || seen[c + 9][v] || seen[box + 18][v]) return false;
      seen[r][v] = true;
      seen[c + 9][v] = true;
      seen[box + 18][v] = true;
    }
  }
  return true;
}

// 检查放置是否合法
function isSafe(board, row, col, num) {
  for (let c = 0; c < 9; c++) if (board[row][c] === num) return false;
  for (let r = 0; r < 9; r++) if (board[r][col] === num) return false;
  const br = Math.floor(row / 3) * 3;
  const bc = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (board[br + r][bc + c] === num) return false;
  return true;
}

// 统计解的数量（DLX）
function countSolutions(board, maxCount) {
  maxCount = maxCount || 2;
  if (!isValidInput(board)) return 0;
  const copy = board.map(r => [...r]);
  return solveDLX(copy, maxCount).length;
}

// ============================================================
// DLX（Dancing Links X）求解数独
// 精确覆盖问题，时间复杂度远优于朴素回溯
// ============================================================

// DLX 节点
function Node() {
  this.u = this; this.d = this; this.l = this; this.r = this;
  this.col = -1; this.row = -1; this.c = null;
}

// 创建 DLX 表（324 列，9×9×4 约束）
function createDLX() {
  const h = new Node(); // 表头
  const col = new Array(324);
  let p = h;
  for (let i = 0; i < 324; i++) {
    const c = new Node();
    c.col = i; c.c = i;
    p.r = c; c.l = p;
    p = c;
    col[i] = c;
    c.u = c; c.d = c; // 列头自环
    c.sz = 0;
  }
  p.r = h; h.l = p;
  return { h, col };
}

// 添加一行（4个约束列索引）
function addRow(dlx, rowIdx, positions) {
  let first = null;
  for (const ci of positions) {
    const cn = dlx.col[ci];
    const n = new Node();
    n.row = rowIdx; n.col = ci; n.c = ci;
    // 纵向插入（到列头之下）
    n.d = cn; n.u = cn.u; cn.u.d = n; cn.u = n;
    cn.sz++;
    // 横向插入（自环行）
    if (!first) {
      first = n; n.l = n; n.r = n;
    } else {
      n.r = first; n.l = first.l; first.l.r = n; first.l = n;
    }
  }
}

// 列约束编号
const C_ROW = 81;   // 行号约束  81..161
const C_COL = 162;  // 列号约束  162..242
const C_BOX = 243;  // 宫号约束  243..323

function colIdx(r, c, n) {
  const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
  return [
    r * 9 + c,
    C_ROW  + r * 9 + (n - 1),
    C_COL  + c * 9 + (n - 1),
    C_BOX  + b * 9 + (n - 1)
  ];
}

// 覆盖列
function cover(colNode, col) {
  // 1. 从水平链中摘除该列头
  colNode.r.l = colNode.l;
  colNode.l.r = colNode.r;
  // 2. 对该列每个节点所在的行，隐藏该行其他列
  for (let i = colNode.d; i !== colNode; i = i.d) {
    for (let j = i.r; j !== i; j = j.r) {
      // 隐藏节点 j
      j.d.u = j.u; j.u.d = j.d;
      col[j.col].sz--;
    }
  }
}

// 恢复列
function uncover(colNode, col) {
  // 逆序恢复
  for (let i = colNode.u; i !== colNode; i = i.u) {
    for (let j = i.l; j !== i; j = j.l) {
      col[j.col].sz++;
      j.d.u = j; j.u.d = j;
    }
  }
  colNode.r.l = colNode;
  colNode.l.r = colNode;
}

// DLX 求解数独
function solveDLX(board, maxSolutions) {
  const dlx = createDLX();
  const { h, col } = dlx;

  // 建立精确覆盖矩阵（空位建候选行，已填数字不建行）
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      for (let v = 1; v <= 9; v++) {
        addRow(dlx, r * 81 + c * 9 + (v - 1), colIdx(r, c, v));
      }
    }
  }

  // 预填数字：先收集所有要覆盖的列，再统一 cover
  const toCover = new Set();
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const v = board[r][c];
      if (v === 0) continue;
      colIdx(r, c, v).forEach(ci => toCover.add(ci));
    }
  }
  // 按列索引从小到大依次 cover（避免重复 cover）
  [...toCover].sort((a, b) => a - b).forEach(ci => cover(col[ci], col));

  const selected = [];
  const solutions = [];

  function search() {
    if (solutions.length >= maxSolutions) return;
    if (h.r === h) {
      solutions.push([...selected]);
      return;
    }
    // 选约束最多的列（MRV）
    let minC = null, minSz = Infinity;
    for (let c = h.r; c !== h; c = c.r) {
      if (c.sz < minSz) { minSz = c.sz; minC = c; }
    }
    if (minSz === 0) return;

    cover(minC, col);
    for (let rn = minC.d; rn !== minC && solutions.length < maxSolutions; rn = rn.d) {
      selected.push(rn);
      // 隐藏该行其他列
      for (let j = rn.r; j !== rn; j = j.r) cover(col[j.col], col);
      search();
      // 恢复
      for (let j = rn.l; j !== rn; j = j.l) uncover(col[j.col], col);
      selected.pop();
    }
    uncover(minC, col);
  }

  search();

  // 写入第一个解
  if (solutions.length > 0) {
    for (const node of solutions[0]) {
      const idx = node.row;
      const r = Math.floor(idx / 81);
      const c = Math.floor((idx % 81) / 9);
      const v = (idx % 9) + 1;
      board[r][c] = v;
    }
  }
  return solutions;
}

// 对外接口：DLX 解数独
function solve(board) {
  if (!isValidInput(board)) return false;
  return solveDLX(board, 1).length > 0;
}

// 生成完整终盘
function generateFullBoard() {
  const board = [];
  for (let r = 0; r < 9; r++) board.push(Array(9).fill(0));
  
  function fill(row, col) {
    if (row === 9) return true;
    if (col === 9) return fill(row + 1, 0);
    const nums = shuffle([1,2,3,4,5,6,7,8,9]);
    for (let i = 0; i < nums.length; i++) {
      if (isSafe(board, row, col, nums[i])) {
        board[row][col] = nums[i];
        if (fill(row, col + 1)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }
  fill(0, 0);
  return board;
}

// 验证唯一解
function hasUniqueSolution(board) {
  return countSolutions(board, 2) === 1;
}

// 创建谜题
function createPuzzle(fullBoard, removeCount) {
  const puzzle = fullBoard.map(function(r) { return r.slice(); });
  const positions = shuffle(Array.from({length: 81}, function(_, i) { return [Math.floor(i / 9), i % 9]; }));
  let removed = 0;
  for (let i = 0; i < positions.length && removed < removeCount; i++) {
    const r = positions[i][0], c = positions[i][1];
    const backup = puzzle[r][c];
    puzzle[r][c] = 0;
    if (countSolutions(puzzle, 2) === 1) removed++;
    else puzzle[r][c] = backup;
  }
  return puzzle;
}

module.exports = {
  generateFullBoard: generateFullBoard,
  createPuzzle: createPuzzle,
  solve: solve,
  solveDLX: solveDLX,
  isSafe: isSafe,
  isValidInput: isValidInput,
  countSolutions: countSolutions,
  hasUniqueSolution: hasUniqueSolution,
  getCandidates: getCandidates,
  calculateAllCandidates: calculateAllCandidates,
  toDisplayBoard: toDisplayBoard
};
