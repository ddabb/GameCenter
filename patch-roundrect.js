// patch-roundrect.js - 将所有 ctx.roundRect(x,y,w,h,r) 和 this.ctx.roundRect(x,y,w,h,r) 替换为 roundRect(ctx,x,y,w,h,r) 和 roundRect(this.ctx,x,y,w,h,r)
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'games');
const files = fs.readdirSync(dir);
let total = 0;

files.forEach(f => {
  if (!f.endsWith('.js')) return;
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, 'utf8');
  const before = c;
  // 匹配 ctx.roundRect(...) 和 this.ctx.roundRect(...)
  c = c.replace(/(this\.)?ctx\.roundRect\(/g, (match, p1) => {
    return p1 ? 'roundRect(this.ctx,' : 'roundRect(ctx,';
  });
  if (c !== before) {
    fs.writeFileSync(fp, c, 'utf8');
    const n = ((before.match(/(this\.)?ctx\.roundRect\(/g) || []).length);
    total += n;
    console.log(`✅ ${f}: ${n}处`);
  }
});

console.log(`\n共修复 ${total} 处 roundRect 调用`);
