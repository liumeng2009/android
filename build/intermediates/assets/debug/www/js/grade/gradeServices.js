/**
 * Created by Administrator on 2016/7/15.
 */
angular.module('gradeServices',[])
  .factory('$gradeData',function($http){
    return {
      list_by_school:function(requestParams){
        var url=config.basePath+'grade_list_by_school?token='+requestParams.token+'&id='+requestParams.id;
        return $http({
          url:url,
          method:'GET'
        })
      }
    }
  });
