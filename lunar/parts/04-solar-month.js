// part: 04-solar-month
// classes: SolarMonth
// auto-extracted from lunar-javascript.js
  var SolarMonth = (function(){
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
        next:function(months){
          var om = months;
          months *= 1;
          if(isNaN(months)){
            throw new Error('wrong months ' + om);
          }
          var n = months < 0 ? -1 : 1;
          var m = Math.abs(months);
          var y = this._p.year + Math.floor(m / 12) * n;
          m = this._p.month + m % 12 * n;
          if (m > 12) {
            m -= 12;
            y++;
          } else if (m < 1) {
            m += 12;
            y--;
          }
          return _fromYm(y, m);
        },
        getDays:function(){
          var l = [];
          var d = Solar.fromYmd(this._p.year,this._p.month,1);
          l.push(d);
          var days = SolarUtil.getDaysOfMonth(this._p.year,this._p.month);
          for(var i = 1;i<days;i++){
            l.push(d.next(i));
          }
          return l;
        },
        getWeeks:function(start){
          start *= 1;
          if(isNaN(start)){
            start = 0;
          }
          var l = [];
          var week = SolarWeek.fromYmd(this._p.year, this._p.month, 1, start);
          while (true) {
            l.push(week);
            week = week.next(1, false);
            var firstDay = week.getFirstDay();
            if (firstDay.getYear() > this._p.year || firstDay.getMonth() > this._p.month) {
              break;
            }
          }
          return l;
        },
        toString:function(){
          return this.getYear()+'-'+this.getMonth();
        },
        toFullString:function(){
          return this.getYear()+'年'+this.getMonth()+'月';
        }
      };
    };
    return {
      fromYm:function(y,m){return _fromYm(y,m);},
      fromDate:function(date){return _fromDate(date);}
    };
  })();