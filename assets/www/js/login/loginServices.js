/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('loginServices',[])
  .factory('$loginData',function($http){
    return {
      login:function(requestParams){
        var url=config.basePath+'signin?username='+requestParams.username+'&password='+requestParams.password;
        console.log(url);
        return $http({
          url:url,
          method:'GET'
        });
      },
      reg:function(requestParams){
        var url=config.basePath+'signup'
        return $http({
          method:'POST',
          url:url,
          data:requestParams
        })
      },
      setDeviceId:function(requestParams){
        var url=config.basePath+'setdeviceid?deviceType=phone&deviceId='+requestParams.deviceId+'&token='+requestParams.token;
        console.log(url);
        return $http({
          url:url,
          method:'GET'
        })
      }
    }
  });
