// part: 01-solar
// classes: Solar
// auto-extracted from lunar-javascript.js
  var Solar = (function(){
    var _fromDate = function(date){
      return _fromYmdHms(date.getFullYear(),date.getMonth()+1,date.getDate(),date.getHours(),date.getMinutes(),date.getSeconds());
    };
    var _fromJulianDay = function(julianDay){
      var d = Math.floor(julianDay + 0.5);
      var f = julianDay + 0.5 - d;
      var c;

      if (d >= 2299161) {
        c = Math.floor((d - 1867216.25) / 36524.25);
        d += 1 + c - Math.floor(c / 4);
      }
      d += 1524;
      var year = Math.floor((d - 122.1) / 365.25);
      d -= Math.floor(365.25 * year);
      var month = Math.floor(d / 30.601);
      d -= Math.floor(30.601 * month);
      var day = d;
      if (month > 13) {
        month -= 13;
        year -= 4715;
      } else {
        month -= 1;
        year -= 4716;
      }
      f *= 24;
      var hour = Math.floor(f);

      f -= hour;
      f *= 60;
      var minute = Math.floor(f);

      f -= minute;
      f *= 60;
      var second = Math.round(f);
      if(second>59){
        second-=60;
        minute++;
      }
      if(minute>59){
        minute-=60;
        hour++;
      }
      if(hour>23){
        hour-=24;
        day+=1;
      }
      return _fromYmdHms(year,month,day,hour,minute,second);
    };
    var _fromYmdHms = function(y,m,d,hour,minute,second){
      var oy = y;
      var om = m;
      var od = d;
      var oh = hour;
      var oi = minute;
      var os = second;
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
      hour *= 1;
      if(isNaN(hour)){
        throw new Error('wrong hour '+oh);
      }
      minute *= 1;
      if(isNaN(minute)){
        throw new Error('wrong minute '+oi);
      }
      second *= 1;
      if(isNaN(second)){
        throw new Error('wrong second '+os);
      }
      if(1582===y && 10===m){
        if(d>4&&d<15){
          throw new Error('wrong solar year '+y+' month '+m+' day '+d);
        }
      }
      if(m<1||m>12){
        throw new Error('wrong month ' + m);
      }
      if(d<1||d>31){
        throw new Error('wrong day ' + d);
      }
      if(hour<0||hour>23){
        throw new Error('wrong hour '+hour);
      }
      if(minute<0||minute>59){
        throw new Error('wrong minute '+minute);
      }
      if(second<0||second>59){
        throw new Error('wrong second '+second);
      }
      return {
        _p:{
          year:y,
          month:m,
          day:d,
          hour:hour,
          minute:minute,
          second:second
        },
        subtract:function(solar){
          return SolarUtil.getDaysBetween(solar.getYear(), solar.getMonth(), solar.getDay(), this._p.year, this._p.month, this._p.day);
        },
        subtractMinute:function(solar){
          var days = this.subtract(solar);
          var cm = this._p.hour * 60 + this._p.minute;
          var sm = solar.getHour() * 60 + solar.getMinute();
          var m = cm - sm;
          if (m < 0) {
            m += 1440;
            days--;
          }
          m += days * 1440;
          return m;
        },
        isAfter: function(solar) {
          if (this._p.year > solar.getYear()) {
            return true;
          }
          if (this._p.year < solar.getYear()) {
            return false;
          }
          if (this._p.month > solar.getMonth()) {
            return true;
          }
          if (this._p.month < solar.getMonth()) {
            return false;
          }
          if (this._p.day > solar.getDay()) {
            return true;
          }
          if (this._p.day < solar.getDay()) {
            return false;
          }
          if (this._p.hour > solar.getHour()) {
            return true;
          }
          if (this._p.hour < solar.getHour()) {
            return false;
          }
          if (this._p.minute > solar.getMinute()) {
            return true;
          }
          if (this._p.minute < solar.getMinute()) {
            return false;
          }
          return this._p.second > solar.getSecond();
        },
        isBefore: function(solar) {
          if (this._p.year > solar.getYear()) {
            return false;
          }
          if (this._p.year < solar.getYear()) {
            return true;
          }
          if (this._p.month > solar.getMonth()) {
            return false;
          }
          if (this._p.month < solar.getMonth()) {
            return true;
          }
          if (this._p.day > solar.getDay()) {
            return false;
          }
          if (this._p.day < solar.getDay()) {
            return true;
          }
          if (this._p.hour > solar.getHour()) {
            return false;
          }
          if (this._p.hour < solar.getHour()) {
            return true;
          }
          if (this._p.minute > solar.getMinute()) {
            return false;
          }
          if (this._p.minute < solar.getMinute()) {
            return true;
          }
          return this._p.second < solar.getSecond();
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
        getHour:function(){
          return this._p.hour;
        },
        getMinute:function(){
          return this._p.minute;
        },
        getSecond:function(){
          return this._p.second;
        },
        getWeek:function(){
          return (Math.floor(this.getJulianDay() + 0.5) + 7000001) % 7;
        },
        getWeekInChinese:function(){
          return SolarUtil.WEEK[this.getWeek()];
        },
        /**
         * 获取当天的阳历周
         * @param start 星期几作为一周的开始，1234560分别代表星期一至星期天
         */
        getSolarWeek:function(start){
          return SolarWeek.fromYmd(this._p.year, this._p.month, this._p.day, start);
        },
        isLeapYear:function(){
          return SolarUtil.isLeapYear(this._p.year);
        },
        getFestivals:function(){
          var l = [];
          var f = SolarUtil.FESTIVAL[this._p.month+'-'+this._p.day];
          if(f){
            l.push(f);
          }
          var weeks = Math.ceil(this._p.day/7);
          var week = this.getWeek();
          f = SolarUtil.WEEK_FESTIVAL[this._p.month+'-'+weeks+'-'+week];
          if(f){
            l.push(f);
          }
          if (this._p.day + 7 > SolarUtil.getDaysOfMonth(this._p.year, this._p.month)) {
            f = SolarUtil.WEEK_FESTIVAL[this._p.month + '-0-' + week];
            if (f) {
              l.push(f);
            }
          }
          return l;
        },
        getOtherFestivals:function(){
          var l=[];
          var fs=SolarUtil.OTHER_FESTIVAL[this._p.month+'-'+this._p.day];
          if(fs){
            l=l.concat(fs);
          }
          return l;
        },
        getXingzuo:function(){
          return this.getXingZuo();
        },
        getXingZuo:function(){
          var index = 11;
          var y = this._p.month*100+this._p.day;
          if (y >= 321 && y <= 419) {
            index = 0;
          } else if (y >= 420 && y <= 520) {
            index = 1;
          } else if (y >= 521 && y <= 621) {
            index = 2;
          } else if (y >= 622 && y <= 722) {
            index = 3;
          } else if (y >= 723 && y <= 822) {
            index = 4;
          } else if (y >= 823 && y <= 922) {
            index = 5;
          } else if (y >= 923 && y <= 1023) {
            index = 6;
          } else if (y >= 1024 && y <= 1122) {
            index = 7;
          } else if (y >= 1123 && y <= 1221) {
            index = 8;
          } else if (y >= 1222 || y <= 119) {
            index = 9;
          } else if (y <= 218) {
            index = 10;
          }
          return SolarUtil.XINGZUO[index];
        },
        toYmd:function(){
          var m = this._p.month;
          var d = this._p.day;
          var y = this._p.year + '';
          while (y.length < 4) {
            y = '0' + y;
          }
          return [y,(m<10?'0':'')+m,(d<10?'0':'')+d].join('-');
        },
        toYmdHms:function(){
          return this.toYmd()+' '+[(this._p.hour<10?'0':'')+this._p.hour,(this._p.minute<10?'0':'')+this._p.minute,(this._p.second<10?'0':'')+this._p.second].join(':');
        },
        toString:function(){
          return this.toYmd();
        },
        toFullString:function(){
          var s = this.toYmdHms();
          if(this.isLeapYear()){
            s += ' 闰年';
          }
          s += ' 星期'+this.getWeekInChinese();
          var festivals = this.getFestivals();
          for(var i=0,j=festivals.length;i<j;i++){
            s += ' ('+festivals[i]+')';
          }
          s += ' '+this.getXingZuo()+'座';
          return s;
        },
        nextYear:function(years){
          var oy = years;
          years *= 1;
          if (isNaN(years)) {
            throw new Error('wrong years ' + oy);
          }
          var y = this._p.year + years;
          var m = this._p.month;
          var d = this._p.day;
          if (1582 === y && 10 === m) {
            if (d > 4 && d < 15) {
              d += 10;
            }
          } else if (2 === m) {
            if (d > 28) {
              if (!SolarUtil.isLeapYear(y)) {
                d = 28;
              }
            }
          }
          return _fromYmdHms(y, m, d, this._p.hour, this._p.minute, this._p.second);
        },
        nextMonth:function(months){
          var om = months;
          months *= 1;
          if (isNaN(months)) {
            throw new Error('wrong months ' + om);
          }
          var month = SolarMonth.fromYm(this._p.year, this._p.month).next(months);
          var y = month.getYear();
          var m = month.getMonth();
          var d = this._p.day;
          if (1582 === y && 10 === m) {
            if (d > 4 && d < 15) {
              d += 10;
            }
          } else {
            var maxDay = SolarUtil.getDaysOfMonth(y, m);
            if (d > maxDay) {
              d = maxDay;
            }
          }
          return _fromYmdHms(y, m, d, this._p.hour, this._p.minute, this._p.second);
        },
        nextDay:function(days){
          var od = days;
          days *= 1;
          if (isNaN(days)) {
            throw new Error('wrong days ' + od);
          }
          var y = this._p.year;
          var m = this._p.month;
          var d = this._p.day;
          if (1582 === y && 10 === m) {
            if (d > 4) {
              d -= 10
            }
          }
          if (days > 0) {
            d += days;
            var daysInMonth = SolarUtil.getDaysOfMonth(y, m);
            while (d > daysInMonth) {
              d -= daysInMonth;
              m++;
              if (m > 12) {
                m = 1;
                y++;
              }
              daysInMonth = SolarUtil.getDaysOfMonth(y, m);
            }
          } else if (days < 0) {
            while (d + days <= 0) {
              m--;
              if (m < 1) {
                m = 12;
                y--;
              }
              d += SolarUtil.getDaysOfMonth(y, m);
            }
            d += days;
          }
          if (1582 === y && 10 === m) {
            if (d > 4) {
              d += 10;
            }
          }
          return _fromYmdHms(y, m, d, this._p.hour, this._p.minute, this._p.second);
        },
        nextWorkday:function(days){
          var od = days;
          days *= 1;
          if (isNaN(days)) {
            throw new Error('wrong days ' + od);
          }
          var solar = _fromYmdHms(this._p.year, this._p.month, this._p.day, this._p.hour, this._p.minute, this._p.second);
          if (days !== 0) {
            var rest = Math.abs(days);
            var add = days < 1 ? -1 : 1;
            while (rest > 0) {
              solar = solar.next(add);
              var work = true;
              var holiday = HolidayUtil.getHoliday(solar.getYear(), solar.getMonth(), solar.getDay());
              if (!holiday) {
                var week = solar.getWeek();
                if (0 === week || 6 === week) {
                  work = false;
                }
              } else {
                work = holiday.isWork();
              }
              if (work) {
                rest -= 1;
              }
            }
          }
          return solar;
        },
        next:function(days, onlyWorkday){
          if (onlyWorkday) {
            return this.nextWorkday(days);
          }
          return this.nextDay(days);
        },
        nextHour:function(hours){
          var oh = hours;
          hours *= 1;
          if (isNaN(hours)) {
            throw new Error('wrong hours ' + oh);
          }
          var h = this._p.hour + hours;
          var n = h < 0 ? -1 : 1;
          var hour = Math.abs(h);
          var days = Math.floor(hour / 24) * n;
          hour = (hour % 24) * n;
          if (hour < 0) {
            hour += 24;
            days--;
          }
          var solar = this.next(days);
          return _fromYmdHms(solar.getYear(), solar.getMonth(), solar.getDay(), hour, solar.getMinute(), solar.getSecond());
        },
        getLunar:function(){
          return Lunar.fromSolar(this);
        },
        getJulianDay:function(){
          var y = this._p.year;
          var m = this._p.month;
          var d = this._p.day + ((this._p.second / 60 + this._p.minute) / 60 + this._p.hour) / 24;
          var n = 0;
          var g = false;
          if (y * 372 + m * 31 + Math.floor(d) >= 588829) {
            g = true;
          }
          if (m <= 2) {
            m += 12;
            y--;
          }
          if (g) {
            n = Math.floor(y / 100);
            n = 2 - n + Math.floor(n / 4);
          }
          return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + n - 1524.5;
        },
        getSalaryRate:function(){
          // 元旦节
          if (this._p.month === 1 && this._p.day === 1) {
            return 3;
          }
          // 劳动节
          if (this._p.month === 5 && this._p.day === 1) {
            return 3;
          }
          // 国庆
          if (this._p.month === 10 && this._p.day >= 1 && this._p.day <= 3) {
            return 3;
          }
          var lunar = this.getLunar();
          // 春节
          if (lunar.getMonth() === 1 && lunar.getDay() >= 1 && lunar.getDay() <= 3) {
            return 3;
          }
          // 端午
          if (lunar.getMonth() === 5 && lunar.getDay() === 5) {
            return 3;
          }
          // 中秋
          if (lunar.getMonth() === 8 && lunar.getDay() === 15) {
            return 3;
          }
          // 清明
          if ('清明' === lunar.getJieQi()) {
            return 3;
          }
          var holiday = HolidayUtil.getHoliday(this._p.year, this._p.month, this._p.day);
          if (holiday) {
            // 法定假日非上班
            if (!holiday.isWork()) {
              return 2;
            }
          } else {
            // 周末
            var week = this.getWeek();
            if (week === 6 || week === 0) {
              return 2;
            }
          }
          // 工作日
          return 1;
        }
      };
    };
    var _fromBaZi=function(yearGanZhi,monthGanZhi,dayGanZhi,timeGanZhi,sect,baseYear){
      sect *= 1;
      if(isNaN(sect)){
        sect = 2;
      }
      if (1 !== sect) {
        sect = 2;
      }
      baseYear *= 1;
      if(isNaN(baseYear)){
        baseYear = 1900;
      }
      var l = [];
      // 月地支距寅月的偏移值
      var m = LunarUtil.index(monthGanZhi.substring(1), LunarUtil.ZHI, -1) - 2;
      if (m < 0) {
        m += 12;
      }
      // 月天干要一致
      if (((LunarUtil.index(yearGanZhi.substring(0, 1), LunarUtil.GAN, -1) + 1) * 2 + m) % 10 !== LunarUtil.index(monthGanZhi.substring(0,1), LunarUtil.GAN, -1)) {
        return l;
      }
      // 1年的立春是辛酉，序号57
      var y = LunarUtil.getJiaZiIndex(yearGanZhi) - 57;
      if (y < 0) {
        y += 60;
      }
      y++;
      // 节令偏移值
      m *= 2;
      // 时辰地支转时刻，子时按零点算
      var h = LunarUtil.index(timeGanZhi.substring(1), LunarUtil.ZHI, -1) * 2;
      var hours = [h];
      if (0 === h && 2 === sect) {
        hours = [0, 23];
      }
      var startYear = baseYear - 1;

      // 结束年
      var endYear = new Date().getFullYear();

      while (y <= endYear) {
        if (y >= startYear) {
          // 立春为寅月的开始
          var jieQiLunar = Lunar.fromYmd(y, 1, 1);
          var jieQiList = jieQiLunar.getJieQiList();
          var jieQiTable = jieQiLunar.getJieQiTable();
          // 节令推移，年干支和月干支就都匹配上了
          var solarTime = jieQiTable[jieQiList[4 + m]];
          if (solarTime.getYear() >= baseYear) {
            // 日干支和节令干支的偏移值
            var d = LunarUtil.getJiaZiIndex(dayGanZhi) - LunarUtil.getJiaZiIndex(solarTime.getLunar().getDayInGanZhiExact2());
            if (d < 0) {
              d += 60;
            }
            if (d > 0) {
              // 从节令推移天数
              solarTime = solarTime.next(d);
            }
            for (var i = 0, j = hours.length; i < j; i++) {
              var hour = hours[i];
              var mi = 0;
              var s = 0;
              if (d === 0 && hour === solarTime.getHour()) {
                // 如果正好是节令当天，且小时和节令的小时数相等的极端情况，把分钟和秒钟带上
                mi = solarTime.getMinute();
                s = solarTime.getSecond();
              }
              // 验证一下
              var solar = Solar.fromYmdHms(solarTime.getYear(), solarTime.getMonth(), solarTime.getDay(), hour, mi, s);
              if (d === 30) {
                solar = solar.nextHour(-1);
              }
              var lunar = solar.getLunar();
              var dgz = (2 === sect) ? lunar.getDayInGanZhiExact2() : lunar.getDayInGanZhiExact();
              if (lunar.getYearInGanZhiExact() === yearGanZhi && lunar.getMonthInGanZhiExact() === monthGanZhi && dgz === dayGanZhi && lunar.getTimeInGanZhi() === timeGanZhi) {
                l.push(solar);
              }
            }
          }
        }
        y += 60;
      }
      return l;
    };
    return {
      J2000:2451545,
      fromYmd:function(y,m,d){return _fromYmdHms(y,m,d,0,0,0);},
      fromYmdHms:function(y,m,d,hour,minute,second){return _fromYmdHms(y,m,d,hour,minute,second);},
      fromDate:function(date){return _fromDate(date);},
      fromJulianDay:function(julianDay){return _fromJulianDay(julianDay);},
      fromBaZi:function(yearGanZhi,monthGanZhi,dayGanZhi,timeGanZhi,sect,baseYear){return _fromBaZi(yearGanZhi,monthGanZhi,dayGanZhi,timeGanZhi,sect,baseYear);}
    };
  })();