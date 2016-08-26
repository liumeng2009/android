/**
 * Created by Administrator on 2016/6/29.
 */
angular.module('usercenterControllers',[])
  .controller('UserCenterCtrl',['$scope','$rootScope','$state','$usercenterData','$ionicLoading','$ionicPopup','$timeout','$window','$cordovaDialogs',function($scope,$rootScope,$state,$usercenterData,$ionicLoading,$ionicPopup,$timeout,$window,$cordovaDialogs){
    $scope.$on('$ionicView.afterEnter',function(){
      var token=$window.localStorage.accesstoken;
      if(token){
        $usercenterData.usercenter({token:token})
          .success(function(data){
            if(data.success === 0){
              $scope.showErrorMesPopup(data.msg);
            }else{
              $scope.user=data.user;
              //登录成功之后，登录实时系统
              /*
              iosocket.emit('login', {
                name:data.user.name,
                _id:data.user._id
              });
              */
            }
          })
          .error(function(){
            $scope.showErrorMesPopup('网络连接错误');
          });
      }
      else{
        $state.go('login');
      }
    });
    $scope.showErrorMesPopup = function(title) {
      /*
      $cordovaDialogs.alert('message', title, 'ok')
        .then(function() {
          // callback success
        });
        */
      /*
      var myPopup = $ionicPopup.show({
        title: '<b>'+title+'</b>'
      });
      $timeout(function() {
        myPopup.close(); // 2秒后关闭
      }, 1000);
      */
    };
    $scope.logout=function(){
      //告诉实时服务器
      //iosocket.emit('logout',$scope.user._id);
      $window.localStorage.accesstoken=undefined;
      $scope.user=undefined;
    }
    $scope.goLogin=function(){
      $state.go('login');
    }
  }]);
