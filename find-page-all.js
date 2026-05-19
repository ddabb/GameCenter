var fs = require('fs');
var p = 'F:/SelfJob/Puzzle/SolvePuzzle/';
var count = 0;
function w(d) {
  var files;
  try { files = fs.readdirSync(d); } catch(e) { return; }
  files.forEach(function(f) {
    var m = d + f;
    var s;
    try { s = fs.statSync(m); } catch(e) { return; }
    if (s.isDirectory()) { w(m + '/'); }
    else if (f.endsWith('.js')) {
      var c = fs.readFileSync(m, 'utf8');
      if (c.match(/^Page\s*\(/m)) {
        console.log(m.replace(p, '') + ' ← has Page()');
        count++;
      }
    }
  });
}
w(p);
console.log('Total with Page():', count);
