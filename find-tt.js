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
      var r = c.match(/tt\.\w+/g);
      if (r) {
        console.log(m.replace(p, ''), ':', r);
        count++;
      }
    }
  });
}
w(p);
console.log('Total files with tt refs:', count);
