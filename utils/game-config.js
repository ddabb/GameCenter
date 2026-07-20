/**
 * game-config.js — 全局共享配置
 *
 * 放在主包（utils/）下，主入口 game.js 与各分包（如 games/menu.js）
 * 均可在各自的 require 范围内引用，无需等待分包加载即可读取。
 */

module.exports = {
  /**
   * 进入小游戏后直接开玩的那款「招牌游戏」。
   * 要求：无关卡、开箱即玩（如 黑白棋 / 扫青蛙 / 合成ABC）。
   * 修改此值即可更换进入即玩的游戏，菜单会自动把该游戏从列表中移除。
   */
  FEATURED_GAME: 'othello'
};
