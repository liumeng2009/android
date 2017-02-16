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
      $state.go('login');
    }
    $scope.changeAvatar=function(){
      var options = {
        maximumImagesCount: 1,
        width: 800,
        height: 800,
        quality: 80
      };
      document.addEventListener("deviceready",function(){
        $cordovaImagePicker.getPictures(options)
          .then(function (results) {
            for (var i = 0; i < results.length; i++) {
              /*
              var options = {
                uri: results[i],
                folderName: "Protonet Messenger",
                quality: 90,
                width: 500,
                height: 500};

              window.ImageResizer.resize(options,
                function(image) {
                  // success: image is the new resized image
                  alert(image);
                }, function() {
                  alert('resize failed');
                  // failed: grumpy cat likes this function
                });
              */
              //alert('Image URI: ' + results[i]);

              var server=config.basePath+'uploadAvatar';
              var filepath=results[i];
              var option={};

              $ionicLoading.show({
                template: '0%已上传'
              });
              $cordovaFileTransfer.upload(server,filepath,option).then(
                function(result){
                  alert('结果是：'+JSON.stringify(result));
                  $ionicLoading.hide();
                  alert(JSON.stringify(result));
                  //上传结果，然后再将服务器处理的
                  //$cordovaProgress.hide();
                },function(err){
                  $SFTools.myToast(JSON.stringify(err));
                  $ionicLoading.hide();
                  //alert('出错了：'+JSON.stringify(err));
                  //$cordovaProgress.hide();
                },function(progress){
                  /*
                  alert('pregress:'+JSON.stringify(progress));
                  var percent=parseInt(progress.loaded/progress.total*100);
                  $ionicLoading.show({
                    template: percent+'%已上传'
                  });
                  */
                  //$SFTools.myToast(progress.loaded/progress.total);
                  //$cordovaProgress.showSimpleWithLabel(false,0,progress.loaded/progress.total);
                }
              );

            }
          }, function(error) {
            // error getting photos
          });
      },false);
    }
  }]);
