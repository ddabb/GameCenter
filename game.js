/**
 * GeZiPuzzle 小游戏入口
 * 创建游戏主画布，初始化核心模块，启动游戏循环
 */
try {
  // ====== 启动诊断：立即在画布上画东西确认执行到了 =======
  const testCanvas = wx.createCanvas();
  const testCtx = testCanvas.getContext('2d');
  testCtx.fillStyle = '#1a1a2e';
  testCtx.fillRect(0, 0, testCanvas.width, testCanvas.height);
  testCtx.fillStyle = '#ffffff';
  testCtx.font = '16px sans-serif';
  testCtx.textAlign = 'center';
  testCtx.fillText('GeZiPuzzle Loading...', testCanvas.width / 2, testCanvas.height / 2);
  console.info('[GeZiPuzzle] 诊断: Canvas 绘制成功');
} catch(e) {
  console.error('[GeZiPuzzle] 诊断失败:', e.message, e.stack);
}

const Game = require('./utils/game-core.js');
const IndexScene = require('./scenes/index/scene.js');
const LevelSelectScene = require('./scenes/level-select/scene.js');

// 创建游戏画布
const canvas = wx.createCanvas();

// 初始化游戏引擎（传入画布）
Game.init(canvas);

// 注册场景
Game.registerScene('index', IndexScene);
Game.registerScene('level-select', LevelSelectScene);

// 注册所有 Canvas 游戏场景
const gameIds = [
  'sudoku-solver', 'sudoku-generator', '24point',
  'akari', 'battleship', 'frog-escape',
  'nonogram', 'number-one', 'nurikabe',
  'one-stroke', 'othello', 'slither-link',
  'sokoban', 'tents'
];
gameIds.forEach(id => {
  try {
    const scene = require(`./games/${id}/scene.js`);
    Game.registerScene(id, scene);
  } catch (e) {
    console.warn(`[Game] 注册游戏场景失败: ${id}`, e.message);
  }
});

// 设置触摸事件
Game.setupTouchEvents();

// 切换到大厅场景
try {
  Game.switchScene('index');
  console.info('[GeZiPuzzle] 已进入 index 场景');
} catch(e) {
  console.error('[GeZiPuzzle] switchScene(index) 失败:', e.message, e.stack);
}

// 启动游戏循环
try {
  Game.startLoop();
  console.info('[GeZiPuzzle] 游戏循环已启动');
} catch(e) {
  console.error('[GeZiPuzzle] startLoop 失败:', e.message, e.stack);
}
