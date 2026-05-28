/**
 * 24point-core.js — 24点速算核心逻辑（纯函数 + 数据常量）
 *
 * 包含：
 *   - CDN配置 & 本地题库
 *   - 难度配置
 *   - 提示词库
 *   - 24点求解器（回溯法）
 *   - 安全表达式求值器（调度场算法）
 *   - 数字提取器
 */

// ========== CDN 配置 ==========
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/ddabb/FreeToolsPuzzle@main/data';
const QUESTION_KEY = 'cdn_24point_questions';
const QUESTION_TIMESTAMP_KEY = 'cdn_24point_questions_ts';
const CACHE_EXPIRE = 24 * 60 * 60 * 1000;
const STATS_KEY = '24point_stats';

// ========== 难度配置 ==========
const DIFFICULTY_CONFIG = {
  easy:   { name:'简单', description:'适合初学者',     baseReward:2, colors:['#4CAF50','#8BC34A'] },
  medium: { name:'中等', description:'有一定挑战性',   baseReward:3, colors:['#FF9800','#FFB74D'] },
  hard:   { name:'困难', description:'真正的挑战',     baseReward:5, colors:['#F44336','#E57373'] }
};

// ========== 智能提示词库 ==========
const HINT_TEMPLATES = [
  '尝试先看看能不能组合出 3 和 8',
  '试试组合出 4 和 6，或者 2 和 12',
  '不要忽视括号的作用',
  '分数运算有时能得到意想不到的结果',
  '先把两个数字相加或相减看看',
  '记住：每个数字只能用一次！',
  '试试用除法创造分数',
  '有没有可能先用乘法凑出接近24的数',
  '减法也可以创造有用的中间值'
];

// ========== 本地备用题库 ==========
const localQuestionBank = [
  { numbers:[1,2,3,4],   difficulty:'easy',   solutions:[
    {expression:'(1+2+3)×4', description:'先相加得6，再乘以4'},
    {expression:'(1×2×3)×4', description:'连乘得到24'}
  ]},
  { numbers:[2,3,4,6],   difficulty:'easy',   solutions:[
    {expression:'6×4×(3-2)', description:'利用差值简化计算'},
    {expression:'(6-3)×2×4', description:'先做减法得到3'}
  ]},
  { numbers:[3,3,8,8],   difficulty:'hard',   solutions:[
    {expression:'8÷(3-8÷3)', description:'经典的分式解法'}
  ]},
  { numbers:[1,3,5,7],   difficulty:'medium', solutions:[
    {expression:'(7-3)×(1+5)', description:'分组计算得到4和6'}
  ]},
  { numbers:[4,4,10,10], difficulty:'hard',   solutions:[
    {expression:'(10×10-4)÷4', description:'利用平方差公式思路'}
  ]},
  { numbers:[5,5,5,1],   difficulty:'medium', solutions:[
    {expression:'(5-1÷5)×5', description:'分数运算的经典例子'}
  ]},
  { numbers:[6,6,8,8],   difficulty:'medium', solutions:[
    {expression:'(6÷(8-6))×8', description:'先做减法，再除法，最后乘法'},
    {expression:'(8÷(8-6))×6', description:'另一种顺序'}
  ]},
  { numbers:[1,1,1,8],   difficulty:'easy',   solutions:[
    {expression:'(1+1+1)×8', description:'三个1相加得3'}
  ]},
  { numbers:[2,2,2,3],   difficulty:'easy',   solutions:[
    {expression:'(2+2+2)×3', description:'三个2相加得6'}
  ]}
];

// ========== 安全表达式求值 ==========

/**
 * 自定义表达式求值器（替代 eval，更安全）。
 * 调度场算法（Shunting-yard），中缀 → 后缀再求值。
 *
 * @param {string} expression - 表达式字符串（如 "((3+4)*2)"）
 * @returns {number} 计算结果
 */
