/**
 * GeZiPuzzle 小游戏入口
 * 创建游戏主画布，初始化核心模块，启动游戏循环
 */
const Game = require('./utils/game-core.js');
const IndexScene = require('./scenes/index/scene.js');
const LevelSelectScene = require('./scenes/level-select/scene.js');

App({
  onLaunch() {
    // 创建游戏画布
    const canvas = wx.createCanvas();
    global.canvas = canvas;
    global.ctx = canvas.getContext('2d');

    // 初始化游戏引擎
    Game.init();

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
    Game.switchScene('index');

    // 启动游戏循环
    Game.startLoop();

    console.info('[GeZiPuzzle] 游戏启动完成');
  },
  globalData: {}
});
