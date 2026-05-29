// part: 07-solar-year
// classes: SolarYear
// auto-extracted from lunar-javascript.js
  var SolarYear = (function(){
    var _fromDate = function(date){
      return _fromYear(Solar.fromDate(date).getYear());
    };
    var _fromYear = function(y){
      var oy = y;
      y *= 1;
      if(isNaN(y)){
        throw new Error('wrong solar year '+oy);
      }
      return {
        _p:{
          year:y
        },
        getYear:function(){
          return this._p.year;
        },
        next:function(years){
          var oy = years;
          years *= 1;
          if(isNaN(years)){
            throw new Error('wrong years ' + oy);
          }
          return _fromYear(this._p.year + years);
        },
        getMonths:function(){
          var l = [];
          var m = SolarMonth.fromYm(this._p.year,1);
          l.push(m);
          for(var i = 1;i<12;i++){
            l.push(m.next(i));
          }
          return l;
        },
        toString:function(){
          return this.getYear()+'';
        },
        toFullString:function(){
          return this.getYear()+'年';
        }
      };
    };
    return {
      fromYear:function(y){return _fromYear(y);},
      fromDate:function(date){return _fromDate(date);}
    };
  })();