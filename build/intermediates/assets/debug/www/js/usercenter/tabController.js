/**
 * Created by liumeng on 2016/10/13.
 */
angular.module('tabControllers',[])
  .controller('TabCtrl',['$scope',function($scope){
    $scope.$on('$ionicView.loaded',function(){
      //alert('这是最高级的ctrl吗');
    });
  }]);
