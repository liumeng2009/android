/**
 * Created by Administrator on 2016/7/26.
 */
angular.module('starter.filters', [])
  .filter('mydate',function(){
    return function(input){
      var out ='';
      var dateInput=new Date(input);
      var nowDate=new Date();
      if( dateInput.getDate()===nowDate.getDate()){
        if(dateInput.getHours()>12){
          out='今天'+(dateInput.getHours())+':'+(dateInput.getMinutes()<10?('0'+dateInput.getMinutes()):dateInput.getMinutes());
        }
        else if(dateInput.getHours()<12){
          out='今天'+(dateInput.getHours())+':'+(dateInput.getMinutes()<10?('0'+dateInput.getMinutes()):dateInput.getMinutes());
        }
        else{
          out='今天'+(dateInput.getHours())+':'+(dateInput.getMinutes()<10?('0'+dateInput.getMinutes()):dateInput.getMinutes());
        }
      }
      else if(nowDate.getDate()-dateInput.getDate()===1){
        out='昨天'+(dateInput.getHours())+':'+(dateInput.getMinutes()<10?('0'+dateInput.getMinutes()):dateInput.getMinutes());
      }
      else{
        out=(dateInput.getMonth()+1)+'月'+dateInput.getDate()+'日 '+(dateInput.getHours())+':'+(dateInput.getMinutes()<10?('0'+dateInput.getMinutes()):dateInput.getMinutes());
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
  .filter('mynew',function(){
    return function(input){
      var out='';
      if(parseInt(input)>9){
        out=null
      }
      else{
        out=input;
      }
      return out;
    }
  })
;
