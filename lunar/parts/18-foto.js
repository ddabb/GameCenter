// part: 18-foto
// classes: Foto
// auto-extracted from lunar-javascript.js
  var Foto = (function(){
    var _fromYmdHms=function(y,m,d,hour,minute,second){
      return _fromLunar(Lunar.fromYmdHms(y+Foto.DEAD_YEAR-1,m,d,hour,minute,second));
    };
    var _fromLunar=function(lunar){
      return {
        _p: {
          lunar: lunar
        },
        getLunar:function(){return this._p.lunar;},
        getYear:function(){
          var sy = this._p.lunar.getSolar().getYear();
          var y = sy-Foto.DEAD_YEAR;
          if(sy===this._p.lunar.getYear()){
            y++;
          }
          return y;
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
          var l = FotoUtil.FESTIVAL[this.getMonth()+'-'+this.getDay()];
          return l?l:[];
        },
        getOtherFestivals:function(){
          var l=[];
          var fs=FotoUtil.OTHER_FESTIVAL[this.getMonth()+'-'+this.getDay()];
          if(fs){
            l=l.concat(fs);
          }
          return l;
        },
        isMonthZhai:function(){
          var m = this.getMonth();
          return 1===m||5===m||9===m;
        },
        isDayYangGong:function(){
          var l = this.getFestivals();
          for(var i=0,j=l.length;i<j;i++){
            if('杨公忌'===l[i].getName()){
              return true;
            }
          }
          return false;
        },
        isDayZhaiShuoWang:function(){
          var d = this.getDay();
          return 1===d||15===d;
        },
        isDayZhaiSix:function(){
          var d = this.getDay();
          if(8===d||14===d||15===d||23===d||29===d||30===d){
            return true;
          }else if(28===d){
            var m = LunarMonth.fromYm(this._p.lunar.getYear(), this.getMonth());
            if(30!==m.getDayCount()){
              return true;
            }
          }
          return false;
        },
        isDayZhaiTen:function() {
          var d = this.getDay();
          return 1===d||8===d||14===d||15===d||18===d||23===d||24===d||28===d||29===d||30===d;
        },
        isDayZhaiGuanYin:function() {
          var k = this.getMonth()+'-'+this.getDay();
          for(var i=0,j=FotoUtil.DAY_ZHAI_GUAN_YIN.length;i<j;i++){
            if(k===FotoUtil.DAY_ZHAI_GUAN_YIN[i]){
              return true;
            }
          }
          return false;
        },
        getXiu:function(){
          return FotoUtil.getXiu(this.getMonth(), this.getDay());
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
        toString:function(){
          return this.getYearInChinese()+'年'+this.getMonthInChinese()+'月'+this.getDayInChinese();
        },
        toFullString:function(){
          var s = this.toString();
          var fs = this.getFestivals();
          for(var i=0,j=fs.length;i<j;i++){
            s += ' ('+fs[i]+')';
          }
          return s;
        }
      };
    };
    return {
      DEAD_YEAR:-543,
      fromYmdHms:function(y,m,d,hour,minute,second){return _fromYmdHms(y,m,d,hour,minute,second);},
      fromYmd:function(y,m,d){return _fromYmdHms(y,m,d,0,0,0);},
      fromLunar:function(lunar){return _fromLunar(lunar);}
    };
  })();