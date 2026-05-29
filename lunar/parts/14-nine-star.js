// part: 14-nine-star
// classes: NineStar
// auto-extracted from lunar-javascript.js
  var NineStar = (function(){
    var _fromIndex=function(index){
      return {
        _p:{index:index},
        getNumber:function(){return NineStarUtil.NUMBER[this._p.index];},
        getColor:function(){return NineStarUtil.COLOR[this._p.index];},
        getWuXing:function(){return NineStarUtil.WU_XING[this._p.index];},
        getPosition:function(){return NineStarUtil.POSITION[this._p.index];},
        getPositionDesc:function(){return LunarUtil.POSITION_DESC[this.getPosition()];},
        getNameInXuanKong:function(){return NineStar.NAME_XUAN_KONG[this._p.index];},
        getNameInBeiDou:function(){return NineStar.NAME_BEI_DOU[this._p.index];},
        getNameInQiMen:function(){return NineStar.NAME_QI_MEN[this._p.index];},
        getNameInTaiYi:function(){return NineStar.NAME_TAI_YI[this._p.index];},
        getLuckInQiMen:function(){return NineStar.LUCK_QI_MEN[this._p.index];},
        getLuckInXuanKong:function(){return NineStarUtil.LUCK_XUAN_KONG[this._p.index];},
        getYinYangInQiMen:function(){return NineStarUtil.YIN_YANG_QI_MEN[this._p.index];},
        getTypeInTaiYi:function(){return NineStar.TYPE_TAI_YI[this._p.index];},
        getBaMenInQiMen:function(){return NineStar.BA_MEN_QI_MEN[this._p.index];},
        getSongInTaiYi:function(){return NineStar.SONG_TAI_YI[this._p.index];},
        getIndex:function(){return this._p.index;},
        toString:function(){return this.getNumber()+this.getColor()+this.getWuXing()+this.getNameInBeiDou();},
        toFullString:function(){
          var s = this.getNumber();
          s += this.getColor();
          s += this.getWuXing();
          s += ' ';
          s += this.getPosition();
          s += '(';
          s += this.getPositionDesc();
          s += ') ';
          s += this.getNameInBeiDou();
          s += ' 玄空[';
          s += this.getNameInXuanKong();
          s += ' ';
          s += this.getLuckInXuanKong();
          s += '] 奇门[';
          s += this.getNameInQiMen();
          s += ' ';
          s += this.getLuckInQiMen();
          if(this.getBaMenInQiMen().length>0) {
            s += ' ';
            s += this.getBaMenInQiMen();
            s += '门';
          }
          s += ' ';
          s += this.getYinYangInQiMen();
          s += '] 太乙[';
          s += this.getNameInTaiYi();
          s += ' ';
          s += this.getTypeInTaiYi();
          s += ']';
          return s;
        }
      };
    };
    return {
      NAME_BEI_DOU:['天枢','天璇','天玑','天权','玉衡','开阳','摇光','洞明','隐元'],
      NAME_XUAN_KONG:['贪狼','巨门','禄存','文曲','廉贞','武曲','破军','左辅','右弼'],
      NAME_QI_MEN:['天蓬','天芮','天冲','天辅','天禽','天心','天柱','天任','天英'],
      BA_MEN_QI_MEN:['休','死','伤','杜','','开','惊','生','景'],
      NAME_TAI_YI:['太乙','摄提','轩辕','招摇','天符','青龙','咸池','太阴','天乙'],
      TYPE_TAI_YI:['吉神','凶神','安神','安神','凶神','吉神','凶神','吉神','吉神'],
      SONG_TAI_YI:['门中太乙明，星官号贪狼，赌彩财喜旺，婚姻大吉昌，出入无阻挡，参谒见贤良，此行三五里，黑衣别阴阳。','门前见摄提，百事必忧疑，相生犹自可，相克祸必临，死门并相会，老妇哭悲啼，求谋并吉事，尽皆不相宜，只可藏隐遁，若动伤身疾。','出入会轩辕，凡事必缠牵，相生全不美，相克更忧煎，远行多不利，博彩尽输钱，九天玄女法，句句不虚言。','招摇号木星，当之事莫行，相克行人阻，阴人口舌迎，梦寐多惊惧，屋响斧自鸣，阴阳消息理，万法弗违情。','五鬼为天符，当门阴女谋，相克无好事，行路阻中途，走失难寻觅，道逢有尼姑，此星当门值，万事有灾除。','神光跃青龙，财气喜重重，投入有酒食，赌彩最兴隆，更逢相生旺，休言克破凶，见贵安营寨，万事总吉同。','吾将为咸池，当之尽不宜，出入多不利，相克有灾情，赌彩全输尽，求财空手回，仙人真妙语，愚人莫与知，动用虚惊退，反复逆风吹。','坐临太阴星，百祸不相侵，求谋悉成就，知交有觅寻，回风归来路，恐有殃伏起，密语中记取，慎乎莫轻行。','迎来天乙星，相逢百事兴，运用和合庆，茶酒喜相迎，求谋并嫁娶，好合有天成，祸福如神验，吉凶甚分明。'],
      LUCK_QI_MEN:['大凶','大凶','小吉','大吉','大吉','大吉','小凶','小吉','小凶'],
      fromIndex:function(index){return _fromIndex(index);}
    };
  })();