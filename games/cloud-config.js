/**
 * 腾讯云开发配置文件
 * 抖音云服务用于题库存储和排行榜
 */

module.exports = {
  // 云服务配置
  cloud: {
    envID: 'env-EBp3Ma9y5U',
    serviceID: '1m0xd0x4hscok'
  },

  // 默认域名
  baseURL: 'https://1m0xd0x4hscok-env-EBp3Ma9y5U.service.douyincloud.run',

  // 云函数/容器路径配置
  api: {
    // 题库接口路径
    puzzle: '/puzzle',
    // 排行榜接口路径
    leaderboard: '/leaderboard'
  },

  // 云端题库存储配置
  puzzleStorage: {
    // 是否启用云端题库（false=使用本地data/目录）
    enabled: false,
    // 题库刷新间隔（毫秒），设为0则每次启动都请求
    refreshInterval: 0,
    // 本地缓存题库的最大数量（控制内存占用）
    maxCacheSize: 100
  },

  // 调试模式
  debug: false
};