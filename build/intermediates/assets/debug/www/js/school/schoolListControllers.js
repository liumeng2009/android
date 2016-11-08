/**
 * Created by Administrator on 2016/7/11.
 */
angular.module('schoolListControllers',[])
  .controller('SchoolListCtrl',['$scope','$rootScope','$ionicModal','$state','$schoolData','$ionicLoading','$ionicPopup','$timeout','$window','$SFTools',function($scope,$rootScope,$ionicModal,$state,$schoolData,$ionicLoading,$ionicPopup,$timeout,$window,$SFTools){
    //页面加载时，载入list数据
    $scope.$on('$ionicView.enter',function(){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          $schoolData.list({token:_token.token})
            .success(function(data){
              if(data.success === 0){
                $SFTools.myToast(data.msg);
              }else{
                $scope.schools=data.schools;
              }
            })
            .error(function(){
              $SFTools.myToast('网络连接错误');
            });
        }
        else{
          $state.go('login');
        }
      });
    });
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
        $SFTools.getToken(function(_token){
          $schoolData.school({token:_token.token,id:schoolid})
            .success(function(data){
              if(data.success === 0){
                $SFTools.myToast(data.msg);
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
              $SFTools.myToast('网络连接错误');
            });
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
      $SFTools.getToken(function(_token){
        $schoolData.add({token:token,school:school})
          .success(function(data){
            if(data.success === 0){
              $SFTools.myToast(data.msg);
            }else{

            }
          })
          .error(function(){
            $SFTools.myToast('网络连接错误');
          })
      });
    }
  }]);
