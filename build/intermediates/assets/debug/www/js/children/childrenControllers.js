/**
 * Created by liumeng on 2016/7/11.
 */
var selectPop;
angular.module('childrenControllers',[])
  .controller('ChildrenCtrl',['$scope','$rootScope','$ionicModal','$state','$usercenterData','$schoolData','$gradeData','$childrenData','$ionicLoading','$ionicPopup','$timeout','$window','$SFTools',function($scope,$rootScope,$ionicModal,$state,$usercenterData,$schoolData,$gradeData,$childrenData,$ionicLoading,$ionicPopup,$timeout,$window,$SFTools){
    $scope.$on('$ionicView.afterEnter',function(){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          $childrenData.list({token:_token.token})
            .success(function(data){
              if(data.success === 0){
                $SFTools.myToast(data.msg);
              }else{
                $scope.students=data.students;

                //确定studentnow
                if($window.localStorage.studentnow){
                  if($scope.students.length>0) {
                    for (var i = 0; i < $scope.students.length; i++) {
                      if ($scope.students[i]._id.toString() === $window.localStorage.studentnow) {
                        $scope.studentnow = $scope.students[i];
                        break;
                      }
                      else {

                      }
                    }
                  }
                  else{
                    $scope.studentnow=false;
                  }
                }
                else{
                  if($scope.students.length>0){
                    $scope.studentnow=$scope.students[0];
                    $window.localStorage.studentnow=$scope.students[0]._id;
                  }


                  else
                    $scope.studentnow=false;
                }
                //根据studentnow来绑定list
                if($scope.studentnow!=0){
                  $childrenData.chat_list({token:_token.token,studentid:$scope.studentnow._id})
                    .success(function(data){
                      $scope.users=data.users;
                      alert('这个用户的孩子是：'+data.users[0].sons[0].name);
                    })
                    .error(function(){
                      $SFTools.myToast('网络连接错误');
                    });
                }
                else{
                  $scope.nostudent=true;
                }

              }
            })
            .error(function(){
              $SFTools.myToast('网络连接错误');
            });
        }
        else{
          $state.go('login',{redirectUrl:'tab.children'});
        }
      });
    });
    $scope.orgnow={
      sname:'',
      _sid:'',
      gname:'',
      _gid:''
    };
    $scope.student={

    };
    $scope.selectschool=function(u){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!='') {
          $schoolData.list_all({token:_token.token})
            .success(function(data){
              if(data.success === 0){
                $SFTools.myToast(data.msg);
              }else{
                $scope.schools=data.schools;
                selectPop=$ionicPopup.show({
                  //template: '<div class="list"><label class="item item-radio" ng-repeat="school in schools"><input type="radio" name="group"><div class="item-content">{{school.name}}</div><i class="radio-icon ion-checkmark"></i></label></div>',
                  template:'<ion-list ng-repeat="school in schools"><ion-radio ng-value="school._id" ng-click="setSchoolNow()" >{{school.name}}</ion-radio></ion-list>',
                  title: '请选择学校',
                  scope: $scope,
                  buttons:[
                    {
                      text:'取消'
                    }
                  ]
                });
              }
            })
            .error(function(){
              $SFTools.myToast('网络连接错误');
            });
        }
        else{
          $state.go('login',{redirectUrl:'tab.children'});
        }
      });
    };
    $scope.selectgrade=function(u){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!='') {
          $gradeData.list_by_school({token:_token.token,id:$scope.orgnow._sid})
            .success(function(data){
              if(data.success === 0){
                $SFTools.myToast(data.msg);
              }else{
                $scope.grades=data.grades;
                selectPop=$ionicPopup.show({
                  //template: '<div class="list"><label class="item item-radio" ng-repeat="school in schools"><input type="radio" name="group"><div class="item-content">{{school.name}}</div><i class="radio-icon ion-checkmark"></i></label></div>',
                  template:'<ion-list ng-repeat="grade in grades"><ion-radio ng-value="grade._id" ng-click="setGradeNow()" >{{grade.name}}</ion-radio></ion-list>',
                  title: '请选择班级',
                  scope: $scope,
                  buttons:[
                    {text:'取消'}
                  ]
                });
              }
            })
            .error(function(){
              $SFTools.myToast('网络连接错误');
            });
        }
        else{
          $state.go('login',{redirectUrl:'tab.children'});
        }
      });
    };
    $ionicModal.fromTemplateUrl('templates/modal_children_add.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $ionicModal.fromTemplateUrl('templates/modal_student_select.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal_Student_Select = modal;
    });
    $scope.openModal=function(schoolid){
      $scope.modal.show();
    }
    $scope.openStudentSelectModal=function(studentid){
      $scope.modal_Student_Select.show();
    }
    $scope.setSchoolNow=function(){
      $scope.orgnow.sname=this.school.name;
      $scope.orgnow._sid=this.school._id;
      selectPop.close();
    };
    $scope.setGradeNow=function(){
      $scope.orgnow.gname=this.grade.name;
      $scope.orgnow._gid=this.grade._id;
      selectPop.close();
    };
    $rootScope.$on('$stateChangeStart',function(){
      $scope.modal.hide();
      $scope.modal_Student_Select.hide();
    });
    $scope.save=function(){
      var child=this.student;
      child.school=$scope.orgnow._sid;
      child.grade=$scope.orgnow._gid;
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!='') {
          $childrenData.add({token:_token.token,child:child})
            .success(function(data){
              $scope.modal.hide();
              $scope.studentnow=data.student;
              $window.localStorage.studentnow=data.student._id;
              $childrenData.chat_list({token: token, studentid:data.student._id})
                .success(function (data) {
                  $scope.users = data.users;
                })
                .error(function () {
                  $SFTools.myToast('网络连接错误');
                });
            })
            .error(function(){
              $SFTools.myToast('网络连接错误');
            });
        }
        else{
          $state.go('login',{redirectUrl:'tab.children'});
        }

      });
    }
    $scope.chatWithUser=function(_id,_name){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!='') {
          $usercenterData.usercenter({token:_token.token})
            .success(function(data){
              if(data.success === 0){
                $SFTools.myToast(data.msg);
              }else{
                $state.go('chat',{
                  from:{
                    _id:data.user._id,
                    name:data.user.name
                  },
                  to:{
                    _id:_id,
                    name:_name
                  }
                });
              }
            })
            .error(function(){
              $SFTools.myToast('网络连接错误');
            });
        }
        else{
          $state.go('login',{redirectUrl:'tab.children'});
        }
      });
    }
    $scope.select_student=function(id){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!='') {
          for (var i = 0; i < $scope.students.length; i++) {
            if ($scope.students[i]._id.toString() === id.toString()) {
              $scope.studentnow = $scope.students[i];
              $window.localStorage.studentnow=id.toString();
              $childrenData.chat_list({token: _token.token, studentid: id})
                .success(function (data) {
                  $scope.users = data.users;
                })
                .error(function () {
                  $SFTools.myToast('网络连接错误');
                });
            }
          }
          $scope.modal_Student_Select.hide();
        }
        else{
          $state.go('login',{redirectUrl:'tab.children'});
        }
      });
    }
  }]);

