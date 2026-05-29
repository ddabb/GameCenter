/**
 * Build script: Concatenates lunar parts into a single lunar-javascript.js
 *
 * Usage: node lunar/build-lunar.js
 *
 * Part files are in lunar/parts/ directory. Each part contains one or more
 * class definitions that go inside a shared IIFE closure.
 *
 * When you modify any part file, run this script to rebuild the final file.
 */
const fs = require('fs');
const path = require('path');

const partsDir = path.join(__dirname, 'parts');
const outputFile = path.join(__dirname, 'lunar-javascript.js');

// Part files are loaded in this order (inside the shared IIFE)
const partFiles = [
  '01-solar.js',
  '02-lunar.js',
  '03-solar-week.js',
  '04-solar-month.js',
  '05-solar-season.js',
  '06-solar-half-year.js',
  '07-solar-year.js',
  '08-lunar-year.js',
  '09-lunar-month.js',
  '10-shou-xing-util.js',
  '11-solar-util.js',
  '12-lunar-util.js',
  '13-holiday-util.js',
  '14-nine-star.js',
  '15-eight-char.js',
  '16-lunar-time.js',
  '17-foto-util.js',
  '18-foto.js',
  '19-tao-festival.js',
  '20-tao-util.js',
  '21-nine-star-util.js',
  '22-tao.js',
  '23-i18n.js',
];

// Read all parts
const partsContent = [];
for (const f of partFiles) {
  const filePath = path.join(partsDir, f);
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Missing part file: ${f}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  partsContent.push(content);
}

// Build the final file
const header = [
  '/**',
  ' * lunar-javascript.js — 精简农历库',
  ' * 从 lunar-javascript v1.7.7 提取，去除了 webpack/UMD 打包壳',
  ' *',
  ' * 此类由 build-lunar.js 自动生成，请勿手动编辑。',
  ' * 各模块源码见 parts/ 目录。',
  ' *',
  ' * @subpackage lunar',
  ' */',
  '',
  'module.exports = (function(){',
].join('\n');

const footer = [
  '',
  '  return {',
  '    Solar: Solar,',
  '    Lunar: Lunar',
  '  };',
  '})();',
].join('\n');

const output = header + '\n' + partsContent.join('\n') + footer;

fs.writeFileSync(outputFile, output, 'utf8');

const totalLines = output.split('\n').length;
console.log(`Built lunar-javascript.js: ${totalLines} lines from ${partFiles.length} part files`);

// Quick verification
try {
  const { Solar } = require(outputFile);
  const l = Solar.fromYmd(2025, 1, 29).getLunar();
  const result = l.getDayInChinese();
  const ok = result === '初一';
  console.log(`Verification: 2025-01-29 => ${result} ${ok ? '(OK)' : '(FAIL)'}`);
  if (!ok) process.exit(1);
} catch (e) {
  console.error(`Verification failed: ${e.message}`);
  process.exit(1);
}
