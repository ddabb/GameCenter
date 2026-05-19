var fs = require('fs');
var p = 'F:/SelfJob/Puzzle/SolvePuzzle/games';
var files = fs.readdirSync(p).filter(function(f){return f.endsWith('.js');});
var map = {};
files.forEach(function(f){
  var c = fs.readFileSync(p+'/'+f,'utf8');
  var m = c.match(/tt\.\w+/g)||[];
  if(m.length>0) map[f] = m;
});
if(Object.keys(map).length===0){
  console.log('All DONE! '+files.length+' files');
} else {
  Object.keys(map).forEach(function(f){
    console.log(f+': '+map[f].join(', '));
  });
}