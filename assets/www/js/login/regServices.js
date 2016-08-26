/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('regServices',[])
  .factory('$regData',function($http){
    return {
      reg:function(requestParams){
        var url=config.basePath+'signup'
        return $http({
          method:'POST',
          url:url,
          data:requestParams
        })
      }
    }
  });
