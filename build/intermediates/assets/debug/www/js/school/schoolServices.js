/**
 * Created by Administrator on 2016/6/29.
 */
angular.module('schoolServices',[])
  .factory('$schoolData',function($http){
    return {
      list:function(requestParams){
        var url=config.basePath+'school_list?token='+requestParams.token;
        return $http({
          url:url,
          method:'GET'
        })
      },
      school:function(requestParams){
        var url=config.basePath+'school?token='+requestParams.token+'&id='+requestParams.id;
        return $http({
          url:url,
          method:'GET'
        })
      },
      add:function(requestParams){
        var url=config.basePath+'school_add?token='+requestParams.token;
        return $http({
          url:url,
          method:'POST',
          data:requestParams.school
        });
      },
      list_all:function(requestParams){
        var url=config.basePath+'school_list_all?token='+requestParams.token;
        return $http({
          url:url,
          method:'GET'
        })
      },
    }
  });
