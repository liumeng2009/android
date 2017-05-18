/**
 * Created by Administrator on 2016/6/29.
 */
angular.module('usercenterControllers',[])
  .controller('UserCenterCtrl',['$scope','$rootScope','$state','$usercenterData','$ionicLoading','$ionicPopup','$timeout','$window','$cordovaDialogs','$SFTools','$cordovaImagePicker','$cordovaFileTransfer','$cordovaProgress',function($scope,$rootScope,$state,$usercenterData,$ionicLoading,$ionicPopup,$timeout,$window,$cordovaDialogs,$SFTools,$cordovaImagePicker,$cordovaFileTransfer,$cordovaProgress){
    $scope.user={};
    $scope.$on('$ionicView.afterEnter',function(){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          //加载离线
          $scope.user.name=_token.name;
          $scope.user.image=_token.image;
          //alert(_token.image);
          //加载在线
          $usercenterData.usercenter({token:_token.token})
            .success(function(data) {
              if (data.success === 0) {
                $SFTools.myToast(data.msg);
              } else {
                $scope.user = data.user;
                //alert($scope.user.image);
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
      $window.localStorage.studentnow='';
      $state.go('login');
    }
    $scope.changeAvatar=function(){
      $timeout(function(){
        $scope.uploader={
          show:true
        };
      },1000);

      var options = {
        maximumImagesCount: 1,
        width: 800,
        height: 800,
        quality: 80
      };
      $SFTools.getToken(function(_token){
        $cordovaImagePicker.getPictures(options)
          .then(function (results) {
            //alert(JSON.stringify(results));
            if(results.length<1||results[0]==''){
              $scope.uploader.show=false;
            }
            else{
              $scope.uploadProcessPercent='0%';
              for (var i = 0; i < results.length; i++) {
                var server=config.basePath+'uploadAvatar'+'/'+_token.userid;
                console.log(server);
                var filepath=results[i];
                var option={};
                $cordovaFileTransfer.upload(server,filepath,option).then(
                  function(result){
                    //alert('结果是：'+JSON.stringify(result));
                    $scope.uploadProcessPercent='';
                    $scope.uploader.show=true;
                    $usercenterData.usercenter({token:_token.token})
                      .success(function(data) {
                        if (data.success === 0) {
                          $SFTools.myToast(data.msg);
                          $scope.uploader.show=false;
                        } else {
                          $scope.user = data.user;
                          //alert('替换新头像：'+data.user.image);
                          $scope.uploader.show=false;
                          //同时替换token，发出更换头像的消息。
                          $rootScope.$broadcast('changeMyImage',data.user.image);
                          //alert(JSON.stringify(data.user))
                          //修改本地数据库中的用户信息
                          var db=null;
                          db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
                          db.transaction(function(tx){
                            tx.executeSql('update users set image=?,imageurl=? where id=?',[data.user.image,data.user.imageUrl,_token.userid]);
                            tx.executeSql('update userinfo set image=?,imageurl=? where id=?',[data.user.image,data.user.imageUrl,_token.userid]);
                          },function(error){
                            alert(error);
                          },function(){
                            //alert('sql更新头像成功');
                          });
                        }
                      });
                  },function(err){
                    $SFTools.myToast('更换头像失败');
                    $scope.uploader.show=false;
                    //alert('出错了：'+JSON.stringify(err));
                    //$cordovaProgress.hide();
                  },function(progress){
                    //alert(JSON.stringify(progress));
                    $timeout(function(){
                      var percent=progress.loaded/progress.total;
                      $scope.uploadProcessPercent=parseInt(percent*100)+'%';
                    },1000*progress.loaded/progress.total)
                  }
                );

              }
            }

          }, function(error) {
            // error getting photos
          });
      });
    }
  }]);
