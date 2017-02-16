/**
 * Created by Administrator on 2016/7/22.
 */
angular.module('mainServices',[])
  .factory('$mainData',function($http){
    return {
      not_read_list:function(requestParams){
        var url=config.basePath+'chat_not_read_list?token='+requestParams.token;
        return $http({
          url:url,
          method:'GET'
        })
      },
      not_read_list_to:function(requestParams){
        var url=config.basePath+'chat_not_read_list_to?token='+requestParams.token+'&fromid='+requestParams.fromid;
        return $http({
          url:url,
          method:'GET'
        })
      },
      twelve_hours_ago:function(requestParams){
        var url=config.basePath+'chat_twelve_hours_ago?token='+requestParams.token+'&fromid='+requestParams.fromid;
        return $http({
          url:url,
          method:'GET'
        })
      },
      setNewDeviceId:function(requestParams){
        var url=config.basePath+'chat_set_new_device?token='+requestParams.token+'&userid='+requestParams.userid+'&deviceid='+requestParams.deviceid;
        return $http({
          url:url,
          method:'GET'
        })
      }
    }
  });
