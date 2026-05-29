// part: 06-solar-half-year
// classes: SolarHalfYear
// auto-extracted from lunar-javascript.js
  var SolarHalfYear = (function(){
    var _fromDate = function(date){
      var solar = Solar.fromDate(date);
      return _fromYm(solar.getYear(),solar.getMonth());
    };
    var _fromYm = function(y,m){
      var oy = y;
      var om = m;
      y *= 1;
      if(isNaN(y)){
        throw new Error('wrong solar year '+oy);
      }
      m *= 1;
      if(isNaN(m)){
        throw new Error('wrong solar month '+om);
      }
      return {
        _p:{
          year:y,
          month:m
        },
        getYear:function(){
          return this._p.year;
        },
        getMonth:function(){
          return this._p.month;
        },
        /**
         * 获取当月是第几半年
         * @return number 半年序号，从1开始
         */
        getIndex:function(){
          return Math.ceil(this._p.month/6);
        },
        /**
         * 半年推移
         * @param halfYears 推移的半年数，负数为倒推
         * @return object 推移后的半年
         */
        next:function(halfYears){
          var oh = halfYears;
          halfYears *= 1;
          if(isNaN(halfYears)){
            throw new Error('wong halfYears ' + oh);
          }
          var month = SolarMonth.fromYm(this._p.year, this._p.month).next(6 * halfYears);
          return _fromYm(month.getYear(), month.getMonth());
        },
        /**
         * 获取本半年的月份
         * @return Array 本半年的月份列表
         */
        getMonths:function(){
          var l = [];
          var index = this.getIndex()-1;
          for(var i=0;i<6;i++){
            l.push(SolarMonth.fromYm(this._p.year,6*index+i+1));
          }
          return l;
        },
        toString:function(){
          return this.getYear()+'.'+this.getIndex();
        },
        toFullString:function(){
          return this.getYear()+'年'+['上','下'][this.getIndex()-1]+'半年';
        }
      };
    };
    return {
      fromYm:function(y,m){return _fromYm(y,m);},
      fromDate:function(date){return _fromDate(date);}
    };
  })();