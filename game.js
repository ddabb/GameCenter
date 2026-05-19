// SolvePuzzle 微信小游戏入口

/**
 * 圆角矩形 helper（兼容所有微信版本，替代 roundRect）
 * 自动 beginPath，四个角统一半径 r
 */
function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = [r, r, r, r];
  if (typeof r === 'undefined') r = [0, 0, 0, 0];
  ctx.beginPath();
  ctx.moveTo(x + r[0], y);
  ctx.lineTo(x + w - r[1], y);
  ctx.arcTo(x + w, y, x + w, y + r[1], r[1]);
  ctx.lineTo(x + w, y + h - r[2]);
  ctx.arcTo(x + w, y + h, x + w - r[2], y + h, r[2]);
  ctx.lineTo(x + r[3], y + h);
  ctx.arcTo(x, y + h, x, y + h - r[3], r[3]);
  ctx.lineTo(x, y + r[0]);
  ctx.arcTo(x, y, x + r[0], y, r[0]);
  ctx.closePath();
}
window.roundRect = roundRect;

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

let systemInfo = wx.getSystemInfoSync();
let canvas = wx.createCanvas();
let ctx = canvas.getContext('2d');
canvas.width = systemInfo.windowWidth;
canvas.height = systemInfo.windowHeight;

let currentGame = 'menu';
let gameInstance = null;

function loadGame(gameName, level) {
  if (!ctx) {
    console.error('[game] ctx is undefined, cannot load game');
    return;
  }
  if (gameInstance) {
    try { gameInstance.destroy(); } catch(e) { /* ignore */ }
    gameInstance = null;
  }

  switch (gameName) {
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
  try {
    if (gameInstance) {
      gameInstance.update();
      gameInstance.draw();
    }
  } catch (e) {
    console.error('[Draw]', e.message, e.stack);
  }
  requestAnimationFrame(draw);
}

function init() {
  loadGame('menu');
  draw();
}

init();
