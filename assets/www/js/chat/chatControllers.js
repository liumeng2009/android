/**
 * Created by liumeng on 2016/7/18.
 */
/**
 * Created by Administrator on 2016/6/27.
 */
var iosocket;
angular.module('chatControllers',[])
  .controller('ChatCtrl',['$scope','$rootScope','$sce','$state','$stateParams','$loginData','$ionicLoading','$ionicPopup','$timeout','$window','$ionicHistory','$ionicScrollDelegate','$usercenterData','$mainData','$cordovaLocalNotification',function($scope,$rootScope,$sce,$state,$stateParams,$loginData,$ionicLoading,$ionicPopup,$timeout,$window,$ionicHistory,$ionicScrollDelegate,$usercenterData,$mainData,$cordovaLocalNotification){
    var goLogin=function(){
      $state.go('login');
    }
    $scope.messages=[];
    $scope.fromuser={};
    $scope.touser={};
    $scope.sendMessage='';
    $scope.scheduleSingleNotification = function () {
      $cordovaLocalNotification.schedule({
        id: 1,
        title: '新消息',
        text: '这是一条新消息',
        data: {
          customProperty: 'custom value'
        }
      }).then(function (result) {
        // ...
      });
    };
    $scope.$on('$ionicView.afterEnter',function(){
      if($stateParams.to&&$stateParams.from){
        $scope.touser={
          name:$stateParams.to.name,
          _id:$stateParams.to._id
        };
        var token=$window.localStorage.accesstoken;

        $usercenterData.usercenter({token:token})
          .success(function(data){
            if(data.success===0){
              $scope.showErrorMesPopup('网络连接错误',goLogin);
            }
            else{
              $scope.fromuser={
                name:data.user.name,
                _id:data.user._id,
                image:data.user.image
              }
              $usercenterData.user_by_id({token:token,id:$stateParams.to._id})
                .success(function(data){
                  if(data.success===0){
                    $scope.showErrorMesPopup('网络连接错误',goLogin);
                  }
                  else{
                    $scope.touser={
                      name:data.user.name,
                      _id:data.user._id,
                      image:data.user.image,
                      online:data.user.online
                    }
                    //查看这个人的在线情况
                    //iosocket.emit('askuserlist',[$scope.touser._id]);

                    iosocket.on('ansuserlist'+$scope.touser._id.toString(),function(obj){
                        $scope.touser.online=obj.online;
                        $scope.$apply();
                    });


                    //加载聊天记录 有新纪录，就把新纪录全部加载完成
                    $mainData.not_read_list_to({token:token,fromid:$stateParams.to._id})
                      .success(function(data){
                        if(data.success===0){
                          $scope.showErrorMesPopup('网络连接错误',goLogin);
                        }
                        else{
                          // 没有新纪录，只加载12小时前的
                          $mainData.twelve_hours_ago({token:token,fromid:$stateParams.to._id})
                            .success(function(dataTw){
                              if(dataTw.success===0){
                                $scope.showErrorMesPopup('网络连接错误',goLogin);
                              }
                              else{
                                //将12小时前的信息先填入messages
                                if(dataTw.chats&&dataTw.chats.length>0){
                                  for(var i=0;i<dataTw.chats.length;i++){
                                    if(dataTw.chats[i].from._id.toString()===$stateParams.from._id.toString()){
                                      var _m={
                                        type:'from',
                                        image:dataTw.chats[i].from.image,
                                        username:dataTw.chats[i].from.name,
                                        mess:dataTw.chats[i].content,
                                        createAt:dataTw.chats[i].meta.createAt
                                      }
                                      $scope.messages.unshift(_m);
                                    }
                                    if(dataTw.chats[i].from._id.toString()===$stateParams.to._id.toString()){
                                      var _m={
                                        type:'to',
                                        image:dataTw.chats[i].from.image,
                                        username:dataTw.chats[i].from.name,
                                        mess:dataTw.chats[i].content,
                                        createAt:dataTw.chats[i].meta.createAt
                                      }
                                      $scope.messages.unshift(_m);
                                    }
                                  }
                                }
                                //再将新消息填入messages
                                if(data.chats&&data.chats.length>0){
                                  for(var i=0;i<data.chats.length;i++){
                                    var _m={
                                      type:'to',
                                      image:data.chats[i].from.image,
                                      username:data.chats[i].from.name,
                                      mess:data.chats[i].content,
                                      createAt:data.chats[i].meta.createAt
                                    }
                                    $scope.messages.push(_m);
                                  }
                                }
                                $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
                                //走到这里，说明，用户点进了chat页面，将所有的信息status设置为收到了1
                                iosocket.emit('usersaw',{from:$scope.touser._id,to:$scope.fromuser._id});
                                //iosocket.on('connect',function(){
                                iosocket.send('hi');
                                iosocket.on('from'+$scope.touser._id+'to'+$scope.fromuser._id,function(obj){
                                  var _m={
                                    type:'to',
                                    image:$scope.touser.image,
                                    username:$scope.touser.name,
                                    mess:obj.message,
                                    createAt:obj.createAt
                                  }
                                  $scope.messages.push(_m);
                                  $scope.$apply();
                                  $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();

                                  $scope.scheduleSingleNotification();



                                  //接到信息后，存入本地存储，用于main页面
                                  $scope.saveChat($scope.touser,obj.message,obj.createAt);
                                  iosocket.emit('usersaw',{from:$scope.touser._id,to:$scope.fromuser._id});
                                });
                                //});
                              }
                            })
                            .error(function(){
                              $scope.showErrorMesPopup('网络连接错误');
                            })
                        }
                      })
                      .error(function(){
                        $scope.showErrorMesPopup('网络连接错误');
                      });
                  }
                })
                .error(function(){
                  $scope.showErrorMesPopup('网络连接错误');
                });
            }}
          )
          .error(function(){
            $scope.showErrorMesPopup('网络连接错误');
          })
      }
      else{
        $state.go('tab.main');
      }
    });
    $scope.showErrorMesPopup = function(title,cb) {
      var myPopup = $ionicPopup.show({
        title: '<b>'+title+'</b>'
      });
      $timeout(function() {
        myPopup.close(); // 2秒后关闭
        if(cb)
          cb();
      }, 1000);
    };
    $scope.send=function(){
      var token=$window.localStorage.accesstoken;
      if($stateParams.from&&$stateParams.to) {
        if (token) {
          iosocket.emit('private message', $stateParams.from._id, $stateParams.to._id, $scope.sendMessage);
          var _m = {
            type: 'from',
            image: $scope.fromuser.image,
            username: $scope.fromuser.name,
            mess: $scope.sendMessage,
            createAt: Date.now()
          };
          $scope.messages.push(_m);
          var messs = $scope.sendMessage;
          $scope.sendMessage = '';
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
          $scope.saveChat($scope.touser, messs, _m.createAt);
        }
        else {
          $state.go('login');
        }
      }
      else{
        $state.go('tab.main');
      }
    };
    $scope.saveChat=function(user,content,cdate){
      //发送完毕后，将对象存入本地存储，体现在main页面
      var chats = $window.localStorage[$stateParams.from._id]? JSON.parse($window.localStorage[$stateParams.from._id]):[];
      if(chats.length===0) {
        //说明没有和这个人说过，需要存入新的对象
        var chat = {
          id: user._id,
          name: user.name,
          image: user.image,
          content: [content],
          createAt: cdate,
          new:false
        }
        chats.push(chat);
        $window.localStorage[$stateParams.from._id] = JSON.stringify(chats);
      }
      else{
        for (var i = 0; i < chats.length; i++) {
          if (chats[i].id === user._id) {
            chats[i].content = [content];
            chats[i].createAt=cdate;
            chats[i].new=false;
            $window.localStorage[$stateParams.from._id]= JSON.stringify(chats);
            break;
          }
          else if(i===chats.length-1){
            var chat={
              id:user._id,
              name:user.name,
              image:user.image,
              content:content,
              createAt:cdate,
              new:false
            }
            chats.push(chat);
            break;
            //i++;
            $window.localStorage[$stateParams.from._id]= JSON.stringify(chats);
          }
        }
      }

    }
    $rootScope.$on('$stateChangeStart',function(){
      //iosocket.emit('logout',$stateParams.from._id);
    });
    $scope.goMain=function(){
      $state.go('tab.main');
    }
  }]);
