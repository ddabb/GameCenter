console.log('使用抖音开发者工具开发过程中可以参考以下文档:');
console.log('https://developer.open-douyin.com/docs/resource/zh-CN/mini-game/guide/minigame/introduction');

// 导入游戏类
const Menu = require('./games/menu.js');
const PrivacyPolicy = require('./games/privacy.js');
const Stats = require('./games/stats.js');
const LevelSelect = require('./games/level-select.js');
const Profile = require('./games/profile.js');
const Othello = require('./games/othello.js');
const Akari = require('./games/akari.js');
const Sokoban = require('./games/sokoban.js');
const Nurikabe = require('./games/nurikabe.js');
const Tents = require('./games/tents.js');
const TwentyFourPoint = require('./games/24point.js');
const SlitherLink = require('./games/slither-link.js');
const Nonogram = require('./games/nonogram.js');
const Battleship = require('./games/battleship.js');
const MergeABC = require('./games/merge-abc.js');

let systemInfo = tt.getSystemInfoSync();
let canvas = tt.createCanvas(),
  ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

let currentGame = 'menu';
let games = {};
let gameInstance = null;

function loadGame(gameName, level) {
  if (gameInstance) {
    gameInstance.destroy();
  }
  
  switch(gameName) {
    case 'menu':
      gameInstance = new Menu(ctx, canvas, systemInfo, switchGame);
      break;
    case 'level-select':
      gameInstance = new LevelSelect(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'profile':
      gameInstance = new Profile(ctx, canvas, systemInfo, switchGame);
      break;
    case 'privacy':
      gameInstance = new PrivacyPolicy(ctx, canvas, systemInfo, switchGame);
      break;
    case 'stats':
      gameInstance = new Stats(ctx, canvas, systemInfo, switchGame);
      break;
    case 'othello':
      gameInstance = new Othello(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'akari':
      gameInstance = new Akari(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'sokoban':
      gameInstance = new Sokoban(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'nurikabe':
      gameInstance = new Nurikabe(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'tents':
      gameInstance = new Tents(ctx, canvas, systemInfo, switchGame, level);
      break;
    case '24point':
      gameInstance = new TwentyFourPoint(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'slither-link':
      gameInstance = new SlitherLink(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'nonogram':
      gameInstance = new Nonogram(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'battleship':
      gameInstance = new Battleship(ctx, canvas, systemInfo, switchGame, level);
      break;
    case 'merge-abc':
      gameInstance = new MergeABC(ctx, canvas, systemInfo, switchGame, level);
      break;
    default:
      gameInstance = new Menu(ctx, canvas, systemInfo, switchGame);
  }
  currentGame = gameName;
}

function switchGame(gameName, level) {
  loadGame(gameName, level);
}

function draw() {
  if (gameInstance) {
    gameInstance.update();
    gameInstance.draw();
  }
  requestAnimationFrame(draw);
}

function init() {
  loadGame('menu');
  draw();
}

init();
