/**
 * Created by liumeng on 2016/7/18.
 */
/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('chatControllers',[])
  .controller('ChatCtrl',['$scope','$rootScope','$ionicPlatform','$sce','$state','$stateParams','$loginData','$ionicLoading','$ionicPopup','$timeout','$window','$ionicHistory','$ionicScrollDelegate','$usercenterData','$mainData','$cordovaLocalNotification','$SFTools','$cordovaKeyboard','$location',function($scope,$rootScope,$ionicPlatform,$sce,$state,$stateParams,$loginData,$ionicLoading,$ionicPopup,$timeout,$window,$ionicHistory,$ionicScrollDelegate,$usercenterData,$mainData,$cordovaLocalNotification,$SFTools,$cordovaKeyboard,$location){
    var goLogin=function(){
      $state.go('login');
    }
    $scope.messages=[];
    $scope.sendMessage='';
    $scope.keyBoardStatus=false;
    $scope.scheduleSingleNotification = function (title,content) {
      $cordovaLocalNotification.schedule({
        id: 1,
        title: title,
        text: content,
        data: {
          customProperty: 'custom value'
        }
      }).then(function (result) {
        // ...
      });
    };
    $scope.$on('$ionicView.enter',function(){
      $SFTools.getToken(function(_token){
        $scope.setSaw(_token.userid);
      });
    });

    $scope.$on('$ionicView.loaded',function(){
      //alert('chat页面进入了');
      var registerKeyBoard='';
      //监听键盘弹出事件
      window.addEventListener('native.keyboardshow', keyboardShowHandler);

      function keyboardShowHandler(e){
        //alert('Keyboard height is: ' + e.keyboardHeight);
        $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();

        registerKeyBoard=$ionicPlatform.registerBackButtonAction(function(){
          $cordovaKeyboard.close();
        }, 550, [0]);
      }
      window.addEventListener('native.keyboardhide', keyboardHideHandler);

      function keyboardHideHandler(e){
        //alert('Keyboard height is: ' + e.keyboardHeight);
        //$scope.keyBoardStatus=false;
        $timeout(function(){
          registerKeyBoard();
        },500);

      }

      if($stateParams.userid){
        var userid=$stateParams.userid;
        $scope.touser={
          name:$stateParams.username
        }
        $SFTools.getToken(function(_token){
          //自己的身份信息
          $scope.fromuser={
            name:_token.name,
            _id:_token.userid,
            image:_token.image
          }
          //从sql获取
          $scope.getMessageFromSql(_token,userid);


          //确认对方的身份信息
          $usercenterData.user_by_id({token:_token.token,id:userid})
            .success(function(data){
              if(data.success===0){
                $scope.showErrorMesPopup('网络连接错误11111'+data,goLogin);
              }
              else{
                $scope.touser={
                  name:data.user.name,
                  _id:data.user._id,
                  image:data.user.image,
                  online:data.user.online
                }
                $scope.receiveMessage();
              }
            })
            .error(function(){
              $scope.showErrorMesPopup('网络连接错误2222');
            });

        });
      }
      else{
        $state.go('tab.main');
      }
    });
    $scope.$on('$ionicView.afterEnter',function(){
      $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
    });
    $scope.showErrorMesPopup = function(title,cb) {
      $SFTools.myToast(title);
    };
    $scope.getMessageFromSql=function(_token,touser){
      //alert('取得最近三天的聊天记录'+_token.userid+_token.token);
      document.addEventListener('deviceready', function() {
        //从sql读取今天并且没有查看过的所有信息
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
        db.executeSql("create table if not exists nosend(id,fromuser,touser,content,status)");
        var now=new Date();
        var DateSwap=new Date();
        DateSwap.setHours(0);
        DateSwap.setMinutes(0);
        DateSwap.setSeconds(0);
        var resultThreeDaysAgo=new Date(DateSwap.getTime()-2*24*3600*1000);
        var sqlStr='select fromuser,touser,content,createAt,id as status from chat'+
          ' where createAt>='+resultThreeDaysAgo.getTime()+' and'+
          ' (fromuser=\''+_token.userid+'\' and touser=\''+touser+'\''
          +' or touser=\''+_token.userid+'\' and fromuser=\''+touser+'\')'
          +' union'
          +' select fromuser,touser,content,id as createAt,status from nosend where status=1 and '
          +' touser=\''+touser+'\' and fromuser=\''+_token.userid+'\''
          +' order by createAt asc';
        db.transaction(function(tx){

          tx.executeSql(sqlStr,[],function(tx,rs){
            for(var i=0;i<rs.rows.length;i++){
              //按照时间段进行分组
              if($scope.messages.length>0){
                //和最后一个数组成员的createAt作比较，小于一分钟就同一组，大于一分钟就重新建立一个数组成员push进去
                //alert(rs.rows.item(i).createAt+'减去'+$scope.messages[$scope.messages.length-1].createAt+'等于'+rs.rows.item(i).createAt-$scope.messages[$scope.messages.length-1].createAt);
                if(rs.rows.item(i).createAt-$scope.messages[$scope.messages.length-1].createAt>TIME_SPACING*60*1000){
                  //说明间隔时间很长，要建立新的时间段
                  var _m;
                  if(_token.userid===rs.rows.item(i).fromuser){
                    _m={
                      type:'from',
                      image:_token.image,
                      userid:_token.userid,
                      username:_token.name,
                      mess:rs.rows.item(i).content,
                      createAt:rs.rows.item(i).createAt,
                      send:rs.rows.item(i).status.toString()==='1'?'sending':rs.rows.item(i).status.toString()
                    }
                  }
                  else{
                    _m={
                      type:'to',
                      image:touser.image,
                      username:touser.name,
                      userid:touser._id,
                      mess:rs.rows.item(i).content,
                      createAt:rs.rows.item(i).createAt,
                      send:rs.rows.item(i).status.toString()==='1'?'sending':rs.rows.item(i).status.toString()
                    }
                  }
                  var chatlist=[];
                  chatlist.push(_m);
                  var messageper={
                    createAt:rs.rows.item(i).createAt,
                    chatlist:chatlist
                  }
                  $scope.messages.push(messageper);
                }
                else{
                  //一个时间段的，
                  var _m;
                  if(_token.userid===rs.rows.item(i).fromuser){
                    _m={
                      type:'from',
                      image:_token.image,
                      username:_token.name,
                      userid:_token.userid,
                      mess:rs.rows.item(i).content,
                      createAt:rs.rows.item(i).createAt,
                      send:rs.rows.item(i).status.toString()==='1'?'sending':rs.rows.item(i).status.toString()
                    }
                  }
                  else{
                    _m={
                      type:'to',
                      image:touser.image,
                      username:touser.name,
                      userid:touser._id,
                      mess:rs.rows.item(i).content,
                      createAt:rs.rows.item(i).createAt,
                      send:rs.rows.item(i).status.toString()==='1'?'sending':rs.rows.item(i).status.toString()
                    }
                  }
                  $scope.messages[$scope.messages.length-1].chatlist.push(_m);
                }
              }
              else{
                var _m;
                if(_token.userid===rs.rows.item(0).fromuser){
                  _m={
                    type:'from',
                    image:_token.image,
                    username:_token.name,
                    userid:_token.userid,
                    mess:rs.rows.item(i).content,
                    createAt:rs.rows.item(i).createAt,
                    send:rs.rows.item(i).status.toString()==='1'?'sending':rs.rows.item(i).status.toString()
                  }
                }
                else{
                  _m={
                    type:'to',
                    image:touser.image,
                    username:touser.name,
                    userid:touser._id,
                    mess:rs.rows.item(i).content,
                    createAt:rs.rows.item(i).createAt,
                    send:rs.rows.item(i).status.toString()==='1'?'sending':rs.rows.item(i).status.toString()
                  }
                }
                var chatlist=[_m];
                var messageper={
                  createAt:rs.rows.item(i).createAt,
                  chatlist:chatlist
                }
                $scope.messages.push(messageper);
              }
            }
          });
        },function(tx,error){},
        function(){
          $scope.$apply();
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
        });

      });
    }
    $scope.send=function(){
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          var time=new Date();
          var timeid=time.getTime();
          var sendContent=$scope.sendMessage;
          iosocket.emit('private message', _token.userid, $stateParams.userid, sendContent,timeid);
          //加入发送超时模块,一分钟没收到反馈，就再次发送，一直循环，持续5次。如果网络恢复，也尝试发送
          var sendingObj=
          //超过五次，标识为发送不成功，再次发送需要用户确认


          //将信息存入未发表成功的信息表
          document.addEventListener('deviceready', function() {
            var db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
            // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
            db.executeSql('create table if not exists nosend(id,fromuser,touser,content,status)');
            db.transaction(function(tx){
              tx.executeSql('insert into nosend values(?,?,?,?,?)',[timeid,_token.userid,$stateParams.userid,sendContent,1]);
            },function(tx,error){

            },function(){

            });
          });

          //发送广播，用户发送信息了
          $rootScope.$broadcast('SendingMessage',{userid:$stateParams.userid,content:sendContent});
          document.addEventListener('deviceready', function() {
            var db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
            //main-message列表存入一条status=sending的消息
            var master = _token.userid;
            var relation_user = $stateParams.username;
            var relation_user_id = $stateParams.userid;
            var main_content = sendContent;
            var main_saw = 0;
            var main_status = 'sending';
            db.executeSql('insert into main_message values(?,?,?,?,?,?,?)', [master, relation_user, relation_user_id, main_content, timeid, main_saw, main_status]);
          });

          //实时显示
          var timenow=new Date();
          var _m={
            type:'from',
            userid:_token.userid,
            image:_token.image,
            username:_token.name,
            mess:$scope.sendMessage,
            createAt:timenow.getTime(),
            timeid:timeid,
            send:'sending'
          }
          if($scope.messages.length>0){
            var lastCreateAt=$scope.messages[$scope.messages.length-1].createAt;
            if(timenow.getTime()-lastCreateAt>TIME_SPACING*60*1000){
              //说明不在一个时间段
              var messageper={
                createAt:timenow.getTime(),
                chatlist:[_m]
              }
              $scope.messages.push(messageper);
            }
            else{
              //说明在一个时间段
              $scope.messages[$scope.messages.length-1].chatlist.push(_m);
            }
          }
          else{
            var messageper={
              createAt:timenow.gettime(),
              chatlist:[_m]
            }
            $scope.messages.push(messageper);
          }
          $scope.sendMessage = '';
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
          //$scope.$apply();
        }
      });
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
    $scope.receiveMessage=function(){
      $rootScope.$on('ReciveMessage',function(event,obj){
        //保存已经被main页面做了，所以实时显示即可
        if($stateParams.userid===obj.from._id){
          if($scope.messages.length>0){
            _m={
              type:'to',
              image:$scope.touser.image,
              username:$scope.touser.name,
              mess:obj.message.content,
              createAt:obj.message.meta.createAt
            }
            var timeMessage=new Date(obj.message.meta.createAt);
            var timeLast=$scope.messages[$scope.messages.length-1].createAt;
            if(timeMessage-timeLast>TIME_SPACING*60*1000){
              var messageper={
                createAt:timeMessage,
                chatlist:[_m]
              }
              $scope.messages.push(messageper);
            }
            else{
              $scope.messages[$scope.messages.length-1].chatlist.push(_m);
            }
          }
          else{
            _m={
              type:'to',
              image:$scope.touser.image,
              username:$scope.touser.name,
              mess:obj.message.content,
              createAt:obj.message.meta.createAt
            }
            var timeMessage=new Date(obj.message.meta.createAt);
            var messageper={
              createAt:timeMessage,
              chatlist:[_m]
            }
            $scope.messages.push(messageper);
          }
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
          $scope.$apply();
        }
        else{
          //说明不是这个人发的,发出通知
          $scope.scheduleSingleNotification(obj.from.name,obj.message.content);
        }

      })
      $rootScope.$on('ServerRecive'+$stateParams.userid,function(event,obj){
        // alert('接到了angularjs的广播，广播名称是'+'ServerRecive'+$stateParams.userid+'服务器说，我收到了，你做自己的处理吧'+obj.timeid+obj.from+obj.to+obj.message.content+'事件名称是');
        //服务器收到了，把nosend表的status置0，然后将信息存入chat表
        document.addEventListener('deviceready', function() {
          var db = null;
          db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
          db.transaction(function(tx){
            tx.executeSql('update nosend set status=? where id=? and fromuser=? and touser=?',[0,obj.timeid,obj.from,obj.to]);
            var createtime=new Date(obj.message.meta.createAt);
            tx.executeSql('insert into chat values(?,?,?,?,?,?)',[obj.message._id,obj.from,obj.to,obj.message.content,createtime.getTime(),1]);
          },function(tx,error){
            //alert('事务执行失败'+error);
          },function(){
            //alert('数据库操作成功');
            //服务器说：你发的我收到了。chat页面找到这条信息，然后把这条信息的send:sending属性去掉
            for(var i=0;i<$scope.messages.length;i++){
              for(var j=0;j<$scope.messages[i].chatlist.length;j++){
                //alert($scope.messages[i].chatlist[j].mess+'     '+$scope.messages[i].chatlist[j].timeid+'     '+obj.timeid+'       '+obj.message.content);
                if($scope.messages[i].chatlist[j].type==='from'&&$scope.messages[i].chatlist[j].userid===obj.from&&$scope.messages[i].chatlist[j].timeid===obj.timeid){
                  //说明这条信息是发送成功的那一条
                  //alert('chat页面符合条件，修改');
                  $scope.messages[i].chatlist[j].send='';
                  break;
                }
              }
            }
            $scope.$apply();
          });
        });
      });
    }
    $scope.goMain=function(){
      $state.go('tab.main');
    }
    $scope.setSaw=function(user){
      var userid=$stateParams.userid;
      //发送通知，告诉main页面，这些东西看过了。
      document.addEventListener('deviceready', function() {
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
        //chat全部saw置1   main的saw清0
        db.transaction(function(tx){
          tx.executeSql('update chat set saw=1 where fromuser=? and touser=? and saw=0',[userid,user]);
          tx.executeSql('update main_message set saw=0 where master=? and relation_user_id=?',[user,userid]);
        },function(tx,error){

        },function(){
          $rootScope.$broadcast('SawMessage',userid);
        })
      });
    }
  }]);
