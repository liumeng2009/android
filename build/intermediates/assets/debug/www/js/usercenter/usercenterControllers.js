/**
 * Created by Administrator on 2016/6/29.
 */
angular.module('usercenterControllers',[])
  .controller('UserCenterCtrl',['$scope','$rootScope','$state','$usercenterData','$ionicLoading','$ionicPopup','$timeout','$window','$cordovaDialogs','$SFTools',function($scope,$rootScope,$state,$usercenterData,$ionicLoading,$ionicPopup,$timeout,$window,$cordovaDialogs,$SFTools){
    $scope.user={};
    $scope.$on('$ionicView.afterEnter',function(){
      $SFTools.getToken(function(_token){
        alert(_token);
        if(_token&&_token.userid&&_token!=''){
          //加载离线
          $scope.user.name=_token.name;
          $scope.user.image=_token.image;
          alert('当前用户是'+_token.name+_token.userid);
          //加载在线
          $usercenterData.usercenter({token:_token.token})
            .success(function(data) {
              if (data.success === 0) {
                $SFTools.myToast(data.msg);
              } else {
                $scope.user = data.user;
              }
            });
        }
        else{
          $state.go('login',{redirectUrl:'tab.usercenter'});
        }
      });
    });
    $scope.logout=function(){
      //告诉实时服务器
      iosocket.emit('logout',$scope.user._id);
    }
  }]);
