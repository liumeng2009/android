/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('loginControllers',[])
  .controller('LoginCtrl',['$scope','$state','$stateParams','$ionicModal','$loginData','$ionicLoading','$ionicPopup','$timeout','$window','$ionicHistory','$cordovaToast','$cordovaSQLite','$cordovaDevice','$SFTools','$cordovaFile','$cordovaPreferences','$ionicNativeTransitions',function($scope,$state,$stateParams,$ionicModal,$loginData,$ionicLoading,$ionicPopup,$timeout,$window,$ionicHistory,$cordovaToast,$cordovaSQLite,$cordovaDevice,$SFTools,$cordovaFile,$cordovaPreferences,$ionicNativeTransitions){
    $scope.loginPage={
      action:'登录',
      noClick:false
    };
    $ionicModal.fromTemplateUrl('templates/reg.html', {
      scope: $scope,
      animation: 'slide-in-left'
    }).then(function(modal) {
      $scope.modal_reg = modal;
    });
    $scope.$on('$ionicView.enter',function(){
      console.log('清除历史和缓存');
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
      $SFTools.myToast('未完成');
    }
    $scope.hideReg=function(){
      $scope.modal_reg.hide();
    }
    $scope.user={
      username:'dreams',
      password:'123456'
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
    $scope.doLogin=function(){
      $scope.loginPage={
        action:'登录中...',
        noClick:true
      };
      $loginData.login(this.user).success(function(data){
        console.log('请求登录信息是：'+JSON.stringify(data));
        if (data.success !== 0) {
          //成功，把token存入Sql
          document.addEventListener('deviceready',function(){
            var db = null;
            db = window.sqlitePlugin.openDatabase({name: data.user._id+'.db3', location: 'default'});
            var uuid=$cordovaDevice.getUUID();
            console.log(uuid);
            db.executeSql('create table if not exists users(id,name,active,image,token,createAt,deviceId)');
            db.executeSql('select count(*) AS mycount from users where id=?', [data.user._id], function (rs) {
              var count = rs.rows.item(0).mycount;
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
                  tx.executeSql('update users set name=?,token=?,image=?,active=1 where id=?', [data.user.name, data.user.token, data.user.image, data.user._id],function(){

                  });
                },function(error){
                  console.log('有错误'+error);
                },function(){
                  $scope.loginNext(data.user.name,data.user._id,true);
                });
              }
              else {
                db.transaction(function (tx) {
                  tx.executeSql('update users set active=0');
                  var ts = new Date();
                  var deviceid=uuid+' '+ts.getTime();
                  tx.executeSql('insert into users values(?,?,?,?,?,?,?)', [data.user._id, data.user.name, 1, data.user.image, data.user.token, ts.getTime(),deviceid],function(){

                  });
                },function(error){
                  console.log('有错误'+error);
                },function(){
                  $scope.loginNext(data.user.name,data.user._id,true);
                });
              }
            });
            //同时更新一下用户信息
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
        } else {
          $SFTools.myToast(data.success + data.msg);
          $scope.loginPage={
            action:'登录',
            noClick:false
          };
        }
      }).error(function(data,status,headers,config){
        $scope.loginPage={
          action:'登录',
          noClick:false
        };
        $SFTools.myToast('error'+data);
      });
    }
    //登陆成功，取得token值之后的操作
    $scope.loginNext=function(username,userid,createDeviceId){
      //同步deivceid,当用户安装完app第一次登录的时候，也是第一次插入users表，这时候同步设备id
      console.log('next');
      if(createDeviceId) {
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: userid+'.db3', location: 'default'});
        db.executeSql('select * from users where active=1', [], function (rs) {
          var token = rs.rows.item(0).token;
          var deviceid = rs.rows.item(0).deviceId;
          console.log('向服务器同步用户设备id');
          $loginData.setDeviceId({
            token: token,
            deviceId: deviceid
          }).success(function (data) {
            $scope.loginPage={
              action:'登录',
              noClick:false
            };
            $SFTools.myToast('登录成功');

            //在文件存储中，将当前登录的账户更新进去
            $cordovaPreferences.store('loginUser',userid )
              .success(function(value) {
                console.log("Success: " + value);
                $ionicNativeTransitions.stateGo('tab.main', {}, {}, {
                  "type": "slide",
                  "direction": "right", // 'left|right|up|down', default 'left' (which is like 'next')
                  "duration": 200, // in milliseconds (ms), default 400
                });
              })
              .error(function(error) {
                console.log("Error: " + error);
                $SFTools.myToast('登录信息同步失败');
                $scope.loginPage = {
                  action: '登录',
                  noClick: false
                };
              })
            //登录成功之后，跳转
            $state.go('tab.main');
          }).error(function (error) {
            $SFTools.myToast('登录信息同步失败');
            $scope.loginPage = {
              action: '登录',
              noClick: false
            };
          })
        })
      }
      else{
        $SFTools.myToast('登录成功');
        //登录成功之后，跳转
        $state.go('tab.main');
      }
      //登陆成功，调用推送服务
      //window.pushservice.startService();
    }

    $scope.doRegister=function(){
      $loginData.reg(this.user).success(function(data){
        if(data.success === 0){
          $SFTools.myToast(data);
        }else{
          $SFTools.myToast('注册成功');
          $scope.user.password="";
          $scope.modal_reg.hide();
          $ionicNativeTransitions.stateGo('login', {}, {}, {
            "type": "slide",
            "direction": "left", // 'left|right|up|down', default 'left' (which is like 'next')
            "duration": 200, // in milliseconds (ms), default 400
          });
        }
      }).error(function(){
        $SFTools.myToast(config.userPrompt.ajaxError);
      });
    }
  }]);