function safeEval(expression) {
  let expr = expression.replace(/\s+/g, '');
  const precedence = { '+':1, '-':1, '*':2, '/':2 };
  const values = [];
  const ops = [];

  const applyOp = (a, b, op) => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '*': return a * b;
      case '/':
        if (Math.abs(b) < 0.000001) throw new Error('除零错误');
        return a / b;
      default: throw new Error(`未知运算符 ${op}`);
    }
  };

  const processTopOp = () => {
    if (ops.length < 1 || values.length < 2) return;
    const b = values.pop();
    const a = values.pop();
    const op = ops.pop();
    values.push(applyOp(a, b, op));
  };

  let i = 0;
  while (i < expr.length) {
    if (expr[i] >= '0' && expr[i] <= '9') {
      let num = '';
      while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
        num += expr[i++];
      }
      values.push(parseFloat(num));
      continue;
    }

    if (expr[i] === '(') { ops.push('('); i++; continue; }

    if (expr[i] === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') processTopOp();
      if (ops.length === 0) throw new Error('括号不匹配');
      ops.pop();
      i++;
      continue;
    }

    if (['+', '-', '*', '/'].includes(expr[i])) {
      if (expr[i] === '-' && (i === 0 || expr[i-1] === '(' || ['+','-','*','/'].includes(expr[i-1]))) {
        i++;
        if (expr[i] >= '0' && expr[i] <= '9') {
          let num = '-';
          while (i < expr.length && ((expr[i] >= '0' && expr[i] <= '9') || expr[i] === '.')) {
            num += expr[i++];
          }
          values.push(parseFloat(num));
        }
        continue;
      }

      while (ops.length > 0 && ops[ops.length - 1] !== '(' &&
             precedence[ops[ops.length - 1]] >= precedence[expr[i]]) {
        processTopOp();
      }
      ops.push(expr[i]);
      i++;
      continue;
    }

    throw new Error(`无效字符: ${expr[i]}`);
  }

  while (ops.length > 0) {
    if (ops[ops.length - 1] === '(') throw new Error('括号不匹配');
    processTopOp();
  }

  if (values.length !== 1) throw new Error('表达式无结果');
  return values[0];
}

// ========== 24点求解算法 ==========

/**
 * 24点求解器（暴力枚举所有括号组合 + 四则运算）。
 * 回溯法：每次选取两个数字→运算→合并为新数字，递归处理剩余。
 *
 * @param {number[]} numbers - 长度为4的数字数组
 * @returns {Array<{expression: string, description: string}>} 解法列表（最多10个）
 */
function solve24(numbers) {
  if (numbers.length !== 4) return [];

  const solutions = [];
  const ops = ['+', '-', '*', '/'];

  const solve = (nums, exprs) => {
    if (nums.length === 1) {
      if (Math.abs(nums[0] - 24) < 0.000001) {
        solutions.push(exprs[0]);
      }
      return;
    }

    for (let i = 0; i < nums.length; i++) {
      for (let j = i + 1; j < nums.length; j++) {
        const a = nums[i], b = nums[j];
        const aExpr = exprs[i], bExpr = exprs[j];

        const remainingNums = [];
        const remainingExprs = [];
        for (let k = 0; k < nums.length; k++) {
          if (k !== i && k !== j) {
            remainingNums.push(nums[k]);
            remainingExprs.push(exprs[k]);
          }
        }

        for (const op of ops) {
          if ((op === '+' || op === '*') && i > j) continue;

          switch (op) {
            case '+':
              solve([a + b, ...remainingNums], [`(${aExpr}+${bExpr})`, ...remainingExprs]);
              break;
            case '-':
              solve([a - b, ...remainingNums], [`(${aExpr}-${bExpr})`, ...remainingExprs]);
              solve([b - a, ...remainingNums], [`(${bExpr}-${aExpr})`, ...remainingExprs]);
              break;
            case '*':
              solve([a * b, ...remainingNums], [`(${aExpr}×${bExpr})`, ...remainingExprs]);
              break;
            case '/':
              if (Math.abs(b) > 0.000001) {
                solve([a / b, ...remainingNums], [`(${aExpr}÷${bExpr})`, ...remainingExprs]);
              }
              if (Math.abs(a) > 0.000001) {
                solve([b / a, ...remainingNums], [`(${bExpr}÷${aExpr})`, ...remainingExprs]);
              }
              break;
          }
        }
      }
    }
  };

  solve(numbers, numbers.map(n => n.toString()));

  // 去重
  const uniqueSolutions = [];
  const seen = new Set();

  for (const expr of solutions) {
    let normalized = expr.replace(/\*/g, '×').replace(/\//g, '÷');
    try {
      let calcExpression = normalized.replace(/×/g, '*').replace(/÷/g, '/');
      const result = safeEval(calcExpression);
      if (Math.abs(result - 24) < 0.000001) {
        if (!seen.has(normalized)) {
          seen.add(normalized);
          uniqueSolutions.push({ expression: normalized, description: '' });
        }
      }
    } catch (e) { /* 非法表达式跳过 */ }
  }

  return uniqueSolutions.slice(0, 10);
}

// ========== 辅助函数 ==========

/**
 * 从表达式中提取所有数字。
 * @param {string} expr - 表达式字符串
 * @returns {number[]} 提取到的数字数组
 */
function extractNumbers(expr) {
  const matches = expr.match(/\d+/g);
  return matches ? matches.map(n => parseInt(n)) : [];
}

module.exports = {
  // 常量
  CDN_BASE,
  QUESTION_KEY,
  QUESTION_TIMESTAMP_KEY,
  CACHE_EXPIRE,
  STATS_KEY,
  // 配置
  DIFFICULTY_CONFIG,
  HINT_TEMPLATES,
  localQuestionBank,
  // 核心函数
  safeEval,
  solve24,
  extractNumbers
};
