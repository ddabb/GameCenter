/**
 * lunar/game.js — 农历日历独立分包入口
 *
 * 通过 require('./lunar-javascript.js') 加载封装的农历计算库，
 * 为整个项目提供农历日期转换、节气查询等功能。
 *
 * lunar-javascript.js 是一个打包后的纯数据库，不涉及 Canvas 绘制。
 *
 * @subpackage lunar
 */
require('./lunar-javascript.js');
