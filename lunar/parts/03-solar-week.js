// part: 03-solar-week
// classes: SolarWeek
// auto-extracted from lunar-javascript.js
  var SolarWeek = (function(){
    var _fromDate = function(date,start){
      var solar = Solar.fromDate(date);
      return _fromYmd(solar.getYear(),solar.getMonth(), solar.getDay(), start);
    };
    var _fromYmd = function(y,m,d,start){
      var oy = y;
      var om = m;
      var od = d;
      y *= 1;
      if(isNaN(y)){
        throw new Error('wrong solar year '+oy);
      }
      m *= 1;
      if(isNaN(m)){
        throw new Error('wrong solar month '+om);
      }
      d *= 1;
      if(isNaN(d)){
        throw new Error('wrong solar day '+od);
      }
      start *= 1;
      if(isNaN(start)){
        start = 0;
      }
      return {
        _p:{
          year:y,
          month:m,
          day:d,
          start:start
        },
        getYear:function(){
          return this._p.year;
        },
        getMonth:function(){
          return this._p.month;
        },
        getDay:function(){
          return this._p.day;
        },
        getStart:function(){
          return this._p.start;
        },
        /**
         * 获取当前日期是在当月第几周
         * @return number 周序号，从1开始
         */
        getIndex:function(){
          var offset = Solar.fromYmd(this._p.year,this._p.month,1).getWeek() - this._p.start;
          if(offset < 0) {
            offset += 7;
          }
          return Math.ceil((this._p.day + offset)/7);
        },
        /**
         * 获取当前日期是在当年第几周
         * @return number 周序号，从1开始
         */
        getIndexInYear:function(){
          var offset = Solar.fromYmd(this._p.year,1,1).getWeek() - this._p.start;
          if(offset < 0) {
            offset += 7;
          }
          return Math.ceil((SolarUtil.getDaysInYear(this._p.year, this._p.month, this._p.day) + offset)/7);
        },
        /**
         * 周推移
         * @param weeks 推移的周数，负数为倒推
         * @param separateMonth 是否按月单独计算
         * @return object 推移后的阳历周
         */
        next: function (weeks, separateMonth) {
          var ow = weeks;
          weeks *= 1;
          if(isNaN(weeks)){
            throw new Error('wrong weeks ' + ow);
          }
          var start = this._p.start;
          if (0 === weeks) {
            return _fromYmd(this._p.year, this._p.month, this._p.day, start);
          }
          var solar = Solar.fromYmd(this._p.year, this._p.month, this._p.day);
          if (separateMonth) {
            var n = weeks;
            var week = _fromYmd(this._p.year, this._p.month, this._p.day, start);
            var month = this._p.month;
            var plus = n > 0;
            while (0 !== n) {
              solar = solar.next(plus ? 7 : -7);
              week = _fromYmd(solar.getYear(), solar.getMonth(), solar.getDay(), start);
              var weekMonth = week.getMonth();
              if (month !== weekMonth) {
                var index = week.getIndex();
                if (plus) {
                  if (1 === index) {
                    var firstDay = week.getFirstDay();
                    week = _fromYmd(firstDay.getYear(), firstDay.getMonth(), firstDay.getDay(), start);
                    weekMonth = week.getMonth();
                  } else {
                    solar = Solar.fromYmd(week.getYear(), week.getMonth(), 1);
                    week = _fromYmd(solar.getYear(), solar.getMonth(), solar.getDay(), start);
                  }
                } else {
                  var size = SolarUtil.getWeeksOfMonth(week.getYear(), week.getMonth(), start);
                  if (size === index) {
                    var lastDay = week.getFirstDay().next(6);
                    week = _fromYmd(lastDay.getYear(), lastDay.getMonth(), lastDay.getDay(), start);
                    weekMonth = week.getMonth();
                  } else {
                    solar = Solar.fromYmd(week.getYear(), week.getMonth(), SolarUtil.getDaysOfMonth(week.getYear(), week.getMonth()));
                    week = _fromYmd(solar.getYear(), solar.getMonth(), solar.getDay(), start);
                  }
                }
                month = weekMonth;
              }
              n -= plus ? 1 : -1;
            }
            return week;
          } else {
            solar = solar.next(weeks * 7);
            return _fromYmd(solar.getYear(), solar.getMonth(), solar.getDay(), start);
          }
        },
        /**
         * 获取本周第一天的阳历日期（可能跨月）
         * @return object 本周第一天的阳历日期
         */
        getFirstDay:function(){
          var solar = Solar.fromYmd(this._p.year, this._p.month, this._p.day);
          var prev = solar.getWeek() - this._p.start;
          if(prev < 0){
            prev += 7;
          }
          return solar.next(-prev);
        },
        /**
         * 获取本周第一天的阳历日期（仅限当月）
         * @return object 本周第一天的阳历日期
         */
        getFirstDayInMonth:function(){
          var index = 0;
          var days = this.getDays();
          for(var i = 0;i<days.length;i++){
            if(this._p.month===days[i].getMonth()){
              index = i;
              break;
            }
          }
          return days[index];
        },
        /**
         * 获取本周的阳历日期列表（可能跨月）
         * @return Array 本周的阳历日期列表
         */
        getDays:function(){
          var firstDay = this.getFirstDay();
          var l = [];
          l.push(firstDay);
          for(var i = 1;i<7;i++){
            l.push(firstDay.next(i));
          }
          return l;
        },
        /**
         * 获取本周的阳历日期列表（仅限当月）
         * @return Array 本周的阳历日期列表（仅限当月）
         */
        getDaysInMonth:function(){
          var days = this.getDays();
          var l = [];
          for(var i = 0;i<days.length;i++){
            var day = days[i];
            if(this._p.month!==day.getMonth()){
              continue;
            }
            l.push(day);
          }
          return l;
        },
        toString:function(){
          return this.getYear()+'.'+this.getMonth()+'.'+this.getIndex();
        },
        toFullString:function(){
          return this.getYear()+'年'+this.getMonth()+'月第'+this.getIndex()+'周';
        }
      };
    };
    return {
      /**
       * 指定年月日生成当天所在的阳历周
       * @param y 年份
       * @param m 月份
       * @param d 日期
       * @param start 星期几作为一周的开始，1234560分别代表星期一至星期天
       * @return object 阳历周
       */
      fromYmd:function(y,m,d,start){return _fromYmd(y,m,d,start);},
      /**
       * 指定日期生成当天所在的阳历周
       * @param date 日期
       * @param start 星期几作为一周的开始，1234560分别代表星期一至星期天
       * @return object 阳历周
       */
      fromDate:function(date,start){return _fromDate(date,start);}
    };
  })();