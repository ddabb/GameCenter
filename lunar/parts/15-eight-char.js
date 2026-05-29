// part: 15-eight-char
// classes: EightChar
// auto-extracted from lunar-javascript.js
  var EightChar = (function(){
    var _fromLunar=function(lunar){
      return {
        _p:{sect:2,lunar:lunar},
        setSect:function(sect){
          sect *= 1;
          this._p.sect=(1===sect)?1:2;
        },
        getSect:function(){return this._p.sect;},
        getDayGanIndex:function(){return 2===this._p.sect?this._p.lunar.getDayGanIndexExact2():this._p.lunar.getDayGanIndexExact();},
        getDayZhiIndex:function(){return 2===this._p.sect?this._p.lunar.getDayZhiIndexExact2():this._p.lunar.getDayZhiIndexExact();},
        getYear:function(){return this._p.lunar.getYearInGanZhiExact();},
        getYearGan:function(){return this._p.lunar.getYearGanExact();},
        getYearZhi:function(){return this._p.lunar.getYearZhiExact();},
        getYearHideGan:function(){return LunarUtil.ZHI_HIDE_GAN[this.getYearZhi()];},
        getYearWuXing:function(){return LunarUtil.WU_XING_GAN[this.getYearGan()]+LunarUtil.WU_XING_ZHI[this.getYearZhi()];},
        getYearNaYin:function(){return LunarUtil.NAYIN[this.getYear()];},
        getYearShiShenGan:function(){return LunarUtil.SHI_SHEN[this.getDayGan()+this.getYearGan()];},
        getYearShiShenZhi:function(){
          var dayGan = this.getDayGan();
          var hideGan = LunarUtil.ZHI_HIDE_GAN[this.getYearZhi()];
          var l = [];
          for(var i=0,j=hideGan.length;i<j;i++){
            l.push(LunarUtil.SHI_SHEN[dayGan+hideGan[i]]);
          }
          return l;
        },
        _getDiShi:function(zhiIndex){
          var offset = LunarUtil.CHANG_SHENG_OFFSET[this.getDayGan()];
          var index = offset + (this.getDayGanIndex()%2===0?zhiIndex:-zhiIndex);
          if(index>=12){
            index -= 12;
          }
          if(index<0){
            index += 12;
          }
          return LunarUtil.CHANG_SHENG[index];
        },
        getYearDiShi:function(){return this._getDiShi(this._p.lunar.getYearZhiIndexExact());},
        getYearXun:function(){return this._p.lunar.getYearXunExact()},
        getYearXunKong:function(){return this._p.lunar.getYearXunKongExact()},
        getMonth:function(){return this._p.lunar.getMonthInGanZhiExact();},
        getMonthGan:function(){return this._p.lunar.getMonthGanExact();},
        getMonthZhi:function(){return this._p.lunar.getMonthZhiExact();},
        getMonthHideGan:function(){return LunarUtil.ZHI_HIDE_GAN[this.getMonthZhi()];},
        getMonthWuXing:function(){return LunarUtil.WU_XING_GAN[this.getMonthGan()]+LunarUtil.WU_XING_ZHI[this.getMonthZhi()];},
        getMonthNaYin:function(){return LunarUtil.NAYIN[this.getMonth()];},
        getMonthShiShenGan:function(){return LunarUtil.SHI_SHEN[this.getDayGan()+this.getMonthGan()];},
        getMonthShiShenZhi:function(){
          var dayGan = this.getDayGan();
          var hideGan = LunarUtil.ZHI_HIDE_GAN[this.getMonthZhi()];
          var l = [];
          for(var i=0,j=hideGan.length;i<j;i++){
            l.push(LunarUtil.SHI_SHEN[dayGan+hideGan[i]]);
          }
          return l;
        },
        getMonthDiShi:function(){return this._getDiShi(this._p.lunar.getMonthZhiIndexExact());},
        getMonthXun:function(){return this._p.lunar.getMonthXunExact()},
        getMonthXunKong:function(){return this._p.lunar.getMonthXunKongExact()},
        getDay:function(){return 2===this._p.sect?this._p.lunar.getDayInGanZhiExact2():this._p.lunar.getDayInGanZhiExact();},
        getDayGan:function(){return 2===this._p.sect?this._p.lunar.getDayGanExact2():this._p.lunar.getDayGanExact();},
        getDayZhi:function(){return 2===this._p.sect?this._p.lunar.getDayZhiExact2():this._p.lunar.getDayZhiExact();},
        getDayHideGan:function(){return LunarUtil.ZHI_HIDE_GAN[this.getDayZhi()];},
        getDayWuXing:function(){return LunarUtil.WU_XING_GAN[this.getDayGan()]+LunarUtil.WU_XING_ZHI[this.getDayZhi()];},
        getDayNaYin:function(){return LunarUtil.NAYIN[this.getDay()];},
        getDayShiShenGan:function(){return '日主';},
        getDayShiShenZhi:function(){
          var dayGan = this.getDayGan();
          var hideGan = LunarUtil.ZHI_HIDE_GAN[this.getDayZhi()];
          var l = [];
          for(var i=0,j=hideGan.length;i<j;i++){
            l.push(LunarUtil.SHI_SHEN[dayGan+hideGan[i]]);
          }
          return l;
        },
        getDayDiShi:function(){return this._getDiShi(this.getDayZhiIndex());},
        getDayXun:function(){return 2===this._p.sect?this._p.lunar.getDayXunExact2():this._p.lunar.getDayXunExact()},
        getDayXunKong:function(){return 2===this._p.sect?this._p.lunar.getDayXunKongExact2():this._p.lunar.getDayXunKongExact()},
        getTime:function(){return this._p.lunar.getTimeInGanZhi();},
        getTimeGan:function(){return this._p.lunar.getTimeGan();},
        getTimeZhi:function(){return this._p.lunar.getTimeZhi();},
        getTimeHideGan:function(){return LunarUtil.ZHI_HIDE_GAN[this.getTimeZhi()];},
        getTimeWuXing:function(){return LunarUtil.WU_XING_GAN[this.getTimeGan()]+LunarUtil.WU_XING_ZHI[this.getTimeZhi()];},
        getTimeNaYin:function(){return LunarUtil.NAYIN[this.getTime()];},
        getTimeShiShenGan:function(){return LunarUtil.SHI_SHEN[this.getDayGan()+this.getTimeGan()];},
        getTimeShiShenZhi:function(){
          var dayGan = this.getDayGan();
          var hideGan = LunarUtil.ZHI_HIDE_GAN[this.getTimeZhi()];
          var l = [];
          for(var i=0,j=hideGan.length;i<j;i++){
            l.push(LunarUtil.SHI_SHEN[dayGan+hideGan[i]]);
          }
          return l;
        },
        getTimeDiShi:function(){return this._getDiShi(this._p.lunar.getTimeZhiIndex());},
        getTimeXun:function(){return this._p.lunar.getTimeXun();},
        getTimeXunKong:function(){return this._p.lunar.getTimeXunKong();},
        getTaiYuan:function(){
          var ganIndex = this._p.lunar.getMonthGanIndexExact() + 1;
          if(ganIndex>=10){
            ganIndex -= 10;
          }
          var zhiIndex = this._p.lunar.getMonthZhiIndexExact() + 3;
          if(zhiIndex>=12){
            zhiIndex -= 12;
          }
          return LunarUtil.GAN[ganIndex+1]+LunarUtil.ZHI[zhiIndex+1];
        },
        getTaiYuanNaYin:function(){return LunarUtil.NAYIN[this.getTaiYuan()];},
        getTaiXi:function(){
          var lunar = this._p.lunar;
          var ganIndex = (2 === this._p.sect) ? lunar.getDayGanIndexExact2() : lunar.getDayGanIndexExact();
          var zhiIndex = (2 === this._p.sect) ? lunar.getDayZhiIndexExact2() : lunar.getDayZhiIndexExact();
          return LunarUtil.HE_GAN_5[ganIndex]+LunarUtil.HE_ZHI_6[zhiIndex];
        },
        getTaiXiNaYin:function(){return LunarUtil.NAYIN[this.getTaiXi()];},
        getMingGong:function(){
          var monthZhiIndex = LunarUtil.index(this.getMonthZhi(), LunarUtil.MONTH_ZHI, 0);
          var timeZhiIndex = LunarUtil.index(this.getTimeZhi(), LunarUtil.MONTH_ZHI, 0);
          var offset = monthZhiIndex + timeZhiIndex;
          offset = (offset >= 14 ? 26 : 14) - offset;
          var ganIndex = (this._p.lunar.getYearGanIndexExact() + 1) * 2 + offset;
          while (ganIndex > 10) {
            ganIndex -= 10;
          }
          return LunarUtil.GAN[ganIndex] + LunarUtil.MONTH_ZHI[offset];
        },
        getMingGongNaYin:function(){return LunarUtil.NAYIN[this.getMingGong()];},
        getShenGong:function(){
          var monthZhiIndex = LunarUtil.index(this.getMonthZhi(), LunarUtil.MONTH_ZHI, 0);
          var timeZhiIndex = LunarUtil.index(this.getTimeZhi(), LunarUtil.ZHI, 0);
          var offset = monthZhiIndex + timeZhiIndex;
          if (offset > 12) {
            offset -= 12;
          }
          var ganIndex = (this._p.lunar.getYearGanIndexExact() + 1) * 2 + offset;
          while (ganIndex > 10) {
            ganIndex -= 10;
          }
          return LunarUtil.GAN[ganIndex] + LunarUtil.MONTH_ZHI[offset];
        },
        getShenGongNaYin:function(){return LunarUtil.NAYIN[this.getShenGong()];},
        getLunar:function(){return this._p.lunar;},
        getYun:function(gender, sect){
          sect *= 1;
          sect = (2 === sect) ? sect : 1;
          var lunar = this.getLunar();
          var yang = 0 === lunar.getYearGanIndexExact() % 2;
          var man = 1 === gender;
          var forward = (yang && man) || (!yang && !man);
          var start = (function(){
            var prev = lunar.getPrevJie();
            var next = lunar.getNextJie();
            var current = lunar.getSolar();
            var start = forward ? current : prev.getSolar();
            var end = forward ? next.getSolar() : current;

            var year;
            var month;
            var day;
            var hour = 0;

            if (2 === sect) {
              var minutes = end.subtractMinute(start);
              year = Math.floor(minutes / 4320);
              minutes -= year * 4320;
              month = Math.floor(minutes / 360);
              minutes -= month * 360;
              day = Math.floor(minutes / 12);
              minutes -= day * 12;
              hour = minutes * 2;
            } else {
              var endTimeZhiIndex = (end.getHour() === 23) ? 11 : LunarUtil.getTimeZhiIndex(end.toYmdHms().substring(11, 16));
              var startTimeZhiIndex = (start.getHour() === 23) ? 11 : LunarUtil.getTimeZhiIndex(start.toYmdHms().substring(11, 16));
              // 时辰差
              var hourDiff = endTimeZhiIndex - startTimeZhiIndex;
              // 天数差
              var dayDiff = end.subtract(start);
              if (hourDiff < 0) {
                hourDiff += 12;
                dayDiff--;
              }
              var monthDiff = Math.floor(hourDiff * 10 / 30);
              month = dayDiff * 4 + monthDiff;
              day = hourDiff * 10 - monthDiff * 30;
              year = Math.floor(month / 12);
              month = month - year * 12;
            }

            return {
              year: year,
              month: month,
              day: day,
              hour: hour
            };
          })();
          var buildLiuYue = function(liuNian, index){
            return {
              _p: {
                index: index,
                liuNian: liuNian
              },
              getIndex:function(){return this._p.index;},
              getMonthInChinese:function(){return LunarUtil.MONTH[this._p.index + 1];},
              getGanZhi:function(){
                var yearGanIndex = LunarUtil.find(this._p.liuNian.getGanZhi(), LunarUtil.GAN).index - 1;
                var offset = [2, 4, 6, 8, 0][yearGanIndex % 5];
                var gan = LunarUtil.GAN[(this._p.index + offset) % 10 + 1];
                var zhi = LunarUtil.ZHI[(this._p.index + LunarUtil.BASE_MONTH_ZHI_INDEX) % 12 + 1];
                return gan + zhi;
              },
              getXun:function(){return LunarUtil.getXun(this.getGanZhi());},
              getXunKong:function(){return LunarUtil.getXunKong(this.getGanZhi());}
            };
          };
          var buildLiuNian = function(daYun, index){
            return {
              _p: {
                year: daYun.getStartYear() + index,
                age: daYun.getStartAge() + index,
                index: index,
                daYun: daYun,
                lunar: daYun.getLunar()
              },
              getYear: function(){return this._p.year;},
              getAge: function(){return this._p.age;},
              getIndex: function(){return this._p.index;},
              getLunar: function(){return this._p.lunar;},
              getGanZhi: function(){
                var offset = LunarUtil.getJiaZiIndex(this._p.lunar.getJieQiTable()[I18n.getMessage('jq.liChun')].getLunar().getYearInGanZhiExact()) + this._p.index;
                if (this._p.daYun.getIndex() > 0) {
                  offset += this._p.daYun.getStartAge() - 1;
                }
                offset %= LunarUtil.JIA_ZI.length;
                return LunarUtil.JIA_ZI[offset];
              },
              getXun:function(){return LunarUtil.getXun(this.getGanZhi());},
              getXunKong:function(){return LunarUtil.getXunKong(this.getGanZhi());},
              getLiuYue: function(){
                var l = [];
                for (var i = 0; i < 12; i++) {
                  l.push(buildLiuYue(this,i));
                }
                return l;
              }
            };
          };
          var buildXiaoYun = function(daYun, index, forward){
            return {
              _p: {
                year: daYun.getStartYear() + index,
                age: daYun.getStartAge() + index,
                index: index,
                daYun: daYun,
                forward: forward,
                lunar: daYun.getLunar()
              },
              getYear: function(){return this._p.year;},
              getAge: function(){return this._p.age;},
              getIndex: function(){return this._p.index;},
              getGanZhi: function(){
                var offset = LunarUtil.getJiaZiIndex(this._p.lunar.getTimeInGanZhi());
                var add = this._p.index + 1;
                if (this._p.daYun.getIndex() > 0) {
                  add += this._p.daYun.getStartAge() - 1;
                }
                offset += this._p.forward ? add : -add;
                var size = LunarUtil.JIA_ZI.length;
                while (offset < 0) {
                  offset += size;
                }
                offset %= size;
                return LunarUtil.JIA_ZI[offset];
              },
              getXun:function(){return LunarUtil.getXun(this.getGanZhi());},
              getXunKong:function(){return LunarUtil.getXunKong(this.getGanZhi());}
            };
          };
          var buildDaYun = function(yun, index){
            var birthYear = yun.getLunar().getSolar().getYear();
            var year = yun.getStartSolar().getYear();
            var startYear;
            var startAge;
            var endYear;
            var endAge;
            if (index < 1) {
              startYear = birthYear;
              startAge = 1;
              endYear = year - 1;
              endAge = year - birthYear;
            } else {
              var add = (index - 1) * 10;
              startYear = year + add;
              startAge = startYear - birthYear + 1;
              endYear = startYear + 9;
              endAge = startAge + 9;
            }
            return {
              _p: {
                startYear: startYear,
                endYear: endYear,
                startAge: startAge,
                endAge: endAge,
                index: index,
                yun: yun,
                lunar: yun.getLunar()
              },
              getStartYear: function(){return this._p.startYear;},
              getEndYear: function(){return this._p.endYear;},
              getStartAge: function(){return this._p.startAge;},
              getEndAge: function(){return this._p.endAge;},
              getIndex: function(){return this._p.index;},
              getLunar: function(){return this._p.lunar;},
              getGanZhi: function(){
                if (this._p.index < 1) {
                  return '';
                }
                var offset = LunarUtil.getJiaZiIndex(this._p.lunar.getMonthInGanZhiExact());
                offset += this._p.yun.isForward() ? this._p.index : -this._p.index;
                var size = LunarUtil.JIA_ZI.length;
                if (offset >= size) {
                  offset -= size;
                }
                if (offset < 0) {
                  offset += size;
                }
                return LunarUtil.JIA_ZI[offset];
              },
              getXun:function(){return LunarUtil.getXun(this.getGanZhi());},
              getXunKong:function(){return LunarUtil.getXunKong(this.getGanZhi());},
              getLiuNian: function(n){
                if (!n) {
                  n = 10;
                }
                if (this._p.index < 1) {
                  n = this._p.endYear-this._p.startYear+1;
                }
                var l = [];
                for (var i = 0; i < n; i++) {
                  l.push(buildLiuNian(this,i));
                }
                return l;
              },
              getXiaoYun: function(n){
                if (!n) {
                  n = 10;
                }
                if (this._p.index < 1) {
                  n = this._p.endYear-this._p.startYear+1;
                }
                var l = [];
                for (var i = 0; i < n; i++) {
                  l.push(buildXiaoYun(this,i,this._p.yun.isForward()));
                }
                return l;
              }
            };
          };
          return {
            _p: {
              gender: gender,
              startYear: start.year,
              startMonth: start.month,
              startDay: start.day,
              startHour: start.hour,
              forward: forward,
              lunar: lunar
            },
            getGender: function(){return this._p.gender;},
            getStartYear: function(){return this._p.startYear;},
            getStartMonth: function(){return this._p.startMonth;},
            getStartDay: function(){return this._p.startDay;},
            getStartHour: function(){return this._p.startHour;},
            isForward: function(){return this._p.forward;},
            getLunar: function(){return this._p.lunar;},
            getStartSolar: function(){
              var solar = this._p.lunar.getSolar();
              solar = solar.nextYear(this._p.startYear);
              solar = solar.nextMonth(this._p.startMonth);
              solar = solar.next(this._p.startDay);
              return solar.nextHour(this._p.startHour);
            },
            getDaYun: function(n){
              if (!n) {
                n = 10;
              }
              var l = [];
              for (var i = 0; i < n; i++) {
                l.push(buildDaYun(this,i));
              }
              return l;
            }
          };
        },
        toString:function(){return this.getYear()+' '+this.getMonth()+' '+this.getDay()+' '+this.getTime();}
      };
    };
    return {
      fromLunar:function(lunar){return _fromLunar(lunar);}
    };
  })();