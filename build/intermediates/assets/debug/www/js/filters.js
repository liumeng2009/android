/**
 * Created by Administrator on 2016/7/26.
 */
angular.module('starter.filters', [])
  .filter('mydate',function(){
    return function(input){
      var out ='';
      var dateInput=new Date(input);
      var nowDate=new Date();
      if(dateInput.getDay()===nowDate.getDay()){
        if(dateInput.getHours()>12){
          out='下午'+(dateInput.getHours()-12)+':'+dateInput.getMinutes();
        }
        else if(dateInput.getHours()<12){
          out='早上'+(dateInput.getHours())+':'+dateInput.getMinutes();
        }
        else{
          out='中午'+(dateInput.getHours())+':'+dateInput.getMinutes();
        }
      }
      else if(nowDate.getDay()-dateInput.getDay()===1){
        out='昨天'+(dateInput.getHours())+':'+dateInput.getMinutes();
      }
      else{
        out=dateInput.getFullYear()+'年'+(dateInput.getMonth()+1)+'月'+dateInput.getDate()+'日 '+(dateInput.getHours())+':'+dateInput.getMinutes();
      }
      return out;
    }
  })
  .filter('mynum',function(){
    return function(input){
      var out='';
      if(parseInt(input)>99){
        out='99+'
      }
      else{
        out=input;
      }
      return out;
    }
  })
;
