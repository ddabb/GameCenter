// part: 02-lunar
// classes: Lunar
// auto-extracted from lunar-javascript.js
  var Lunar = (function(){
    var _computeJieQi = function(o,ly) {
      o['jieQiList'] = [];
      o['jieQi'] = {};
      var julianDays = ly.getJieQiJulianDays();
      for (var i = 0, j = LunarUtil.JIE_QI_IN_USE.length; i < j; i++) {
        var key = LunarUtil.JIE_QI_IN_USE[i];
        o['jieQiList'].push(key);
        o['jieQi'][key] = Solar.fromJulianDay(julianDays[i]);
      }
    };
    var _computeYear = function(o,solar,year){
      //以正月初一开始
      var offset = year - 4;
      var yearGanIndex = offset % 10;
      var yearZhiIndex = offset % 12;

      if (yearGanIndex < 0) {
        yearGanIndex += 10;
      }

      if (yearZhiIndex < 0) {
        yearZhiIndex += 12;
      }

      //以立春作为新一年的开始的干支纪年
      var g = yearGanIndex;
      var z = yearZhiIndex;

      //精确的干支纪年，以立春交接时刻为准
      var gExact = yearGanIndex;
      var zExact = yearZhiIndex;

      var solarYear = solar.getYear();
      var solarYmd = solar.toYmd();
      var solarYmdHms = solar.toYmdHms();

      //获取立春的阳历时刻
      var liChun = o['jieQi'][I18n.getMessage('jq.liChun')];
      if (liChun.getYear() !== solarYear) {
        liChun = o['jieQi']['LI_CHUN'];
      }
      var liChunYmd = liChun.toYmd();
      var liChunYmdHms = liChun.toYmdHms();

      //阳历和阴历年份相同代表正月初一及以后
      if(year===solarYear){
        //立春日期判断
        if(solarYmd<liChunYmd) {
          g--;
          z--;
        }
        //立春交接时刻判断
        if(solarYmdHms<liChunYmdHms) {
          gExact--;
          zExact--;
        }
      }else if (year < solarYear){
        if(solarYmd>=liChunYmd) {
          g++;
          z++;
        }
        if(solarYmdHms>=liChunYmdHms) {
          gExact++;
          zExact++;
        }
      }

      o['yearGanIndex'] = yearGanIndex;
      o['yearZhiIndex'] = yearZhiIndex;
      o['yearGanIndexByLiChun'] = (g<0?g+10:g)%10;
      o['yearZhiIndexByLiChun'] = (z<0?z+12:z)%12;
      o['yearGanIndexExact'] = (gExact<0?gExact+10:gExact)%10;
      o['yearZhiIndexExact'] = (zExact<0?zExact+12:zExact)%12;
    };
    var _computeMonth = function(o,solar){
      var start = null;
      var i;
      var end;
      var size = LunarUtil.JIE_QI_IN_USE.length;

      //序号：大雪以前-3，大雪到小寒之间-2，小寒到立春之间-1，立春之后0
      var index = -3;
      for(i=0;i<size;i+=2){
        end = o.jieQi[LunarUtil.JIE_QI_IN_USE[i]];
        var ymd = solar.toYmd();
        var symd = null==start?ymd:start.toYmd();
        if(ymd>=symd&&ymd<end.toYmd()){
          break;
        }
        start = end;
        index++;
      }
      var offset = (((o.yearGanIndexByLiChun+(index<0?1:0)) % 5 + 1) * 2) % 10;
      o['monthGanIndex'] = ((index<0?index+10:index) + offset) % 10;
      o['monthZhiIndex'] = ((index<0?index+12:index) + LunarUtil.BASE_MONTH_ZHI_INDEX) % 12;

      start = null;
      index = -3;
      for(i=0;i<size;i+=2){
        end = o.jieQi[LunarUtil.JIE_QI_IN_USE[i]];
        var time = solar.toYmdHms();
        var stime = null==start?time:start.toYmdHms();
        if(time>=stime&&time<end.toYmdHms()){
          break;
        }
        start = end;
        index++;
      }
      offset = (((o.yearGanIndexExact+(index<0?1:0)) % 5 + 1) * 2) % 10;
      o['monthGanIndexExact'] = ((index<0?index+10:index) + offset) % 10;
      o['monthZhiIndexExact'] = ((index<0?index+12:index) + LunarUtil.BASE_MONTH_ZHI_INDEX) % 12;
    };
    var _computeDay = function(o,solar,hour,minute){
      var noon = Solar.fromYmdHms(solar.getYear(), solar.getMonth(), solar.getDay(), 12, 0, 0);
      var offset = Math.floor(noon.getJulianDay()) - 11;
      var dayGanIndex = offset % 10;
      var dayZhiIndex = offset % 12;

      o['dayGanIndex'] = dayGanIndex;
      o['dayZhiIndex'] = dayZhiIndex;
      var dayGanExact = dayGanIndex;
      var dayZhiExact = dayZhiIndex;
      o['dayGanIndexExact2'] = dayGanExact;
      o['dayZhiIndexExact2'] = dayZhiExact;
      var hm = (hour<10?'0':'')+hour+':'+(minute<10?'0':'')+minute;
      if(hm>='23:00'&&hm<='23:59'){
        dayGanExact++;
        if(dayGanExact>=10){
          dayGanExact -= 10;
        }
        dayZhiExact++;
        if(dayZhiExact>=12){
          dayZhiExact -= 12;
        }
      }
      o['dayGanIndexExact'] = dayGanExact;
      o['dayZhiIndexExact'] = dayZhiExact;
    };
    var _computeTime = function(o,hour,minute){
      var timeZhiIndex = LunarUtil.getTimeZhiIndex((hour<10?'0':'')+hour+':'+(minute<10?'0':'')+minute);
      o['timeZhiIndex'] = timeZhiIndex;
      o['timeGanIndex'] = (o['dayGanIndexExact']%5*2+timeZhiIndex)%10;
    };
    var _computeWeek = function(o,solar){
      o['weekIndex'] = solar.getWeek();
    };
    var _compute = function(year,hour,minute,second,solar,ly){
      var o = {};
      _computeJieQi(o, ly);
      _computeYear(o, solar, year);
      _computeMonth(o, solar);
      _computeDay(o, solar, hour, minute);
      _computeTime(o, hour, minute);
      _computeWeek(o, solar);
      return o;
    };
    var _fromSolar = function(solar){
      var lunarYear = 0;
      var lunarMonth = 0;
      var lunarDay = 0;
      var ly = LunarYear.fromYear(solar.getYear());
      var lms = ly.getMonths();
      for (var i = 0, j = lms.length; i < j; i++) {
        var m = lms[i];
        var days = solar.subtract(Solar.fromJulianDay(m.getFirstJulianDay()));
        if (days < m.getDayCount()) {
          lunarYear = m.getYear();
          lunarMonth = m.getMonth();
          lunarDay = days + 1;
          break;
        }
      }
      return _new(lunarYear, lunarMonth, lunarDay, solar.getHour(), solar.getMinute(), solar.getSecond(), solar, ly);
    };
    var _fromDate = function(date){
      return _fromSolar(Solar.fromDate(date));
    };
    var _fromYmdHms = function(lunarYear,lunarMonth,lunarDay,hour,minute,second) {
      var oy = lunarYear;
      var om = lunarMonth;
      var od = lunarDay;
      var oh = hour;
      var oi = minute;
      var os = second;
      lunarYear *= 1;
      if(isNaN(lunarYear)){
        throw new Error('wrong lunar year '+oy);
      }
      lunarMonth *= 1;
      if(isNaN(lunarMonth)){
        throw new Error('wrong lunar month '+om);
      }
      lunarDay *= 1;
      if(isNaN(lunarDay)){
        throw new Error('wrong lunar day '+od);
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
      if(hour<0||hour>23){
        throw new Error('wrong hour '+hour);
      }
      if(minute<0||minute>59){
        throw new Error('wrong minute '+minute);
      }
      if(second<0||second>59){
        throw new Error('wrong second '+second);
      }
      var y = LunarYear.fromYear(lunarYear);
      var m = y.getMonth(lunarMonth);
      if (null == m) {
        throw new Error('wrong lunar year '+lunarYear+' month '+lunarMonth);
      }
      if (lunarDay < 1) {
        throw new Error('lunar day must bigger than 0');
      }
      var days = m.getDayCount();
      if (lunarDay > days) {
        throw new Error('only '+days+' days in lunar year '+lunarYear+' month '+lunarMonth);
      }
      var noon = Solar.fromJulianDay(m.getFirstJulianDay() + lunarDay - 1);
      var solar = Solar.fromYmdHms(noon.getYear(), noon.getMonth(), noon.getDay(), hour, minute, second);
      if (noon.getYear() !== lunarYear) {
        y = LunarYear.fromYear(noon.getYear());
      }
      return _new(lunarYear, lunarMonth, lunarDay, hour, minute, second, solar, y);
    };
    var _new = function(year,month,day,hour,minute,second,solar,ly){
      var gz = _compute(year,hour,minute,second,solar,ly);
      return {
        _p:{
          lang: I18n.getLanguage(),
          year:year,
          month:month,
          day:day,
          hour:hour,
          minute:minute,
          second:second,
          timeGanIndex:gz.timeGanIndex,
          timeZhiIndex:gz.timeZhiIndex,
          dayGanIndex:gz.dayGanIndex,
          dayZhiIndex:gz.dayZhiIndex,
          dayGanIndexExact:gz.dayGanIndexExact,
          dayZhiIndexExact:gz.dayZhiIndexExact,
          dayGanIndexExact2:gz.dayGanIndexExact2,
          dayZhiIndexExact2:gz.dayZhiIndexExact2,
          monthGanIndex:gz.monthGanIndex,
          monthZhiIndex:gz.monthZhiIndex,
          monthGanIndexExact:gz.monthGanIndexExact,
          monthZhiIndexExact:gz.monthZhiIndexExact,
          yearGanIndex:gz.yearGanIndex,
          yearZhiIndex:gz.yearZhiIndex,
          yearGanIndexByLiChun:gz.yearGanIndexByLiChun,
          yearZhiIndexByLiChun:gz.yearZhiIndexByLiChun,
          yearGanIndexExact:gz.yearGanIndexExact,
          yearZhiIndexExact:gz.yearZhiIndexExact,
          weekIndex:gz.weekIndex,
          jieQi:gz.jieQi,
          jieQiList:gz.jieQiList,
          solar:solar,
          eightChar:null
        },
        getYear:function(){return this._p.year;},
        getMonth:function(){return this._p.month;},
        getDay:function(){return this._p.day;},
        getHour:function(){return this._p.hour;},
        getMinute:function(){return this._p.minute;},
        getSecond:function(){return this._p.second;},
        getTimeGanIndex:function(){return this._p.timeGanIndex;},
        getTimeZhiIndex:function(){return this._p.timeZhiIndex;},
        getDayGanIndex:function(){return this._p.dayGanIndex;},
        getDayGanIndexExact:function(){return this._p.dayGanIndexExact;},
        getDayGanIndexExact2:function(){return this._p.dayGanIndexExact2;},
        getDayZhiIndex:function(){return this._p.dayZhiIndex;},
        getDayZhiIndexExact:function(){return this._p.dayZhiIndexExact;},
        getDayZhiIndexExact2:function(){return this._p.dayZhiIndexExact2;},
        getMonthGanIndex:function(){return this._p.monthGanIndex;},
        getMonthGanIndexExact:function(){return this._p.monthGanIndexExact;},
        getMonthZhiIndex:function(){return this._p.monthZhiIndex;},
        getMonthZhiIndexExact:function(){return this._p.monthZhiIndexExact;},
        getYearGanIndex:function(){return this._p.yearGanIndex;},
        getYearGanIndexByLiChun:function(){return this._p.yearGanIndexByLiChun;},
        getYearGanIndexExact:function(){return this._p.yearGanIndexExact;},
        getYearZhiIndex:function(){return this._p.yearZhiIndex;},
        getYearZhiIndexByLiChun:function(){return this._p.yearZhiIndexByLiChun;},
        getYearZhiIndexExact:function(){return this._p.yearZhiIndexExact;},
        getGan:function(){return this.getYearGan();},
        getZhi:function(){return this.getYearZhi();},
        getYearGan:function(){return LunarUtil.GAN[this._p.yearGanIndex+1];},
        getYearGanByLiChun:function(){return LunarUtil.GAN[this._p.yearGanIndexByLiChun+1];},
        getYearGanExact:function(){return LunarUtil.GAN[this._p.yearGanIndexExact+1];},
        getYearZhi:function(){return LunarUtil.ZHI[this._p.yearZhiIndex+1];},
        getYearZhiByLiChun:function(){return LunarUtil.ZHI[this._p.yearZhiIndexByLiChun+1];},
        getYearZhiExact:function(){return LunarUtil.ZHI[this._p.yearZhiIndexExact+1];},
        getYearInGanZhi:function(){return this.getYearGan()+this.getYearZhi();},
        getYearInGanZhiByLiChun:function(){return this.getYearGanByLiChun()+this.getYearZhiByLiChun();},
        getYearInGanZhiExact:function(){return this.getYearGanExact()+this.getYearZhiExact();},
        getMonthGan:function(){return LunarUtil.GAN[this._p.monthGanIndex+1];},
        getMonthGanExact:function(){return LunarUtil.GAN[this._p.monthGanIndexExact+1];},
        getMonthZhi:function(){return LunarUtil.ZHI[this._p.monthZhiIndex+1];},
        getMonthZhiExact:function(){return LunarUtil.ZHI[this._p.monthZhiIndexExact+1];},
        getMonthInGanZhi:function(){return this.getMonthGan()+this.getMonthZhi();},
        getMonthInGanZhiExact:function(){return this.getMonthGanExact()+this.getMonthZhiExact();},
        getDayGan:function(){return LunarUtil.GAN[this._p.dayGanIndex+1];},
        getDayGanExact:function(){return LunarUtil.GAN[this._p.dayGanIndexExact+1];},
        getDayGanExact2:function(){return LunarUtil.GAN[this._p.dayGanIndexExact2+1];},
        getDayZhi:function(){return LunarUtil.ZHI[this._p.dayZhiIndex+1];},
        getDayZhiExact:function(){return LunarUtil.ZHI[this._p.dayZhiIndexExact+1];},
        getDayZhiExact2:function(){return LunarUtil.ZHI[this._p.dayZhiIndexExact2+1];},
        getDayInGanZhi:function(){return this.getDayGan()+this.getDayZhi();},
        getDayInGanZhiExact:function(){return this.getDayGanExact()+this.getDayZhiExact();},
        getDayInGanZhiExact2:function(){return this.getDayGanExact2()+this.getDayZhiExact2();},
        getTimeGan:function(){return LunarUtil.GAN[this._p.timeGanIndex+1];},
        getTimeZhi:function(){return LunarUtil.ZHI[this._p.timeZhiIndex+1];},
        getTimeInGanZhi:function(){return this.getTimeGan()+this.getTimeZhi();},
        getShengxiao:function(){return this.getYearShengXiao();},
        getYearShengXiao:function(){return LunarUtil.SHENGXIAO[this._p.yearZhiIndex+1];},
        getYearShengXiaoByLiChun:function(){return LunarUtil.SHENGXIAO[this._p.yearZhiIndexByLiChun+1];},
        getYearShengXiaoExact:function(){return LunarUtil.SHENGXIAO[this._p.yearZhiIndexExact+1];},
        getMonthShengXiao:function(){return LunarUtil.SHENGXIAO[this._p.monthZhiIndex+1];},
        getMonthShengXiaoExact:function(){return LunarUtil.SHENGXIAO[this._p.monthZhiIndexExact+1];},
        getDayShengXiao:function(){return LunarUtil.SHENGXIAO[this._p.dayZhiIndex+1];},
        getTimeShengXiao:function(){return LunarUtil.SHENGXIAO[this._p.timeZhiIndex+1];},
        getYearInChinese:function(){
          var y = this._p.year+'';
          var s = '';
          var zero = '0'.charCodeAt(0);
          for(var i=0,j=y.length;i<j;i++){
            s+=LunarUtil.NUMBER[y.charCodeAt(i)-zero];
          }
          return s;
        },
        getMonthInChinese:function(){
          var month = this._p.month;
          return (month<0?'闰':'')+LunarUtil.MONTH[Math.abs(month)];
        },
        getDayInChinese:function(){
          return LunarUtil.DAY[this._p.day];
        },
        getPengZuGan:function(){
          return LunarUtil.PENGZU_GAN[this._p.dayGanIndex+1];
        },
        getPengZuZhi:function(){
          return LunarUtil.PENGZU_ZHI[this._p.dayZhiIndex+1];
        },
        getPositionXi:function(){
          return this.getDayPositionXi();
        },
        getPositionXiDesc:function(){
          return this.getDayPositionXiDesc();
        },
        getPositionYangGui:function(){
          return this.getDayPositionYangGui();
        },
        getPositionYangGuiDesc:function(){
          return this.getDayPositionYangGuiDesc();
        },
        getPositionYinGui:function(){
          return this.getDayPositionYinGui();
        },
        getPositionYinGuiDesc:function(){
          return this.getDayPositionYinGuiDesc();
        },
        getPositionFu:function(){
          return this.getDayPositionFu();
        },
        getPositionFuDesc:function(){
          return this.getDayPositionFuDesc();
        },
        getPositionCai:function(){
          return this.getDayPositionCai();
        },
        getPositionCaiDesc:function(){
          return this.getDayPositionCaiDesc();
        },
        getDayPositionXi:function(){
          return LunarUtil.POSITION_XI[this._p.dayGanIndex+1];
        },
        getDayPositionXiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getDayPositionXi()];
        },
        getDayPositionYangGui:function(){
          return LunarUtil.POSITION_YANG_GUI[this._p.dayGanIndex+1];
        },
        getDayPositionYangGuiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getDayPositionYangGui()];
        },
        getDayPositionYinGui:function(){
          return LunarUtil.POSITION_YIN_GUI[this._p.dayGanIndex+1];
        },
        getDayPositionYinGuiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getDayPositionYinGui()];
        },
        getDayPositionFu:function(sect){
          return (1===sect?LunarUtil.POSITION_FU:LunarUtil.POSITION_FU_2)[this._p.dayGanIndex+1];
        },
        getDayPositionFuDesc:function(sect){
          return LunarUtil.POSITION_DESC[this.getDayPositionFu(sect)];
        },
        getDayPositionCai:function(){
          return LunarUtil.POSITION_CAI[this._p.dayGanIndex+1];
        },
        getDayPositionCaiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getDayPositionCai()];
        },
        getTimePositionXi:function(){
          return LunarUtil.POSITION_XI[this._p.timeGanIndex+1];
        },
        getTimePositionXiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getTimePositionXi()];
        },
        getTimePositionYangGui:function(){
          return LunarUtil.POSITION_YANG_GUI[this._p.timeGanIndex+1];
        },
        getTimePositionYangGuiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getTimePositionYangGui()];
        },
        getTimePositionYinGui:function(){
          return LunarUtil.POSITION_YIN_GUI[this._p.timeGanIndex+1];
        },
        getTimePositionYinGuiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getTimePositionYinGui()];
        },
        getTimePositionFu:function(sect){
          return (1===sect?LunarUtil.POSITION_FU:LunarUtil.POSITION_FU_2)[this._p.timeGanIndex+1];
        },
        getTimePositionFuDesc:function(sect){
          return LunarUtil.POSITION_DESC[this.getTimePositionFu(sect)];
        },
        getTimePositionCai:function(){
          return LunarUtil.POSITION_CAI[this._p.timeGanIndex+1];
        },
        getTimePositionCaiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getTimePositionCai()];
        },
        getDayPositionTaiSui:function(sect){
          var dayInGanZhi;
          var yearZhiIndex;
          switch (sect) {
            case 1:
              dayInGanZhi = this.getDayInGanZhi();
              yearZhiIndex = this._p.yearZhiIndex;
              break;
            case 3:
              dayInGanZhi = this.getDayInGanZhi();
              yearZhiIndex = this._p.yearZhiIndexExact;
              break;
            default:
              dayInGanZhi = this.getDayInGanZhiExact2();
              yearZhiIndex = this._p.yearZhiIndexByLiChun;
          }
          var p;
          if ([I18n.getMessage('jz.jiaZi'), I18n.getMessage('jz.yiChou'), I18n.getMessage('jz.bingYin'), I18n.getMessage('jz.dingMao'), I18n.getMessage('jz.wuChen'), I18n.getMessage('jz.jiSi')].join(',').indexOf(dayInGanZhi) > -1) {
            p = I18n.getMessage('bg.zhen');
          } else if ([I18n.getMessage('jz.bingZi'), I18n.getMessage('jz.dingChou'), I18n.getMessage('jz.wuYin'), I18n.getMessage('jz.jiMao'), I18n.getMessage('jz.gengChen'), I18n.getMessage('jz.xinSi')].join(',').indexOf(dayInGanZhi) > -1) {
            p = I18n.getMessage('bg.li');
          } else if ([I18n.getMessage('jz.wuZi'), I18n.getMessage('jz.jiChou'), I18n.getMessage('jz.gengYin'), I18n.getMessage('jz.xinMao'), I18n.getMessage('jz.renChen'), I18n.getMessage('jz.guiSi')].join(',').indexOf(dayInGanZhi) > -1) {
            p = I18n.getMessage('ps.center');
          } else if ([I18n.getMessage('jz.gengZi'), I18n.getMessage('jz.xinChou'), I18n.getMessage('jz.renYin'), I18n.getMessage('jz.guiMao'), I18n.getMessage('jz.jiaChen'), I18n.getMessage('jz.yiSi')].join(',').indexOf(dayInGanZhi) > -1) {
            p = I18n.getMessage('bg.dui');
          } else if ([I18n.getMessage('jz.renZi'), I18n.getMessage('jz.guiChou'), I18n.getMessage('jz.jiaYin'), I18n.getMessage('jz.yiMao'), I18n.getMessage('jz.bingChen'), I18n.getMessage('jz.dingSi')].join(',').indexOf(dayInGanZhi) > -1) {
            p = I18n.getMessage('bg.kan');
          } else {
            p = LunarUtil.POSITION_TAI_SUI_YEAR[yearZhiIndex];
          }
          return p;
        },
        getDayPositionTaiSuiDesc:function(sect){
          return LunarUtil.POSITION_DESC[this.getDayPositionTaiSui(sect)];
        },
        getMonthPositionTaiSui:function(sect){
          var monthZhiIndex;
          var monthGanIndex;
          switch (sect) {
            case 3:
              monthZhiIndex = this._p.monthZhiIndexExact;
              monthGanIndex = this._p.monthGanIndexExact;
              break;
            default:
              monthZhiIndex = this._p.monthZhiIndex;
              monthGanIndex = this._p.monthGanIndex;
          }
          var m = monthZhiIndex - LunarUtil.BASE_MONTH_ZHI_INDEX;
          if (m < 0) {
            m += 12;
          }
          return [I18n.getMessage('bg.gen'), LunarUtil.POSITION_GAN[monthGanIndex], I18n.getMessage('bg.kun'), I18n.getMessage('bg.xun')][m % 4]
        },
        getMonthPositionTaiSuiDesc:function(sect){
          return LunarUtil.POSITION_DESC[this.getMonthPositionTaiSui(sect)];
        },
        getYearPositionTaiSui:function(sect){
          var yearZhiIndex;
          switch (sect) {
            case 1:
              yearZhiIndex = this._p.yearZhiIndex;
              break;
            case 3:
              yearZhiIndex = this._p.yearZhiIndexExact;
              break;
            default:
              yearZhiIndex = this._p.yearZhiIndexByLiChun;
          }
          return LunarUtil.POSITION_TAI_SUI_YEAR[yearZhiIndex];
        },
        getYearPositionTaiSuiDesc:function(sect){
          return LunarUtil.POSITION_DESC[this.getYearPositionTaiSui(sect)];
        },
        _checkLang:function(){
          var lang = I18n.getLanguage();
          if (this._p.lang !== lang) {
            for (var i = 0, j = LunarUtil.JIE_QI_IN_USE.length; i < j; i++) {
              var newKey = LunarUtil.JIE_QI_IN_USE[i];
              var oldKey = this._p.jieQiList[i];
              var value = this._p.jieQi[oldKey];
              this._p.jieQiList[i] = newKey;
              this._p.jieQi[newKey] = value;
            }
            this._p.lang = lang;
          }
        },
        _getJieQiSolar:function(name){
          this._checkLang();
          return this._p.jieQi[name];
        },
        getChong:function(){
          return this.getDayChong();
        },
        getChongGan:function(){
          return this.getDayChongGan();
        },
        getChongGanTie:function(){
          return this.getDayChongGanTie();
        },
        getChongShengXiao:function(){
          return this.getDayChongShengXiao();
        },
        getChongDesc:function(){
          return this.getDayChongDesc();
        },
        getSha:function(){
          return this.getDaySha();
        },
        getDayChong:function(){
          return LunarUtil.CHONG[this._p.dayZhiIndex];
        },
        getDayChongGan:function(){
          return LunarUtil.CHONG_GAN[this._p.dayGanIndex];
        },
        getDayChongGanTie:function(){
          return LunarUtil.CHONG_GAN_TIE[this._p.dayGanIndex];
        },
        getDayChongShengXiao:function(){
          var chong = this.getChong();
          for(var i=0,j=LunarUtil.ZHI.length;i<j;i++){
            if(LunarUtil.ZHI[i]===chong){
              return LunarUtil.SHENGXIAO[i];
            }
          }
          return '';
        },
        getDayChongDesc:function(){
          return '('+this.getDayChongGan()+this.getDayChong()+')'+this.getDayChongShengXiao();
        },
        getDaySha:function(){
          return LunarUtil.SHA[this.getDayZhi()];
        },
        getTimeChong:function(){
          return LunarUtil.CHONG[this._p.timeZhiIndex];
        },
        getTimeChongGan:function(){
          return LunarUtil.CHONG_GAN[this._p.timeGanIndex];
        },
        getTimeChongGanTie:function(){
          return LunarUtil.CHONG_GAN_TIE[this._p.timeGanIndex];
        },
        getTimeChongShengXiao:function(){
          var chong = this.getTimeChong();
          for(var i=0,j=LunarUtil.ZHI.length;i<j;i++){
            if(LunarUtil.ZHI[i]===chong){
              return LunarUtil.SHENGXIAO[i];
            }
          }
          return '';
        },
        getTimeChongDesc:function(){
          return '('+this.getTimeChongGan()+this.getTimeChong()+')'+this.getTimeChongShengXiao();
        },
        getTimeSha:function(){
          return LunarUtil.SHA[this.getTimeZhi()];
        },
        getYearNaYin:function(){
          return LunarUtil.NAYIN[this.getYearInGanZhi()];
        },
        getMonthNaYin:function(){
          return LunarUtil.NAYIN[this.getMonthInGanZhi()];
        },
        getDayNaYin:function(){
          return LunarUtil.NAYIN[this.getDayInGanZhi()];
        },
        getTimeNaYin:function(){
          return LunarUtil.NAYIN[this.getTimeInGanZhi()];
        },
        getSeason:function(){
          return LunarUtil.SEASON[Math.abs(this._p.month)];
        },
        _convertJieQi:function(name){
          var jq = name;
          if ('DONG_ZHI' === jq) {
            jq = I18n.getMessage('jq.dongZhi');
          } else if ('DA_HAN' === jq) {
            jq = I18n.getMessage('jq.daHan');
          } else if ('XIAO_HAN' === jq) {
            jq = I18n.getMessage('jq.xiaoHan');
          } else if ('LI_CHUN' === jq) {
            jq = I18n.getMessage('jq.liChun');
          } else if ('DA_XUE' === jq) {
            jq = I18n.getMessage('jq.daXue');
          } else if ('YU_SHUI' === jq) {
            jq = I18n.getMessage('jq.yuShui');
          } else if ('JING_ZHE' === jq) {
            jq = I18n.getMessage('jq.jingZhe');
          }
          return jq;
        },
        getJie:function(){
          for(var i=0, j=LunarUtil.JIE_QI_IN_USE.length; i<j; i+=2){
            var key = LunarUtil.JIE_QI_IN_USE[i];
            var d = this._getJieQiSolar(key);
            if(d.getYear() === this._p.solar.getYear() && d.getMonth() === this._p.solar.getMonth() && d.getDay() === this._p.solar.getDay()){
              return this._convertJieQi(key);
            }
          }
          return '';
        },
        getQi:function(){
          for(var i=1, j=LunarUtil.JIE_QI_IN_USE.length; i<j; i+=2){
            var key = LunarUtil.JIE_QI_IN_USE[i];
            var d = this._getJieQiSolar(key);
            if(d.getYear() === this._p.solar.getYear() && d.getMonth() === this._p.solar.getMonth() && d.getDay() === this._p.solar.getDay()){
              return this._convertJieQi(key);
            }
          }
          return '';
        },
        getJieQi:function(){
          for(var key in this._p.jieQi){
            var d = this._getJieQiSolar(key);
            if(d.getYear() === this._p.solar.getYear() && d.getMonth() === this._p.solar.getMonth() && d.getDay() === this._p.solar.getDay()){
              return this._convertJieQi(key);
            }
          }
          return '';
        },
        getWeek:function(){
          return this._p.weekIndex;
        },
        getWeekInChinese:function(){
          return SolarUtil.WEEK[this.getWeek()];
        },
        getXiu:function(){
          return LunarUtil.XIU[this.getDayZhi()+this.getWeek()];
        },
        getXiuLuck:function(){
          return LunarUtil.XIU_LUCK[this.getXiu()];
        },
        getXiuSong:function(){
          return LunarUtil.XIU_SONG[this.getXiu()];
        },
        getZheng:function(){
          return LunarUtil.ZHENG[this.getXiu()];
        },
        getAnimal:function(){
          return LunarUtil.ANIMAL[this.getXiu()];
        },
        getGong:function(){
          return LunarUtil.GONG[this.getXiu()];
        },
        getShou:function(){
          return LunarUtil.SHOU[this.getGong()];
        },
        getFestivals:function(){
          var l = [];
          var f = LunarUtil.FESTIVAL[this._p.month+'-'+this._p.day];
          if(f){
            l.push(f);
          }
          if (Math.abs(this._p.month) === 12 && this._p.day >= 29 && this._p.year !== this.next(1).getYear()) {
            l.push(I18n.getMessage('jr.chuXi'));
          }
          return l;
        },
        getOtherFestivals:function(){
          var l=[];
          var fs=LunarUtil.OTHER_FESTIVAL[this._p.month+'-'+this._p.day];
          if(fs){
            l=l.concat(fs);
          }
          var solarYmd = this._p.solar.toYmd();
          if(this._p.solar.toYmd() === this._getJieQiSolar(I18n.getMessage('jq.qingMing')).next(-1).toYmd()){
            l.push('寒食节');
          }

          var jq = this._getJieQiSolar(I18n.getMessage('jq.liChun'));
          var offset = 4 - jq.getLunar().getDayGanIndex();
          if (offset < 0) {
            offset += 10;
          }
          if (solarYmd === jq.next(offset + 40).toYmd()) {
            l.push('春社');
          }

          jq = this._getJieQiSolar(I18n.getMessage('jq.liQiu'));
          offset = 4 - jq.getLunar().getDayGanIndex();
          if (offset < 0) {
            offset += 10;
          }
          if (solarYmd === jq.next(offset + 40).toYmd()) {
            l.push('秋社');
          }
          return l;
        },
        getBaZi:function(){
          var bz = this.getEightChar();
          var l = [];
          l.push(bz.getYear());
          l.push(bz.getMonth());
          l.push(bz.getDay());
          l.push(bz.getTime());
          return l;
        },
        getBaZiWuXing:function(){
          var bz = this.getEightChar();
          var l = [];
          l.push(bz.getYearWuXing());
          l.push(bz.getMonthWuXing());
          l.push(bz.getDayWuXing());
          l.push(bz.getTimeWuXing());
          return l;
        },
        getBaZiNaYin:function(){
          var bz = this.getEightChar();
          var l = [];
          l.push(bz.getYearNaYin());
          l.push(bz.getMonthNaYin());
          l.push(bz.getDayNaYin());
          l.push(bz.getTimeNaYin());
          return l;
        },
        getBaZiShiShenGan:function(){
          var bz = this.getEightChar();
          var l = [];
          l.push(bz.getYearShiShenGan());
          l.push(bz.getMonthShiShenGan());
          l.push(bz.getDayShiShenGan());
          l.push(bz.getTimeShiShenGan());
          return l;
        },
        getBaZiShiShenZhi:function(){
          var bz = this.getEightChar();
          var l = [];
          l.push(bz.getYearShiShenZhi()[0]);
          l.push(bz.getMonthShiShenZhi()[0]);
          l.push(bz.getDayShiShenZhi()[0]);
          l.push(bz.getTimeShiShenZhi()[0]);
          return l;
        },
        getBaZiShiShenYearZhi:function(){
          return this.getEightChar().getYearShiShenZhi();
        },
        getBaZiShiShenMonthZhi:function(){
          return this.getEightChar().getMonthShiShenZhi();
        },
        getBaZiShiShenDayZhi:function(){
          return this.getEightChar().getDayShiShenZhi();
        },
        getBaZiShiShenTimeZhi:function(){
          return this.getEightChar().getTimeShiShenZhi();
        },
        getZhiXing:function(){
          var offset = this._p.dayZhiIndex-this._p.monthZhiIndex;
          if(offset<0){
            offset += 12;
          }
          return LunarUtil.ZHI_XING[offset+1];
        },
        getDayTianShen:function(){
          var monthZhi = this.getMonthZhi();
          var offset = LunarUtil.ZHI_TIAN_SHEN_OFFSET[monthZhi];
          return LunarUtil.TIAN_SHEN[(this._p.dayZhiIndex+offset)%12+1];
        },
        getTimeTianShen:function(){
          var dayZhi = this.getDayZhiExact();
          var offset = LunarUtil.ZHI_TIAN_SHEN_OFFSET[dayZhi];
          return LunarUtil.TIAN_SHEN[(this._p.timeZhiIndex+offset)%12+1];
        },
        getDayTianShenType:function(){
          return LunarUtil.TIAN_SHEN_TYPE[this.getDayTianShen()];
        },
        getTimeTianShenType:function(){
          return LunarUtil.TIAN_SHEN_TYPE[this.getTimeTianShen()];
        },
        getDayTianShenLuck:function(){
          return LunarUtil.TIAN_SHEN_TYPE_LUCK[this.getDayTianShenType()];
        },
        getTimeTianShenLuck:function(){
          return LunarUtil.TIAN_SHEN_TYPE_LUCK[this.getTimeTianShenType()];
        },
        getDayPositionTai:function(){
          return LunarUtil.POSITION_TAI_DAY[LunarUtil.getJiaZiIndex(this.getDayInGanZhi())];
        },
        getMonthPositionTai:function(){
          var m = this._p.month;
          if(m<0){
            return '';
          }
          return LunarUtil.POSITION_TAI_MONTH[m-1];
        },
        getDayYi:function(sect){
          sect *= 1;
          if(isNaN(sect)){
            sect = 1;
          }
          return LunarUtil.getDayYi(2 === sect ? this.getMonthInGanZhiExact() : this.getMonthInGanZhi(), this.getDayInGanZhi());
        },
        getDayJi:function(sect){
          sect *= 1;
          if(isNaN(sect)){
            sect = 1;
          }
          return LunarUtil.getDayJi(2 === sect ? this.getMonthInGanZhiExact() : this.getMonthInGanZhi(), this.getDayInGanZhi());
        },
        getDayJiShen:function(){
          return LunarUtil.getDayJiShen(this.getMonthZhiIndex(), this.getDayInGanZhi());
        },
        getDayXiongSha:function(){
          return LunarUtil.getDayXiongSha(this.getMonthZhiIndex(), this.getDayInGanZhi());
        },
        getTimeYi:function(){
          return LunarUtil.getTimeYi(this.getDayInGanZhiExact(), this.getTimeInGanZhi());
        },
        getTimeJi:function(){
          return LunarUtil.getTimeJi(this.getDayInGanZhiExact(), this.getTimeInGanZhi());
        },
        getYueXiang:function(){
          return LunarUtil.YUE_XIANG[this._p.day];
        },
        _getYearNineStar:function(yearInGanZhi){
          var indexExact = LunarUtil.getJiaZiIndex(yearInGanZhi) + 1;
          var index = LunarUtil.getJiaZiIndex(this.getYearInGanZhi()) + 1;
          var yearOffset = indexExact - index;
          if (yearOffset > 1) {
            yearOffset -= 60;
          } else if (yearOffset < -1) {
            yearOffset += 60;
          }
          var yuan = Math.floor((this._p.year + yearOffset + 2696) / 60) % 3;
          var offset = (62 + yuan * 3 - indexExact) % 9;
          if(0 === offset){
            offset = 9;
          }
          return NineStar.fromIndex(offset - 1);
        },
        getYearNineStar:function(sect){
          var yearInGanZhi;
          switch (sect) {
            case 1:
              yearInGanZhi = this.getYearInGanZhi();
              break;
            case 3:
              yearInGanZhi = this.getYearInGanZhiExact();
              break;
            default:
              yearInGanZhi = this.getYearInGanZhiByLiChun();
          }
          return this._getYearNineStar(yearInGanZhi);
        },
        getMonthNineStar:function(sect){
          var yearZhiIndex;
          var monthZhiIndex;
          switch (sect) {
            case 1:
              yearZhiIndex = this._p.yearZhiIndex;
              monthZhiIndex = this._p.monthZhiIndex;
              break;
            case 3:
              yearZhiIndex = this._p.yearZhiIndexExact;
              monthZhiIndex = this._p.monthZhiIndexExact;
              break;
            default:
              yearZhiIndex = this._p.yearZhiIndexByLiChun;
              monthZhiIndex = this._p.monthZhiIndex;
          }
          var n = 27 - (yearZhiIndex % 3 * 3);
          if (monthZhiIndex < LunarUtil.BASE_MONTH_ZHI_INDEX) {
            n -= 3;
          }
          return NineStar.fromIndex((n - monthZhiIndex) % 9);
        },
        getDayNineStar:function(){
          var solarYmd = this._p.solar.toYmd();
          var dongZhi = this._getJieQiSolar(I18n.getMessage('jq.dongZhi'));
          var dongZhi2 = this._getJieQiSolar('DONG_ZHI');
          var xiaZhi = this._getJieQiSolar(I18n.getMessage('jq.xiaZhi'));
          var dongZhiIndex = LunarUtil.getJiaZiIndex(dongZhi.getLunar().getDayInGanZhi());
          var dongZhiIndex2 = LunarUtil.getJiaZiIndex(dongZhi2.getLunar().getDayInGanZhi());
          var xiaZhiIndex = LunarUtil.getJiaZiIndex(xiaZhi.getLunar().getDayInGanZhi());
          var solarShunBai;
          var solarShunBai2;
          var solarNiZi;
          if (dongZhiIndex>29) {
            solarShunBai = dongZhi.next(60 - dongZhiIndex);
          } else {
            solarShunBai = dongZhi.next(-dongZhiIndex);
          }
          var solarShunBaiYmd = solarShunBai.toYmd();
          if (dongZhiIndex2>29) {
            solarShunBai2 = dongZhi2.next(60 - dongZhiIndex2);
          } else {
            solarShunBai2 = dongZhi2.next(-dongZhiIndex2);
          }
          var solarShunBaiYmd2 = solarShunBai2.toYmd();
          if (xiaZhiIndex>29) {
            solarNiZi = xiaZhi.next(60 - xiaZhiIndex);
          } else {
            solarNiZi = xiaZhi.next(-xiaZhiIndex);
          }
          var solarNiZiYmd = solarNiZi.toYmd();
          var offset = 0;
          if (solarYmd >= solarShunBaiYmd && solarYmd < solarNiZiYmd) {
            offset = this._p.solar.subtract(solarShunBai) % 9;
          } else if (solarYmd >= solarNiZiYmd && solarYmd < solarShunBaiYmd2){
            offset = 8 - (this._p.solar.subtract(solarNiZi) % 9);
          } else if (solarYmd >= solarShunBaiYmd2) {
            offset = this._p.solar.subtract(solarShunBai2) % 9;
          } else if (solarYmd < solarShunBaiYmd) {
            offset = (8 + solarShunBai.subtract(this._p.solar)) % 9;
          }
          return NineStar.fromIndex(offset);
        },
        getTimeNineStar:function(){
          var solarYmd = this._p.solar.toYmd();
          var asc = false;
          if((solarYmd >= this._getJieQiSolar(I18n.getMessage('jq.dongZhi')).toYmd() && solarYmd < this._getJieQiSolar(I18n.getMessage('jq.xiaZhi')).toYmd()) || solarYmd >= this._getJieQiSolar('DONG_ZHI').toYmd()){
            asc = true;
          }
          var offset = asc ? [0, 3, 6] : [8, 5, 2];
          var start = offset[this.getDayZhiIndex() % 3];
          var timeZhiIndex = this.getTimeZhiIndex();
          var index = asc ? (start + timeZhiIndex) : (start + 9 - timeZhiIndex);
          return NineStar.fromIndex(index % 9);
        },
        getSolar:function(){
          return this._p.solar;
        },
        getJieQiTable:function(){
          this._checkLang();
          return this._p.jieQi;
        },
        getJieQiList:function(){
          return this._p.jieQiList;
        },
        getNextJie:function(wholeDay){
          var conditions = [];
          for(var i=0,j=LunarUtil.JIE_QI_IN_USE.length/2;i<j;i++){
            conditions.push(LunarUtil.JIE_QI_IN_USE[i*2]);
          }
          return this._getNearJieQi(true, conditions, wholeDay);
        },
        getPrevJie:function(wholeDay) {
          var conditions = [];
          for (var i = 0, j = LunarUtil.JIE_QI_IN_USE.length / 2; i < j; i++) {
            conditions.push(LunarUtil.JIE_QI_IN_USE[i * 2]);
          }
          return this._getNearJieQi(false, conditions, wholeDay);
        },
        getNextQi:function(wholeDay) {
          var conditions = [];
          for (var i = 0, j = LunarUtil.JIE_QI_IN_USE.length / 2; i < j; i++) {
            conditions.push(LunarUtil.JIE_QI_IN_USE[i * 2 + 1]);
          }
          return this._getNearJieQi(true, conditions, wholeDay);
        },
        getPrevQi:function(wholeDay) {
          var conditions = [];
          for (var i = 0, j = LunarUtil.JIE_QI_IN_USE.length / 2; i < j; i++) {
            conditions.push(LunarUtil.JIE_QI_IN_USE[i * 2 + 1]);
          }
          return this._getNearJieQi(false, conditions, wholeDay);
        },
        getNextJieQi:function(wholeDay){return this._getNearJieQi(true, null, wholeDay);},
        getPrevJieQi:function(wholeDay){return this._getNearJieQi(false, null, wholeDay);},
        _buildJieQi:function(name, solar){
          var jie=false;
          var qi=false;
          for(var i=0,j=LunarUtil.JIE_QI.length;i<j;i++){
            if(LunarUtil.JIE_QI[i]===name){
              if(i%2===0){
                qi = true;
              }else{
                jie = true;
              }
              break;
            }
          }
          return {
            _p: {
              name: name,
              solar: solar,
              jie: jie,
              qi: qi
            },
            getName: function(){return this._p.name;},
            getSolar: function(){return this._p.solar;},
            setName: function(name){this._p.name=name;},
            setSolar: function(solar){this._p.solar=solar;},
            isJie: function(){return this._p.jie;},
            isQi: function(){return this._p.qi;},
            toString: function(){return this.getName();}
          };
        },
        _getNearJieQi:function(forward, conditions, wholeDay){
          var name = null;
          var near = null;
          var filters = {};
          var filter = false;
          if(null!=conditions){
            for(var i=0,j=conditions.length;i<j;i++){
              filters[conditions[i]] = true;
              filter = true;
            }
          }
          var today = this._p.solar[wholeDay ? 'toYmd' : 'toYmdHms']();
          for(var key in this._p.jieQi){
            var jq = this._convertJieQi(key);
            if(filter){
              if(!filters[jq]){
                continue;
              }
            }
            var solar = this._getJieQiSolar(key);
            var day = solar[wholeDay ? 'toYmd' : 'toYmdHms']();
            if(forward){
              if(day<=today){
                continue;
              }
              if(null == near || day < near[wholeDay ? 'toYmd' : 'toYmdHms']()){
                name = jq;
                near = solar;
              }
            }else{
              if(day>today){
                continue;
              }
              if(null == near || day > near[wholeDay ? 'toYmd' : 'toYmdHms']()) {
                name = jq;
                near = solar;
              }
            }
          }
          if(null==near){
            return null;
          }
          return this._buildJieQi(name, near);
        },
        getCurrentJieQi:function(){
          for(var key in this._p.jieQi){
            var d = this._getJieQiSolar(key);
            if(d.getYear() === this._p.solar.getYear() && d.getMonth() === this._p.solar.getMonth() && d.getDay() === this._p.solar.getDay()){
              return this._buildJieQi(this._convertJieQi(key), d);
            }
          }
          return null;
        },
        getCurrentJie:function(){
          for(var i=0, j=LunarUtil.JIE_QI_IN_USE.length; i<j; i+=2){
            var key = LunarUtil.JIE_QI_IN_USE[i];
            var d = this._getJieQiSolar(key);
            if(d.getYear() === this._p.solar.getYear() && d.getMonth() === this._p.solar.getMonth() && d.getDay() === this._p.solar.getDay()){
              return this._buildJieQi(this._convertJieQi(key), d);
            }
          }
          return null;
        },
        getCurrentQi:function(){
          for(var i=1, j=LunarUtil.JIE_QI_IN_USE.length; i<j; i+=2){
            var key = LunarUtil.JIE_QI_IN_USE[i];
            var d = this._getJieQiSolar(key);
            if(d.getYear() === this._p.solar.getYear() && d.getMonth() === this._p.solar.getMonth() && d.getDay() === this._p.solar.getDay()){
              return this._buildJieQi(this._convertJieQi(key), d);
            }
          }
          return null;
        },
        getEightChar:function(){
          if(!this._p.eightChar){
            this._p.eightChar=EightChar.fromLunar(this);
          }
          return this._p.eightChar;
        },
        next:function(days){
          return this._p.solar.next(days).getLunar();
        },
        getYearXun:function(){
          return LunarUtil.getXun(this.getYearInGanZhi());
        },
        getMonthXun:function(){
          return LunarUtil.getXun(this.getMonthInGanZhi());
        },
        getDayXun:function(){
          return LunarUtil.getXun(this.getDayInGanZhi());
        },
        getTimeXun:function(){
          return LunarUtil.getXun(this.getTimeInGanZhi());
        },
        getYearXunByLiChun:function(){
          return LunarUtil.getXun(this.getYearInGanZhiByLiChun());
        },
        getYearXunExact:function(){
          return LunarUtil.getXun(this.getYearInGanZhiExact());
        },
        getMonthXunExact:function(){
          return LunarUtil.getXun(this.getMonthInGanZhiExact());
        },
        getDayXunExact:function(){
          return LunarUtil.getXun(this.getDayInGanZhiExact());
        },
        getDayXunExact2:function(){
          return LunarUtil.getXun(this.getDayInGanZhiExact2());
        },
        getYearXunKong:function(){
          return LunarUtil.getXunKong(this.getYearInGanZhi());
        },
        getMonthXunKong:function(){
          return LunarUtil.getXunKong(this.getMonthInGanZhi());
        },
        getDayXunKong:function(){
          return LunarUtil.getXunKong(this.getDayInGanZhi());
        },
        getTimeXunKong:function(){
          return LunarUtil.getXunKong(this.getTimeInGanZhi());
        },
        getYearXunKongByLiChun:function(){
          return LunarUtil.getXunKong(this.getYearInGanZhiByLiChun());
        },
        getYearXunKongExact:function(){
          return LunarUtil.getXunKong(this.getYearInGanZhiExact());
        },
        getMonthXunKongExact:function(){
          return LunarUtil.getXunKong(this.getMonthInGanZhiExact());
        },
        getDayXunKongExact:function(){
          return LunarUtil.getXunKong(this.getDayInGanZhiExact());
        },
        getDayXunKongExact2:function(){
          return LunarUtil.getXunKong(this.getDayInGanZhiExact2());
        },
        toString:function(){
          return this.getYearInChinese()+'年'+this.getMonthInChinese()+'月'+this.getDayInChinese();
        },
        toFullString:function(){
          var s = this.toString();
          s += ' '+this.getYearInGanZhi()+'('+this.getYearShengXiao()+')年';
          s += ' '+this.getMonthInGanZhi()+'('+this.getMonthShengXiao()+')月';
          s += ' '+this.getDayInGanZhi()+'('+this.getDayShengXiao()+')日';
          s += ' '+this.getTimeZhi()+'('+this.getTimeShengXiao()+')时';
          s += ' 纳音['+this.getYearNaYin()+' '+this.getMonthNaYin()+' '+this.getDayNaYin()+' '+this.getTimeNaYin()+']';
          s += ' 星期'+this.getWeekInChinese();
          var festivals = this.getFestivals();
          var i;
          var j;
          for(i=0,j=festivals.length;i<j;i++){
            s += ' ('+festivals[i]+')';
          }
          festivals = this.getOtherFestivals();
          for(i=0,j=festivals.length;i<j;i++){
            s += ' ('+festivals[i]+')';
          }
          var jq = this.getJieQi();
          if(jq.length>0){
            s += ' ['+jq+']';
          }
          s += ' '+this.getGong()+'方'+this.getShou();
          s += ' 星宿['+this.getXiu()+this.getZheng()+this.getAnimal()+']('+this.getXiuLuck()+')';
          s += ' 彭祖百忌['+this.getPengZuGan()+' '+this.getPengZuZhi()+']';
          s += ' 喜神方位['+this.getDayPositionXi()+']('+this.getDayPositionXiDesc()+')';
          s += ' 阳贵神方位['+this.getDayPositionYangGui()+']('+this.getDayPositionYangGuiDesc()+')';
          s += ' 阴贵神方位['+this.getDayPositionYinGui()+']('+this.getDayPositionYinGuiDesc()+')';
          s += ' 福神方位['+this.getDayPositionFu()+']('+this.getDayPositionFuDesc()+')';
          s += ' 财神方位['+this.getDayPositionCai()+']('+this.getDayPositionCaiDesc()+')';
          s += ' 冲['+this.getDayChongDesc()+']';
          s += ' 煞['+this.getDaySha()+']';
          return s;
        },
        _buildNameAndIndex: function(name, index){
          return {
            _p:{
              name: name,
              index: index
            },
            getName: function(){return this._p.name;},
            setName: function(name){this._p.name = name;},
            getIndex: function(){return this._p.index;},
            setIndex: function(index){this._p.index = index;},
            toString: function(){return this.getName();},
            toFullString: function(){return this.getName()+'第'+this.getIndex()+'天';}
          };
        },
        getShuJiu:function(){
          var currentDay = Solar.fromYmd(this._p.solar.getYear(), this._p.solar.getMonth(), this._p.solar.getDay());
          var start = this._getJieQiSolar('DONG_ZHI');
          var startDay = Solar.fromYmd(start.getYear(), start.getMonth(), start.getDay());
          if (currentDay.isBefore(startDay)) {
            start = this._getJieQiSolar(I18n.getMessage('jq.dongZhi'));
            startDay = Solar.fromYmd(start.getYear(), start.getMonth(), start.getDay());
          }
          var endDay = Solar.fromYmd(start.getYear(), start.getMonth(), start.getDay()).next(81);
          if (currentDay.isBefore(startDay) || (!currentDay.isBefore(endDay))) {
            return null;
          }
          var days = currentDay.subtract(startDay);
          return this._buildNameAndIndex(LunarUtil.NUMBER[Math.floor(days / 9) + 1] + '九', days % 9 + 1);
        },
        getFu:function(){
          var currentDay = Solar.fromYmd(this._p.solar.getYear(), this._p.solar.getMonth(), this._p.solar.getDay());
          var xiaZhi = this._getJieQiSolar(I18n.getMessage('jq.xiaZhi'));
          var liQiu = this._getJieQiSolar(I18n.getMessage('jq.liQiu'));
          var startDay = Solar.fromYmd(xiaZhi.getYear(), xiaZhi.getMonth(), xiaZhi.getDay());

          // 第1个庚日
          var add = 6 - xiaZhi.getLunar().getDayGanIndex();
          if (add < 0) {
            add += 10;
          }
          // 第3个庚日，即初伏第1天
          add += 20;
          startDay = startDay.next(add);

          // 初伏以前
          if (currentDay.isBefore(startDay)) {
            return null;
          }

          var days = currentDay.subtract(startDay);
          if (days < 10) {
            return this._buildNameAndIndex('初伏', days + 1);
          }

          // 第4个庚日，中伏第1天
          startDay = startDay.next(10);

          days = currentDay.subtract(startDay);
          if (days < 10) {
            return this._buildNameAndIndex('中伏', days + 1);
          }

          // 第5个庚日，中伏第11天或末伏第1天
          startDay = startDay.next(10);

          var liQiuDay = Solar.fromYmd(liQiu.getYear(),liQiu.getMonth(),liQiu.getDay());

          days = currentDay.subtract(startDay);
          // 末伏
          if (liQiuDay.isAfter(startDay)) {
            // 中伏
            if (days < 10) {
              return this._buildNameAndIndex('中伏', days + 11);
            }
            // 末伏第1天
            startDay = startDay.next(10);
            days = currentDay.subtract(startDay);
          }
          if (days < 10) {
            return this._buildNameAndIndex('末伏', days + 1);
          }
          return null;
        },
        getLiuYao:function(){
          return LunarUtil.LIU_YAO[(Math.abs(this._p.month)+this._p.day-2)%6];
        },
        getWuHou:function(){
          var jieQi = this.getPrevJieQi(true);
          var jq = LunarUtil.find(jieQi.getName(), LunarUtil.JIE_QI);
          var current = Solar.fromYmd(this._p.solar.getYear(),this._p.solar.getMonth(),this._p.solar.getDay());
          var startSolar = jieQi.getSolar();
          var start = Solar.fromYmd(startSolar.getYear(),startSolar.getMonth(),startSolar.getDay());
          var index = Math.floor(current.subtract(start) / 5);
          if (index > 2) {
            index = 2;
          }
          return LunarUtil.WU_HOU[(jq.index * 3 + index) % LunarUtil.WU_HOU.length];
        },
        getHou:function(){
          var jieQi = this.getPrevJieQi(true);
          var days = this._p.solar.subtract(jieQi.getSolar());
          var max = LunarUtil.HOU.length - 1;
          var offset = Math.floor(days / 5);
          if (offset > max) {
            offset = max;
          }
          return jieQi.getName() + ' ' + LunarUtil.HOU[offset];
        },
        getDayLu:function(){
          var gan = LunarUtil.LU[this.getDayGan()];
          var zhi = LunarUtil.LU[this.getDayZhi()];
          var lu = gan + '命互禄';
          if (zhi) {
            lu += ' ' + zhi + '命进禄';
          }
          return lu;
        },
        getTime:function(){
          return LunarTime.fromYmdHms(this._p.year, this._p.month, this._p.day, this._p.hour, this._p.minute, this._p.second);
        },
        getTimes:function(){
          var l = [];
          l.push(LunarTime.fromYmdHms(this._p.year, this._p.month, this._p.day, 0, 0, 0));
          for(var i = 0; i < 12; i++){
            l.push(LunarTime.fromYmdHms(this._p.year, this._p.month, this._p.day, (i+1)*2-1, 0, 0));
          }
          return l;
        },
        getFoto:function(){return Foto.fromLunar(this);},
        getTao:function(){return Tao.fromLunar(this);}
      };
    };
    return {
      fromYmdHms:function(y,m,d,hour,minute,second){return _fromYmdHms(y,m,d,hour,minute,second);},
      fromYmd:function(y,m,d){return _fromYmdHms(y,m,d,0,0,0);},
      fromSolar:function(solar){return _fromSolar(solar);},
      fromDate:function(date){return _fromDate(date);}
    };
  })();