// part: 16-lunar-time
// classes: LunarTime
// auto-extracted from lunar-javascript.js
  var LunarTime = (function(){
    var _fromYmdHms=function(lunarYear,lunarMonth,lunarDay,hour,minute,second){
      var lunar=Lunar.fromYmdHms(lunarYear,lunarMonth,lunarDay,hour,minute,second);
      var zhiIndex=LunarUtil.getTimeZhiIndex([(hour<10?'0':'')+hour,(minute<10?'0':'')+minute].join(':'));
      var ganIndex = (lunar.getDayGanIndexExact() % 5 * 2 + zhiIndex) % 10;
      return {
        _p:{
          ganIndex:ganIndex,
          zhiIndex:zhiIndex,
          lunar:lunar
        },
        getGanIndex:function(){return this._p.ganIndex;},
        getZhiIndex:function(){return this._p.zhiIndex;},
        getGan:function(){return LunarUtil.GAN[this._p.ganIndex+1];},
        getZhi:function(){return LunarUtil.ZHI[this._p.zhiIndex+1];},
        getGanZhi:function(){return this.getGan()+this.getZhi();},
        getShengXiao:function(){return LunarUtil.SHENGXIAO[this._p.zhiIndex+1];},
        getPositionXi:function(){return LunarUtil.POSITION_XI[this._p.ganIndex + 1];},
        getPositionXiDesc:function(){return LunarUtil.POSITION_DESC[this.getPositionXi()];},
        getPositionYangGui:function(){return LunarUtil.POSITION_YANG_GUI[this._p.ganIndex + 1];},
        getPositionYangGuiDesc:function(){return LunarUtil.POSITION_DESC[this.getPositionYangGui()];},
        getPositionYinGui:function(){return LunarUtil.POSITION_YIN_GUI[this._p.ganIndex + 1];},
        getPositionYinGuiDesc:function(){return LunarUtil.POSITION_DESC[this.getPositionYinGui()];},
        getPositionFu:function(sect){return (1===sect?LunarUtil.POSITION_FU:LunarUtil.POSITION_FU_2)[this._p.ganIndex + 1];},
        getPositionFuDesc:function(sect){return LunarUtil.POSITION_DESC[this.getPositionFu(sect)];},
        getPositionCai:function(){return LunarUtil.POSITION_CAI[this._p.ganIndex + 1];},
        getPositionCaiDesc:function(){return LunarUtil.POSITION_DESC[this.getPositionCai()];},
        getNaYin:function(){return LunarUtil.NAYIN[this.getGanZhi()];},
        getTianShen:function(){
          return LunarUtil.TIAN_SHEN[(this._p.zhiIndex + LunarUtil.ZHI_TIAN_SHEN_OFFSET[this._p.lunar.getDayZhiExact()]) % 12 + 1];
        },
        getTianShenType:function(){return LunarUtil.TIAN_SHEN_TYPE[this.getTianShen()];},
        getTianShenLuck:function(){return LunarUtil.TIAN_SHEN_TYPE_LUCK[this.getTianShenType()];},
        getChong:function(){return LunarUtil.CHONG[this._p.zhiIndex];},
        getSha:function(){return LunarUtil.SHA[this.getZhi()];},
        getChongShengXiao:function(){
          var chong = this.getChong();
          for (var i = 0, j = LunarUtil.ZHI.length; i < j; i++) {
            if (LunarUtil.ZHI[i]===chong) {
              return LunarUtil.SHENGXIAO[i];
            }
          }
          return '';
        },
        getChongDesc:function(){return '(' + this.getChongGan() + this.getChong() + ')' + this.getChongShengXiao();},
        getChongGan:function(){return LunarUtil.CHONG_GAN[this._p.ganIndex];},
        getChongGanTie:function(){return LunarUtil.CHONG_GAN_TIE[this._p.ganIndex];},
        getYi:function(){return LunarUtil.getTimeYi(this._p.lunar.getDayInGanZhiExact(), this.getGanZhi());},
        getJi:function(){return LunarUtil.getTimeJi(this._p.lunar.getDayInGanZhiExact(), this.getGanZhi());},
        getNineStar:function(){
          var solarYmd = this._p.lunar.getSolar().toYmd();
          var jieQi = this._p.lunar.getJieQiTable();
          var asc = false;
          if (solarYmd>=jieQi[I18n.getMessage('jq.dongZhi')].toYmd() && solarYmd<jieQi[I18n.getMessage('jq.xiaZhi')].toYmd()) {
            asc = true;
          }
          var offset = asc ? [0, 3, 6] : [8, 5, 2];
          var start = offset[this._p.lunar.getDayZhiIndex() % 3];
          var index = asc ? (start + this._p.zhiIndex) : (start + 9 - this._p.zhiIndex);
          return NineStar.fromIndex(index % 9);
        },
        getXun:function(){return LunarUtil.getXun(this.getGanZhi());},
        getXunKong:function(){return LunarUtil.getXunKong(this.getGanZhi());},
        getMinHm:function(){
          var hour = this._p.lunar.getHour();
          if(hour <1){
            return '00:00';
          }else if(hour > 22){
            return '23:00';
          }
          if(hour%2===0){
            hour-=1;
          }
          return (hour<10?'0':'')+hour+':00';
        },
        getMaxHm:function(){
          var hour = this._p.lunar.getHour();
          if (hour <1){
            return '00:59';
          } else if (hour > 22) {
            return '23:59';
          }
          if(hour%2!==0){
            hour+=1;
          }
          return (hour<10?'0':'')+hour+':59';
        },
        toString:function(){return this.getGanZhi();}
      };
    };
    return {
      fromYmdHms:function(lunarYear,lunarMonth,lunarDay,hour,minute,second){return _fromYmdHms(lunarYear,lunarMonth,lunarDay,hour,minute,second);}
    };
  })();