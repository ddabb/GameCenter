var fs = require('fs');
var p = 'F:/SelfJob/Puzzle/SolvePuzzle/games/';
var files = fs.readdirSync(p);
var count = 0;
files.forEach(function(f) {
  if (f.endsWith('.js')) {
    var c = fs.readFileSync(p + f, 'utf8');
    if (c.match(/^Page\s*\(/m)) {
      console.log(f + ' ← has Page()');
      count++;
    }
  }
});
console.log('Total with Page():', count);
