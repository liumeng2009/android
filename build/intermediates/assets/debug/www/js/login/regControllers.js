/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('regControllers',[])
  .controller('RegCtrl',['$scope','$regData','$state','$ionicLoading','$ionicPopup','$timeout','$window',function($scope,$regdata,$state,$ionicLoading,$ionicPopup,$timeout,$window){
    $scope.doRegister=function(){
      $ionicLoading.show({
        delay:200
      });
      $regdata.reg(this.user).success(function(data){
        $ionicLoading.hide();
        if(data.success === 0){
          $scope.showErrorMesPopup(data.msg);
        }else{
          //成功，把token存入localStorage
          $window.localStorage.accesstoken=data.token;
          //$ionicHistory.goBack(-1);
          $state.go('tab.usercenter');
        }
      }).error(function(){
        $ionicLoading.hide();
        $scope.showErrorMesPopup('网络连接错误');
      });
    }
  $scope.showErrorMesPopup = function(title) {
    var myPopup = $ionicPopup.show({
      title: '<b>'+title+'</b>'
    });
    $timeout(function() {
      myPopup.close(); // 2秒后关闭
    }, 1000);
  };
  }])
