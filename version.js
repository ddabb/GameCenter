/**
 * SolvePuzzle 版本信息
 * 单独文件管理，便于统一修改
 */

const version = {
  number: '1.5.0',
  name: 'SolvePuzzle 指尖谜题',
  description: '12款经典益智游戏合集',
  updateTime: '2026-06-28',
  updateLog: [
    {
      version: '1.5.0',
      date: '2026-06-28',
      changes: [
        '成就系统全面优化',
        '13款游戏独有成就全部激活',
        '修复成就解锁条件判断',
        '优化游戏体验'
      ]
    },
    {
      version: '1.4.0',
      date: '2026-06-15',
      changes: [
        '新增数回、数织、数墙等谜题',
        '优化UI界面',
        '修复已知bug'
      ]
    },
    {
      version: '1.0.0',
      date: '2026-06-01',
      changes: [
        '初始版本发布',
        '包含8款经典谜题游戏'
      ]
    }
  ]
};

module.exports = version;
