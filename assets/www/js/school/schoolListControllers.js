/**
 * Created by Administrator on 2016/7/11.
 */
angular.module('schoolListControllers',[])
  .controller('SchoolListCtrl',['$scope','$rootScope','$ionicModal','$state','$schoolData','$ionicLoading','$ionicPopup','$timeout','$window',function($scope,$rootScope,$ionicModal,$state,$schoolData,$ionicLoading,$ionicPopup,$timeout,$window){
    //页面加载时，载入list数据
    $scope.$on('$ionicView.afterEnter',function(){
      $ionicLoading.show({
        delay:200
      });
      var token=$window.localStorage.accesstoken;
      if(token){
        $schoolData.list({token:token})
          .success(function(data){
            $ionicLoading.hide();
            if(data.success === 0){
              $scope.showErrorMesPopup(data.msg);
            }else{
              $scope.schools=data.schools;
            }
          })
          .error(function(){
            $ionicLoading.hide();
            $scope.showErrorMesPopup('网络连接错误');
          });
      }
      else{
        $ionicLoading.hide();
      }
    });
    //显示错误信息
    $scope.showErrorMesPopup = function(title) {
      var myPopup = $ionicPopup.show({
        title: '<b>'+title+'</b>'
      });
      $timeout(function() {
        myPopup.close(); // 2秒后关闭
      }, 1000);
    };
    //弹出modal
    $ionicModal.fromTemplateUrl('templates/modal_add.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $scope.openModal=function(schoolid){
      $scope.modal.show();
      if(schoolid){
        var token=$window.localStorage.accesstoken;
        $schoolData.school({token:token,id:schoolid})
          .success(function(data){
            $ionicLoading.hide();
            if(data.success === 0){
              $scope.showErrorMesPopup(data.msg);
            }else{
              $scope.school=data.school;
              $scope.school.title=data.school.name;
              $timeout(function() {
                $("#" + 'city' + schoolid).citySelect({
                  prov: data.school.province,
                  city: data.school.city,
                  dist: data.school.country
                })
              },0);
            }
          })
          .error(function(){
            $ionicLoading.hide();
            $scope.showErrorMesPopup('网络连接错误');
          });
      }
      else{
        $scope.school={};
        $timeout(function() {
          $("#city").citySelect({nodata: "none", required: false});
        },0);
      }

    }
    $rootScope.$on('$stateChangeStart',function(){
      $scope.modal.hide();
    });
    $scope.goUsercenter=function(){
      $state.go('tab.usercenter');
    };
    $scope.save=function(){
      var school=this.school;
      var token=$window.localStorage.accesstoken;
      $schoolData.add({token:token,school:school})
        .success(function(data){
          $ionicLoading.hide();
          if(data.success === 0){
            $scope.showErrorMesPopup(data.msg);
          }else{

          }
        })
        .error(function(){
          $ionicLoading.hide();
          $scope.showErrorMesPopup('网络连接错误');
        })
    }
  }]);
;
