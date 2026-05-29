// part: 19-tao-festival
// classes: TaoFestival
// auto-extracted from lunar-javascript.js
  var TaoFestival = (function(){
    var _f=function(name,remark){
      return {
        _p:{
          name:name,
          remark:remark?remark:''
        },
        getName:function(){return this._p.name;},
        getRemark:function(){return this._p.remark;},
        toString:function(){return this._p.name;},
        toFullString:function(){
          var l = [this._p.name];
          if(this._p.remark) {
            l.push('['+this._p.remark+']');
          }
          return l.join('');
        }
      };
    };
    return {
      create:function(name,remark){return _f(name,remark);}
    };
  })();