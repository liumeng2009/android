/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('loginControllers',[])
  .controller('LoginCtrl',['$scope','$state','$stateParams','$ionicModal','$loginData','$ionicLoading','$ionicPopup','$timeout','$window','$ionicHistory','$cordovaToast','$cordovaSQLite',function($scope,$state,$stateParams,$ionicModal,$loginData,$ionicLoading,$ionicPopup,$timeout,$window,$ionicHistory,$cordovaToast,$cordovaSQLite){
    $ionicModal.fromTemplateUrl('templates/reg.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal_reg = modal;
    });
    $scope.$on('$ionicView.enter',function(){
      $ionicHistory.clearHistory();
      $ionicHistory.clearCache();
    });
    $scope.showReg=function(){
      $scope.modal_reg.show();
      //开启键盘
      //$cordovaKeyboard.show();
      //$scope.regStart=true;
    }
    $scope.showFind=function(){
      $scope.showErrorMesPopup('未完成');
    }
    $scope.hideReg=function(){
      $scope.modal_reg.hide();
    }
    $scope.user={
      username:'',
      password:''
    }
    $scope.seePassword=false;
    $scope.changeSeePassword=function(){
      if($scope.seePassword){
        $scope.seePassword=false;
      }
      else{
        $scope.seePassword=true;
      }
    }
    $scope.backLeft=function(){
      $state.go(-1);
    }
    $scope.scheduleSingleNotification = function () {
      $cordovaLocalNotification.schedule({
        id: 1,
        title: 'Title here',
        text: 'Text here',
        data: {
          customProperty: 'custom value'
        }
      }).then(function (result) {
        // ...
      });
    };
    $scope.doLogin=function(){
      $ionicLoading.show({
        delay:200
      });
      $loginData.login(this.user).success(function(data){
        $ionicLoading.hide();
        if (data.success !== 0) {
          //成功，把token存入Sql
          document.addEventListener('deviceready', function () {
            var db = null;
            db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});

            db.executeSql('create table if not exists users(id,name,active,image,token,createAt)');
            db.executeSql('select count(*) AS mycount from users where id=?', [data.user._id], function (rs) {
              var count = rs.rows.item(0).mycount;
              console.log('222222222222' + count);
              if (count > 0) {
                exist = true;
              }
              else {
                exist = false;
              }
              //存在，就把token更新，不存在，就插入新的数据
              if (exist) {
                db.transaction(function (tx) {
                  tx.executeSql('update users set active=0');
                  tx.executeSql('update users set name=?,token=?,image=?,active=1 where id=?', [data.user.name, data.user.token, data.user.image, data, user._id]);
                });
              }
              else {
                db.transaction(function (tx) {
                  tx.executeSql('update users set active=0');
                  var ts = new Date();
                  tx.executeSql('insert into users values(?,?,?,?,?,?)', [data.user._id, data.user.name, 1, data.user.image, data.user.token, ts.getTime()]);
                });
              }
            });
            db.executeSql('create table if not exists userinfo(id,name,image,showInMain)');
            db.executeSql('select count(*) as mycount from userinfo where id=?',[data.user._id],function(rs){
              var count = rs.rows.item(0).mycount;
              if (count > 0) {
                exist = true;
              }
              else {
                exist = false;
              }
              if (exist) {
                db.transaction(function (tx) {
                  tx.executeSql('update userinfo set name=?,image=? id=?', [data.user.name, data.user.image, data, user._id]);
                });
              }
              else {
                db.transaction(function (tx) {
                  tx.executeSql('insert into userinfo values(?,?,?,?)', [data.user._id, data.user.name,data.user.image,1]);
                });
              }
            })

          });

          //$window.localStorage.accesstoken=data.user.token;
          //如果没有自动登录，经过login页面的话，需要在这里连接socket
          iosocket = io.connect('http://liumeng.iego.cn/', {'reconnect': true});
          iosocket.emit('login', {
            name: data.user.name,
            _id: data.user._id,
            type: 'page'
          });
          //登陆成功，调用推送服务
          window.pushservice.startService({
            name: data.user.name,
            _id: data.user._id,
            image: data.user.image,
            token: data.user.token,
            createAt: data.user.meta.createAt
          });
          //登录成功之后，跳转
          if ($stateParams.redirectUrl) {
            $state.go($stateParams.redirectUrl);
          }
          else {
            $state.go('tab.main');
          }
        } else {
          $scope.showErrorMesPopup(data.success + data.msg);
        }
      }).error(function(data,status,headers,config){
        $ionicLoading.hide();
        $scope.showErrorMesPopup('error'+data);
      });
    }
    $scope.showErrorMesPopup = function(title) {
      $cordovaToast
        .show(title, 'short', 'center')
        .then(function(success) {
          // success
        }, function (error) {
          // error
        });
    };
    $scope.doRegister=function(){
      $ionicLoading.show({
        delay:200
      });
      $loginData.reg(this.user).success(function(data){
        $ionicLoading.hide();
        if(data.success === 0){
          $scope.showErrorMesPopup(data.msg);
        }else{
          //成功，把token存入localStorage
          $window.localStorage.accesstoken=data.token;
          //$ionicHistory.goBack(-1);
          $scope.modal_reg.hide();
          $state.go('tab.usercenter');
        }
      }).error(function(){
        $ionicLoading.hide();
        $scope.showErrorMesPopup('网络连接错误');
      });
    }
  }]);
