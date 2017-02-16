/**
 * Created by liumeng on 2016/10/13.
 */
angular.module('tabControllers',[])
  .controller('TabCtrl',['$scope','$rootScope','$location','$state','$SFTools','$ionicModal','$ionicScrollDelegate','$timeout','$ionicPlatform','$mainData','$cordovaNetwork','$interval',function($scope,$rootScope,$location,$state,$SFTools,$ionicModal,$ionicScrollDelegate,$timeout,$ionicPlatform,$mainData,$cordovaNetwork,$interval){
    $rootScope.isOnline=true;
    $scope.$on('$ionicView.afterEnter',function(){
      //alert('tab after enter');
      //获取app加载的起始页面，用于点击通知打开app的方式
      $SFTools.getStartPage(function(value){
        //alert('从shared取出来的startPage值是'+value);
      });
      //检查网络状况
      document.addEventListener("deviceready",function(){
        if($cordovaNetwork.isOnline()){
          $rootScope.isOnline=true;
        }
        else{
          $rootScope.isOnline=false;
        }
      });
    });

    //断线重连触发，触发后，执行initMessageFromServer
    $rootScope.$on('$cordovaNetwork:online', function(event, networkState){
      console.log('连上网了，同步服务器消息');
      $SFTools.getToken(function(token){
        $scope.initMessageFromServer(token);
      });
      $rootScope.isOnline=true;
    });

    $rootScope.$on('$cordovaNetwork:offline', function(event, networkState){
      $rootScope.isOnline=false;
    });
  }]);
