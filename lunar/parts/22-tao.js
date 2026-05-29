// part: 22-tao
// classes: Tao
// auto-extracted from lunar-javascript.js
  var Tao = (function(){
    var _fromYmdHms=function(y,m,d,hour,minute,second){
      return _fromLunar(Lunar.fromYmdHms(y+Tao.BIRTH_YEAR,m,d,hour,minute,second));
    };
    var _fromLunar=function(lunar){
      return {
        _p: {
          lunar: lunar
        },
        getLunar:function(){return this._p.lunar;},
        getYear:function(){
          return this._p.lunar.getYear()-Tao.BIRTH_YEAR;
        },
        getMonth:function(){return this._p.lunar.getMonth();},
        getDay:function(){return this._p.lunar.getDay();},
        getYearInChinese:function(){
          var y = this.getYear()+'';
          var s = '';
          var zero = '0'.charCodeAt(0);
          for(var i=0,j=y.length;i<j;i++){
            s+=LunarUtil.NUMBER[y.charCodeAt(i)-zero];
          }
          return s;
        },
        getMonthInChinese:function(){return this._p.lunar.getMonthInChinese();},
        getDayInChinese:function(){return this._p.lunar.getDayInChinese();},
        getFestivals:function(){
          var l=[];
          var fs=TaoUtil.FESTIVAL[this.getMonth()+'-'+this.getDay()];
          if(fs){
            l=l.concat(fs);
          }
          var jq = this._p.lunar.getJieQi();
          if(I18n.getMessage('jq.dongZhi')===jq){
            l.push(TaoFestival.create('元始天尊圣诞'));
          }else if(I18n.getMessage('jq.xiaZhi')===jq){
            l.push(TaoFestival.create('灵宝天尊圣诞'));
          }
          var f = TaoUtil.BA_JIE[jq];
          if(f){
            l.push(TaoFestival.create(f));
          }
          f = TaoUtil.BA_HUI[this._p.lunar.getDayInGanZhi()];
          if(f){
            l.push(TaoFestival.create(f));
          }
          return l;
        },
        _isDayIn:function(days){
          var md = this.getMonth() + '-' + this.getDay();
          for(var i=0,j=days.length;i<j;i++){
            if(md===days[i]){
              return true;
            }
          }
          return false;
        },
        isDaySanHui:function(){return this._isDayIn(TaoUtil.SAN_HUI);},
        isDaySanYuan:function(){return this._isDayIn(TaoUtil.SAN_YUAN);},
        isDayBaJie:function(){return !!TaoUtil.BA_JIE[this._p.lunar.getJieQi()];},
        isDayWuLa:function(){return this._isDayIn(TaoUtil.WU_LA);},
        isDayBaHui:function(){return !!TaoUtil.BA_HUI[this._p.lunar.getDayInGanZhi()];},
        isDayMingWu:function(){return I18n.getMessage('tg.wu')===this._p.lunar.getDayGan();},
        isDayAnWu:function(){return this._p.lunar.getDayZhi()===TaoUtil.AN_WU[Math.abs(this.getMonth())-1]},
        isDayWu:function(){return this.isDayMingWu()||this.isDayAnWu()},
        isDayTianShe:function(){
          var ret = false;
          var mz = this._p.lunar.getMonthZhi();
          var dgz = this._p.lunar.getDayInGanZhi();
          if ([I18n.getMessage('dz.yin'), I18n.getMessage('dz.mao'), I18n.getMessage('dz.chen')].join(',').indexOf(mz) > -1) {
            if (I18n.getMessage('jz.wuYin') === dgz) {
              ret = true;
            }
          } else if ([I18n.getMessage('dz.si'), I18n.getMessage('dz.wu'), I18n.getMessage('dz.wei')].join(',').indexOf(mz) > -1) {
            if (I18n.getMessage('jz.jiaWu') === dgz) {
              ret = true;
            }
          } else if ([I18n.getMessage('dz.shen'), I18n.getMessage('dz.you'), I18n.getMessage('dz.xu')].join(',').indexOf(mz) > -1) {
            if (I18n.getMessage('jz.wuShen') === dgz) {
              ret = true;
            }
          } else if ([I18n.getMessage('dz.hai'), I18n.getMessage('dz.zi'), I18n.getMessage('dz.chou')].join(',').indexOf(mz) > -1) {
            if (I18n.getMessage('jz.jiaZi') === dgz) {
              ret = true;
            }
          }
          return ret;
        },
        toString:function(){
          return this.getYearInChinese()+'年'+this.getMonthInChinese()+'月'+this.getDayInChinese();
        },
        toFullString:function(){
          return '道歷'+this.getYearInChinese()+'年，天運'+this._p.lunar.getYearInGanZhi()+'年，'+this._p.lunar.getMonthInGanZhi()+'月，'+this._p.lunar.getDayInGanZhi()+'日。'+this.getMonthInChinese()+'月'+this.getDayInChinese()+'日，'+this._p.lunar.getTimeZhi()+'時。';
        }
      };
    };
    return {
      BIRTH_YEAR:-2697,
      fromYmdHms:function(y,m,d,hour,minute,second){return _fromYmdHms(y,m,d,hour,minute,second);},
      fromYmd:function(y,m,d){return _fromYmdHms(y,m,d,0,0,0);},
      fromLunar:function(lunar){return _fromLunar(lunar);}
    };
  })();