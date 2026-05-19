// /**
//  * 云端题库服务
//  * 通过腾讯云开发存储和获取题库数据
//  */
// 
// const config = require('./cloud-config.js');
// 
// // 云服务实例（延迟初始化）
// let cloudInstance = null;
// 
// function getCloud() {
//   if (!cloudInstance) {
//     cloudInstance = wx.cloud.init({
//       envID: config.cloud.envID,
//       serviceID: config.cloud.serviceID
//     });
//   }
//   return cloudInstance;
// }
// 
// /**
//  * 调用云端API
//  * @param {string} path - API路径
//  * @param {object} init - 请求配置
//  * @returns {Promise} 返回解析后的数据
//  */
// function cloudCall(path, init = {}) {
//   return new Promise((resolve, reject) => {
//     const merged = {
//       path,
//       init: {
//         method: 'POST',
//         header: { 'content-type': 'application/json' },
//         body: {},
//         timeout: 30000,
//         ...init
//       }
//     };
// 
//     getCloud().callContainer({
//       ...merged,
//       success: ({ statusCode, header, data }) => {
//         if (statusCode >= 200 && statusCode < 300) {
//           try {
//             resolve(JSON.parse(data));
//           } catch (e) {
//             resolve(data);
//           }
//         } else {
//           reject(new Error(`HTTP ${statusCode}: ${data}`));
//         }
//       },
//       fail: (err) => {
//         console.warn('云端调用失败:', err);
//         reject(err);
//       }
//     });
//   });
// }
// 
// /**
//  * 从云端获取题目数据
//  * @param {string} gameName - 游戏名称
//  * @param {number} level - 关卡号
//  * @param {string} difficulty - 难度（easy/medium/hard）
//  */
// function getPuzzle(gameName, level, difficulty = 'easy') {
//   return cloudCall(config.api.puzzle, {
//     init: {
//       body: {
//         action: 'get',
//         game: gameName,
//         level,
//         difficulty
//       }
//     }
//   });
// }
// 
// /**
//  * 从云端批量获取题目
//  * @param {string} gameName - 游戏名称
//  * @param {number} startLevel - 起始关卡
//  * @param {number} count - 数量
//  */
// function getPuzzles(gameName, startLevel, count = 10) {
//   return cloudCall(config.api.puzzle, {
//     init: {
//       body: {
//         action: 'batch',
//         game: gameName,
//         start: startLevel,
//         count,
//         difficulty: 'easy'
//       }
//     }
//   });
// }
// 
// // 导出
// module.exports = {
//   cloudCall,
//   getPuzzle,
//   getPuzzles,
//   config
// };