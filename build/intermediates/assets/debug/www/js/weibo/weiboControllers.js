/**
 * Created by liumeng on 2016/7/11.
 */
angular.module('weiboControllers',[])
  .controller('WeiboCtrl',['$scope','$rootScope','$state','$ionicModal','$usercenterData','$ionicLoading','$ionicPopup','$timeout','$window',function($scope,$rootScope,$state,$ionicModal,$usercenterData,$ionicLoading,$ionicPopup,$timeout,$window){
    $ionicModal.fromTemplateUrl('templates/modal.html', {
      scope: $scope
    }).then(function(modal) {
      $scope.modal = modal;
    });
  }]);

