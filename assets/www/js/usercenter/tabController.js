/**
 * Created by liumeng on 2016/10/13.
 */
angular.module('tabControllers',[])
  .controller('TabCtrl',['$scope','$location','$state','$SFTools',function($scope,$location,$state,$SFTools){
    $scope.$on('$ionicView.loaded',function(){
      $SFTools.getStartPage(function(value){
        alert('从shared取出来的startPage值是'+value);
      });
    });
  }]);
