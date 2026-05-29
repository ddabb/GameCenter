// part: 09-lunar-month
// classes: LunarMonth
// auto-extracted from lunar-javascript.js
  var LunarMonth = (function(){
    var _fromYm = function(lunarYear,lunarMonth){
      var oy = lunarYear;
      var om = lunarMonth;
      lunarYear *= 1;
      if(isNaN(lunarYear)){
        throw new Error('wrong lunar year '+oy);
      }
      lunarMonth *= 1;
      if(isNaN(lunarMonth)){
        throw new Error('wrong lunar month '+om);
      }
      return LunarYear.fromYear(lunarYear).getMonth(lunarMonth);
    };
    var _new = function(lunarYear, lunarMonth, dayCount, firstJulianDay, index){
      return {
        _p: {
          year: lunarYear,
          month: lunarMonth,
          dayCount: dayCount,
          firstJulianDay: firstJulianDay,
          index: index,
          zhiIndex: (Math.abs(lunarMonth) - 1 + LunarUtil.BASE_MONTH_ZHI_INDEX) % 12
        },
        getIndex:function(){return this._p.index;},
        getGanIndex:function(){
          var offset = (LunarYear.fromYear(this._p.year).getGanIndex() + 1) % 5 * 2;
          return (Math.abs(this._p.month) - 1 + offset) % 10;
        },
        getZhiIndex:function(){return this._p.zhiIndex;},
        getGan:function(){return LunarUtil.GAN[this.getGanIndex() + 1];},
        getZhi:function(){return LunarUtil.ZHI[this._p.zhiIndex + 1];},
        getGanZhi:function(){return this.getGan() + this.getZhi();},
        getYear:function(){return this._p.year;},
        getMonth:function(){return this._p.month;},
        getDayCount:function(){return this._p.dayCount;},
        getFirstJulianDay:function(){return this._p.firstJulianDay;},
        isLeap:function(){return this._p.month<0;},
        getPositionXi:function(){
          return LunarUtil.POSITION_XI[this.getGanIndex() + 1];
        },
        getPositionXiDesc:function(){
          return LunarUtil.POSITION_DESC.get(this.getPositionXi());
        },
        getPositionYangGui:function(){
          return LunarUtil.POSITION_YANG_GUI[this.getGanIndex() + 1];
        },
        getPositionYangGuiDesc:function(){
          return LunarUtil.POSITION_DESC.get(this.getPositionYangGui());
        },
        getPositionYinGui:function(){
          return LunarUtil.POSITION_YIN_GUI[this.getGanIndex() + 1];
        },
        getPositionYinGuiDesc:function(){
          return LunarUtil.POSITION_DESC.get(this.getPositionYinGui());
        },
        getPositionFu:function(sect){
          return (1 === sect ? LunarUtil.POSITION_FU : LunarUtil.POSITION_FU_2)[this.getGanIndex() + 1];
        },
        getPositionFuDesc:function(sect){
          return LunarUtil.POSITION_DESC.get(this.getPositionFu(sect));
        },
        getPositionCai:function(){
          return LunarUtil.POSITION_CAI[this.getGanIndex() + 1];
        },
        getPositionCaiDesc:function(){
          return LunarUtil.POSITION_DESC.get(this.getPositionCai());
        },
        getPositionTaiSui:function(){
          var p;
          var m = Math.abs(this._p.month);
          switch(m) {
            case 1:
            case 5:
            case 9:
              p = '艮';
              break;
            case 3:
            case 7:
            case 11:
              p = '坤';
              break;
            case 4:
            case 8:
            case 12:
              p = '巽';
              break;
            default:
              p = LunarUtil.POSITION_GAN[Solar.fromJulianDay(this.getFirstJulianDay()).getLunar().getMonthGanIndex()];
          }
          return p;
        },
        getPositionTaiSuiDesc:function(){
          return LunarUtil.POSITION_DESC[this.getPositionTaiSui()];
        },
        getNineStar:function(){
          var index = LunarYear.fromYear(this._p.year).getZhiIndex() % 3;
          var m = this._p.month;
          if (m < 0) {
            m = -m;
          }
          var monthZhiIndex = (13 + m) % 12;
          var n = 27 - (index * 3);
          if (monthZhiIndex < LunarUtil.BASE_MONTH_ZHI_INDEX) {
            n -= 3;
          }
          var offset = (n - monthZhiIndex) % 9;
          return NineStar.fromIndex(offset);
        },
        next:function(n){
          var on = n;
          n *= 1;
          if(isNaN(n)){
            throw new Error('wrong days ' + on);
          }
          if (0 === n) {
            return LunarMonth.fromYm(this._p.year, this._p.month);
          } else {
            var rest = Math.abs(n);
            var ny = this._p.year;
            var iy = ny;
            var im = this._p.month;
            var index = 0;
            var months = LunarYear.fromYear(ny).getMonths();
            var i;
            var m;
            var size;
            if (n > 0) {
              while (true) {
                size = months.length;
                for (i = 0; i < size; i++) {
                  m = months[i];
                  if (m.getYear() === iy && m.getMonth() === im) {
                    index = i;
                    break;
                  }
                }
                var more = size - index - 1;
                if (rest < more) {
                  break;
                }
                rest -= more;
                var lastMonth = months[size - 1];
                iy = lastMonth.getYear();
                im = lastMonth.getMonth();
                ny++;
                months = LunarYear.fromYear(ny).getMonths();
              }
              return months[index + rest];
            } else {
              while (true) {
                size = months.length;
                for (i = 0; i < size; i++) {
                  m = months[i];
                  if (m.getYear() === iy && m.getMonth() === im) {
                    index = i;
                    break;
                  }
                }
                if (rest <= index) {
                  break;
                }
                rest -= index;
                var firstMonth = months[0];
                iy = firstMonth.getYear();
                im = firstMonth.getMonth();
                ny--;
                months = LunarYear.fromYear(ny).getMonths();
              }
              return months[index - rest];
            }
          }
        },
        toString:function(){return this.getYear()+'年'+(this.isLeap()?'闰':'')+LunarUtil.MONTH[Math.abs(this.getMonth())]+'月('+this.getDayCount()+')天';}
      };
    };
    return {
      fromYm:function(lunarYear,lunarMonth){return _fromYm(lunarYear,lunarMonth);},
      _:function(lunarYear, lunarMonth, dayCount, firstJulianDay, index){return _new(lunarYear, lunarMonth, dayCount, firstJulianDay, index);}
    };
  })();