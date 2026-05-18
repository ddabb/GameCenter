/**
 * 云端题库配置
 * CDN 模式：从 jsDelivr + GitHub 加载题库 JSON
 * 本地模式：从 games/data/ 目录 require 加载
 */

module.exports = {
  // ========== CDN 题库配置 ==========
  cdn: {
    // 是否启用 CDN 题库（true = 优先走 CDN，false = 仅本地）
    enabled: true,
    // jsDelivr + GitHub 仓库地址（去掉末尾斜杠）
    baseUrl: 'https://cdn.jsdelivr.net/gh/ddabb/DouyinCloudServer@main',
    // 请求超时（毫秒）
    timeout: 10000
  },

  // ========== 抖音云开发（保留，用于排行榜/云端存档） ==========
  cloud: {
    envID: 'env-EBp3Ma9y5U',
    serviceID: '1m0xd0x4hscok'
  },

  baseURL: 'https://1m0xd0x4hscok-env-EBp3Ma9y5U.service.douyincloud.run',

  api: {
    puzzle: '/puzzle',
    leaderboard: '/leaderboard'
  },

  // 旧版云端题库（已废弃，保留字段兼容）
  puzzleStorage: {
    enabled: false,
    refreshInterval: 0,
    maxCacheSize: 100
  },

  debug: false
};
