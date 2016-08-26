/**
 * Created by Administrator on 2016/7/22.
 */
angular.module('mainControllers',['ngCordova'])
  .controller('MainCtrl',['$scope','$rootScope','$state','$ionicModal','$usercenterData','$mainData','$ionicLoading','$ionicPopup','$timeout','$window','$cordovaToast',function($scope,$rootScope,$state,$ionicModal,$usercenterData,$mainData,$ionicLoading,$ionicPopup,$timeout,$window,$cordovaToast){
    $scope.$on('$ionicView.afterEnter',function(){
      //app默认进入页面
      var token=$window.localStorage.accesstoken;
      if(token){
        $usercenterData.usercenter({token:token})
          .success(function(data){
            if(data.success===0){
              $state.go('login');
              $scope.showErrorMesPopup(data.msg);
            }
            else{
              var chats=$window.localStorage[data.user._id]?JSON.parse($window.localStorage[data.user._id]):[];
              $scope.chats=chats;
              //登录成功之后，登录实时系统
              /*
              iosocket.emit('login', {
                name:data.user.name,
                _id:data.user._id
              });
              */
              //iosocket.send('hi');
              //iosocket.on('connection',function(iosockett){
              //iosocket.on('userlist',function(obj){
              //  $rootScope.onlineUser=obj.userlist;
              //});
              /*
              iosocket.on('to'+data.user._id,function(obj){
                  var chats=$window.localStorage[data.user._id]?JSON.parse($window.localStorage[data.user._id]):[];
                  if(chats.length===0){
                    var chat={
                      id:obj.from._id,
                      name:obj.from.name,
                      image:obj.from.image,
                      content:[obj.message],
                      createAt:obj.createAt,
                      new:true
                    };
                    chats.unshift(chat);
                    $window.localStorage[data.user._id]=JSON.stringify(chats);
                  }
                  else{
                    for(var i=0;i<chats.length;i++){
                      if(chats[i].id.toString()===obj.from._id.toString()){
                        if(chats[i].new){
                          chats[i].content.unshift(obj.message);
                          chats[i].createAt=obj.createAt;
                          chats[i].new=true;
                          //置前
                          var c=chats[i];
                          chats.splice(i,1);
                          chats.unshift(c);
                          break;
                        }
                        else{
                          chats[i].content=[obj.message];
                          chats[i].createAt=obj.createAt;
                          chats[i].new=true;
                          //置前
                          var c=chats[i];
                          chats.splice(i,1);
                          chats.unshift(c);
                          break;
                        }

                      }
                      else{
                        if(i===chats.length-1){
                          //说明没有
                          var chat={
                            id:obj.from._id,
                            name:obj.from.name,
                            image:obj.from.image,
                            content:[obj.message],
                            createAt:obj.createAt,
                            new:true
                          };
                          chats.unshift(chat);
                          //i++;
                          break;
                        }
                      }
                    }
                  }

                  $window.localStorage[data.user._id]=JSON.stringify(chats);
                  $scope.chats=chats;

                  $scope.check_online();


                  $scope.$apply();
                })
             // })
*/
              $mainData.not_read_list({token:token})
                .success(function(da){
                  if(da.success === 0){
                    $scope.showErrorMesPopup(da.msg,goLogin);
                  }else{
                    var chatsDB=da.chats;
                    //这是别人发给他的，但是没查看的
                    if(chats.length==0){
                      for(var i=0;i<chatsDB.length;i++){
                        var chat={
                          id:chatsDB[i].from._id,
                          name:chatsDB[i].from.name,
                          image:chatsDB[i].from.image,
                          content:chatsDB[i].content,
                          createAt:chatsDB[i].meta.createAt,
                          new:true
                        };
                        chats.push(chat);
                      }
                    }
                    else{
                      for(var i=0;i<chats.length;i++){
                        //遍历chatdb，如果没有这个id，就将chats里面id符合的条目new=false，
                        if(chatsDB.length===0){
                          chats[i].new=false;
                        }
                        for(var k=0;k<chatsDB.length;k++){
                          if(chatsDB[k].from._id.toString()===chats[i].id){
                            chats[i].content=chatsDB[k].content;
                            chats[i].new=true;
                            chatsDB.splice(k,1);
                            break;
                          }
                          else{
                            if(k===chatsDB.length-1){
                              chats[i].new=false;
                            }
                          }
                        }
                      }
                      //循环完毕后，还剩下多少chatdb
                      for(var i=0;i<chatsDB.length;i++) {
                        var chat = {
                          id: chatsDB[i].from._id,
                          name: chatsDB[i].from.name,
                          image: chatsDB[i].from.image,
                          content: chatsDB[i].content,
                          createAt: chatsDB[i].meta.createAt,
                          new: true
                        };
                        chats.push(chat);
                      }
                    }
                    $scope.check_online();
                    $scope.chats=chats;
                    $window.localStorage[data.user._id]=JSON.stringify(chats);
                  }
                })
                .error(function(){
                  $scope.showErrorMesPopup('网络连接错误');
                });
            }
          })
          .error(function(){
            $scope.showErrorMesPopup('网络连接错误');
          })
      }
      else{
        $timeout(function(){
          $state.go('login');
        },1000);

      }
    });
    $scope.chatwidth=function(id,name){
      var token=$window.localStorage.accesstoken;
      if(token){
        $usercenterData.usercenter({token:token})
          .success(function(data){
            if(data.success === 0){
              $scope.showErrorMesPopup(data.msg,function(){
                $state.go('login');
              });
            }else{
              $state.go('chat',{
                from:{
                  _id:data.user._id,
                  name:data.user.name
                },
                to:{
                  _id:id,
                  name:name
                }
              });
            }
          })
          .error(function(){
            $scope.showErrorMesPopup('网络连接错误');
          });
      }
      else{
        $ionicNativeTransitions.stateGo('login', {}, {}, {
          "type": "slide",
          "direction": "up", // 'left|right|up|down', default 'left' (which is like 'next')
          "duration": 400, // in milliseconds (ms), default 400
        });
      }
    }
    $scope.showErrorMesPopup = function(title,cb) {
      document.addEventListener('deviceready',function(){
        $cordovaToast
          .show(title, 'short', 'center')
          .then(function(success) {

          }, function (error) {

          });
      });
    };
    $scope.check_online=function(){
      var token=$window.localStorage.accesstoken;
      //所有的chats查询在线情况
      if($scope.chats.length>0) {
        var ul = [];
        for (var i = 0; i < $scope.chats.length; i++) {
          var _u = {
            _id: $scope.chats[i].id.toString(),
          }
          ul.push(_u);
          /*
          iosocket.on('ansuserlist'+$scope.chats[i].id,function(obj){
            for(var i=0;i<$scope.chats.length;i++){
              if(obj._id.toString()===$scope.chats[i].id.toString()){
                $scope.chats[i].online=obj.online;
                $scope.$apply();
              }
            }
          });
          */
        }
        $usercenterData.check_online({token: token, array: ul})
          .success(function (data) {
            var onlineResult = data.users;
            for (var i = 0; i < $scope.chats.length; i++) {
              for (var j = 0; j < onlineResult.length; j++) {
                if ($scope.chats[i].id.toString() === onlineResult[j]._id) {
                  $scope.chats[i].online = onlineResult[j].online;
                }
              }
            }
          })
          .error(function (err) {

          })
      }
    }
  }]);
