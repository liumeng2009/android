/**
 * Created by Administrator on 2016/7/15.
 */
angular.module('childrenServices',[])
  .factory('$childrenData',function($http){
    return {
      add:function(requestParams){
        var url=config.basePath+'student_add?token='+requestParams.token;
        return $http({
          url:url,
          method:'POST',
          data:requestParams.child
        })
      },
      list:function(requestParams){
        var url=config.basePath+'student_list?token='+requestParams.token;
        return $http({
          url:url,
          method:'GET'
        })
      },
      chat_list:function(requestParams){
        var url=config.basePath+'student_chat_list?token='+requestParams.token+'&id='+requestParams.studentid;
        return $http({
          url:url,
          method:'GET'
        })
      }
    }
  });
