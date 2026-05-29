// part: 05-solar-season
// classes: SolarSeason
// auto-extracted from lunar-javascript.js
  var SolarSeason = (function(){
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
         * 获取当月是第几季度
         * @return number 季度序号，从1开始
         */
        getIndex:function(){
          return Math.ceil(this._p.month/3);
        },
        /**
         * 季度推移
         * @param seasons 推移的季度数，负数为倒推
         * @return object 推移后的季度
         */
        next:function(seasons){
          var os = seasons;
          seasons *= 1;
          if(isNaN(seasons)){
            throw new Error('wrong seasons ' + os);
          }
          var month = SolarMonth.fromYm(this._p.year, this._p.month).next(3 * seasons);
          return _fromYm(month.getYear(), month.getMonth());
        },
        /**
         * 获取本季度的月份
         * @return Array 本季度的月份列表
         */
        getMonths:function(){
          var l = [];
          var index = this.getIndex()-1;
          for(var i=0;i<3;i++){
            l.push(SolarMonth.fromYm(this._p.year,3*index+i+1));
          }
          return l;
        },
        toString:function(){
          return this.getYear()+'.'+this.getIndex();
        },
        toFullString:function(){
          return this.getYear()+'年'+this.getIndex()+'季度';
        }
      };
    };
    return {
      fromYm:function(y,m){return _fromYm(y,m);},
      fromDate:function(date){return _fromDate(date);}
    };
  })();