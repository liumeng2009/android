/**
 * Created by liumeng on 2016/7/18.
 */
/**
 * Created by Administrator on 2016/6/27.
 */
angular.module('chatControllers',[])
  .controller('ChatCtrl',['$scope','$rootScope','$ionicPlatform','$sce','$state','$stateParams','$loginData','$ionicLoading','$ionicPopup','$timeout','$window','$ionicHistory','$ionicScrollDelegate','$usercenterData','$mainData','$cordovaLocalNotification','$SFTools','$cordovaKeyboard','$location','$ionicNativeTransitions','$cordovaImagePicker','$cordovaFileTransfer',function($scope,$rootScope,$ionicPlatform,$sce,$state,$stateParams,$loginData,$ionicLoading,$ionicPopup,$timeout,$window,$ionicHistory,$ionicScrollDelegate,$usercenterData,$mainData,$cordovaLocalNotification,$SFTools,$cordovaKeyboard,$location,$ionicNativeTransitions,$cordovaImagePicker,$cordovaFileTransfer){
    var goLogin=function(){
      $state.go('login');
    }
    $scope.messages=[];
    $scope.send={};
    $scope.popMessage={
      show:false
    }
    $scope.contentBottom=46;
    $scope.keyBoardStatus=false;

    $scope.$on('$ionicView.loaded',function(){
      //处理键盘事件
      var registerKeyBoard='';
      $scope.messages=[];
      //监听键盘弹出事件
      window.addEventListener('native.keyboardshow', keyboardShowHandler);

      function keyboardShowHandler(e){
        //alert('Keyboard height is: ' + e.keyboardHeight);
        $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
        $scope.send.showPlusMedia=false;
        //注册后退键
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
      //处理键盘事件结束

      //聊天输入框的宽度和app外部参考层的宽度一致。这是一个暂时的解决方法，最好应该自己做一个富文本显示区域
      $('#testTextWidth').width($('#outgoingChatMessage').width());

      $scope.send={
        showSendMedia:true,
        showSendButton:false,
        sendMessage:'',
        boxHeight:37,
        boxLineHeight:37,
        contentBottom:'auto',
        showPlusMedia:false
      };

      var userid=$stateParams.userid;
      var username=$stateParams.username;

      if(userid){
        $scope.touser={
          name:username,
          _id:userid
        }
        $SFTools.getToken(function(_token){
          $scope.fromuser={
            name:_token.name,
            _id:_token.userid,
            image:_token.image
          }

          //alert('加载本地数据');
          $scope.getMessageFromSql(_token,userid);
          //用户看过了
          $scope.setSaw(_token.userid,userid);

          //消息发送失败
          $scope.setSendFailed();

          $scope.changeMyImageListener(_token);

          /*
          $rootScope.$on('socketReconnect',function(event,obj){
            alert('和聊天服务器重新连接了，同步服务器消息');
            $SFTools.getToken(function(token){
              $scope.initMessageFromServer(token);
            });
          });
          */
          //确认对方的身份信息
          $usercenterData.user_by_id({token:_token.token,id:userid})
            .success(function(data){
              if(data.success===0){
                $SFTools.myToast(data.msg);
                $state.go('login');
              }
              else{
                //alert(JSON.stringify(data));
                //alert($scope.touser.imageurl+'和'+data.user.imageUrl);
                if($scope.touser.imageurl!=data.user.imageUrl){
                  //说明头像变化了
                  $scope.updateUserImage(_token,data.user);
                }

                $scope.touser.image=data.user.image;
                $scope.receiveMessagePerson(userid);
                $scope.NoReadListener(_token);
              }
            })
            .error(function(){
              $SFTools.myToast(config.userPrompt.ajaxError);
            });
        });
      }
      else{
        $state.go('main');
      }
    });
    $scope.$on('$ionicView.afterEnter',function(){
      $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
    });
    $scope.updateUserImage=function(_token,user){
      document.addEventListener('deviceready',function(){
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
        db.executeSql('update userinfo set image=?,imageurl=? where id=?',[user.image,user.imageUrl,user._id],function(){
          //alert('数据库更新成功，视图更新');
          for(var i=0;i<$scope.messages.length;i++){
            for(var j=0;j<$scope.messages[i].chatlist.length;j++){
              if($scope.messages[i].chatlist[j].type=='to'){
                $scope.messages[i].chatlist[j].image=user.image;
              }
            }
          }
          //main页面也需要同步更新
          $rootScope.$broadcast('userImageChange',{userid:user._id,image:user.image});
        });
      });
    }
    $scope.getMessageFromSql=function(_token,touser){
      //alert('取得最近三天的聊天记录'+_token.userid+_token.token);
      document.addEventListener('deviceready', function() {
        //从sql读取今天并且没有查看过的所有信息
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
        var sqlChatAndNoSend='select * from ( select fromuser,touser,content,createAt,id as status,image,imageurl,imageuri,imagewidth,imageheight from chat'+
          ' where '+
          ' (fromuser=\''+_token.userid+'\' and touser=\''+touser+'\''
          +' or touser=\''+_token.userid+'\' and fromuser=\''+touser+'\')'
          +' union '
          +' select fromuser,touser,content,id as createAt,status,image,imageurl,imageuri,imagewidth,imageheight from nosend where status=1 and '
          +' touser=\''+touser+'\' and fromuser=\''+_token.userid+'\''
          +' ) order by createAt desc limit 20';
        console.log('这个sql语句是：'+sqlChatAndNoSend);

        db.transaction(function(tx){
          tx.executeSql('select image,imageurl from userinfo where id=?',[touser],function(tx,rs){
            var touserimage='';
            var touserimageurl='';
            if(rs.rows.item(0)&&rs.rows.item(0).image){
              touserimage=rs.rows.item(0).image;
              touserimageurl=rs.rows.item(0).imageurl;
            }
            else{

            }
            //alert('聊天对象的头像是：'+touserimageurl);
            $scope.touser.image=touserimage;
            $scope.touser.imageurl=touserimageurl;
            tx.executeSql(sqlChatAndNoSend,[],function(tx,rs){
              for(var i=0;i<rs.rows.length;i++){
                var stayInRetryList=$scope.checkInRetry(rs.rows.item(i).createAt);
                //按照时间段进行分组
                if($scope.messages.length>0){
                  //和最后一个数组成员的createAt作比较，小于一分钟就同一组，大于一分钟就重新建立一个数组成员push进去
                  //console.log(rs.rows.item(i).createAt+'减去'+$scope.messages[0].createAt+'等于'+ parseInt(rs.rows.item(i).createAt)- parseInt($scope.messages[0].createAt));
                  if($scope.messages[0].createAt-rs.rows.item(i).createAt>config.timeSpacing*60*1000){
                    //说明间隔时间很长，要建立新的时间段
                    var _m;
                    if(_token.userid===rs.rows.item(i).fromuser){
                      _m={
                        id:rs.rows.item(i).id,
                        type:'from',
                        image:_token.image,
                        userid:_token.userid,
                        username:_token.name,
                        mess:rs.rows.item(i).content,
                        createAt:rs.rows.item(i).createAt,
                        send:rs.rows.item(i).status.toString()==='1'?(stayInRetryList?'sending':'failed'):rs.rows.item(i).status.toString(),
                        messImage:rs.rows.item(i).image,
                        messImageUri:rs.rows.item(i).imageuri,
                        messImageUrl:rs.rows.item(i).imageurl,
                        messImageWidth:rs.rows.item(i).imagewidth,
                        messImageHeight:rs.rows.item(i).imageheight,
                        //数据库中还会有发送失败的原因
                        errorReason:rs.rows.item(i).image_send_error_reason
                      }
                    }
                    else{
                      _m={
                        id:rs.rows.item(i).id,
                        type:'to',
                        image:$scope.touser.image,
                        username:$scope.touser.name,
                        userid:$scope.touser._id,
                        mess:rs.rows.item(i).content,
                        createAt:rs.rows.item(i).createAt,
                        send:rs.rows.item(i).status.toString(),
                        messImage:rs.rows.item(i).image,
                        messImageUri:rs.rows.item(i).imageuri,
                        messImageUrl:rs.rows.item(i).imageurl,
                        messImageWidth:rs.rows.item(i).imagewidth,
                        messImageHeight:rs.rows.item(i).imageheight
                      }
                    }
                    var chatlist=[];
                    chatlist.unshift(_m);
                    var messageper={
                      createAt:rs.rows.item(i).createAt,
                      chatlist:chatlist
                    }
                    $scope.messages.unshift(messageper);
                  }
                  else{
                    //一个时间段的，
                    var _m;
                    if(_token.userid===rs.rows.item(i).fromuser){
                      _m={
                        id:rs.rows.item(i).id,
                        type:'from',
                        image:_token.image,
                        username:_token.name,
                        userid:_token.userid,
                        mess:rs.rows.item(i).content,
                        createAt:rs.rows.item(i).createAt,
                        send:rs.rows.item(i).status.toString()==='1'?(stayInRetryList?'sending':'failed'):rs.rows.item(i).status.toString(),
                        messImage:rs.rows.item(i).image,
                        messImageUri:rs.rows.item(i).imageuri,
                        messImageUrl:rs.rows.item(i).imageurl,
                        messImageWidth:rs.rows.item(i).imagewidth,
                        messImageHeight:rs.rows.item(i).imageheight,
                        //数据库中还会有发送失败的原因
                        errorReason:rs.rows.item(i).image_send_error_reason
                      }
                    }
                    else{
                      _m={
                        id:rs.rows.item(i).id,
                        type:'to',
                        image:$scope.touser.image,
                        username:$scope.touser.name,
                        userid:$scope.touser._id,
                        mess:rs.rows.item(i).content,
                        createAt:rs.rows.item(i).createAt,
                        send:rs.rows.item(i).status.toString(),
                        messImage:rs.rows.item(i).image,
                        messImageUri:rs.rows.item(i).imageuri,
                        messImageUrl:rs.rows.item(i).imageurl,
                        messImageWidth:rs.rows.item(i).imagewidth,
                        messImageHeight:rs.rows.item(i).imageheight
                      }
                    }
                    $scope.messages[0].chatlist.unshift(_m);
                    $scope.messages[0].createAt=rs.rows.item(i).createAt;
                  }
                }
                else{
                  var _m;
                  if(_token.userid===rs.rows.item(0).fromuser){
                    _m={
                      id:rs.rows.item(i).id,
                      type:'from',
                      image:_token.image,
                      username:_token.name,
                      userid:_token.userid,
                      mess:rs.rows.item(i).content,
                      createAt:rs.rows.item(i).createAt,
                      send:rs.rows.item(i).status.toString()==='1'?(stayInRetryList?'sending':'failed'):rs.rows.item(i).status.toString(),
                      messImage:rs.rows.item(i).image,
                      messImageUri:rs.rows.item(i).imageuri,
                      messImageUrl:rs.rows.item(i).imageurl,
                      messImageWidth:rs.rows.item(i).imagewidth,
                      messImageHeight:rs.rows.item(i).imageheight,
                      //数据库中还会有发送失败的原因
                      errorReason:rs.rows.item(i).image_send_error_reason
                    }
                  }
                  else{
                    _m={
                      id:rs.rows.item(i).id,
                      type:'to',
                      image:$scope.touser.image,
                      username:$scope.touser.name,
                      userid:$scope.touser._id,
                      mess:rs.rows.item(i).content,
                      createAt:rs.rows.item(i).createAt,
                      send:rs.rows.item(i).status.toString(),
                      messImage:rs.rows.item(i).image,
                      messImageUri:rs.rows.item(i).imageuri,
                      messImageUrl:rs.rows.item(i).imageurl,
                      messImageWidth:rs.rows.item(i).imagewidth,
                      messImageHeight:rs.rows.item(i).imageheight
                    }
                  }
                  var chatlist=[_m];
                  var messageper={
                    createAt:rs.rows.item(i).createAt,
                    chatlist:chatlist
                  }
                  $scope.messages.unshift(messageper);
                }
              }
            });
          });


        },function(tx,error){
        },
        function(){
          //alert('本地数据加载完毕');
          $scope.$apply();
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
        });

      });
    }
    $scope.checkInRetry=function(id){
      for(var i=0;i<$rootScope.retryList.length;i++){
        //console.log($rootScope.retryList[i].startTime+'        '+id);
        if($rootScope.retryList[i].startTime===id){
          return true;
        }
        else{
          if(i===$rootScope.retryList.length-1){
            return false;
          }
        }
      }
    }
    //以下两个方法，一个是发送，一个是重新发送。视图表现会有区别。
    $scope.sendTo=function(){
      //send之后，加入retryList
      //各属性描述：   发给谁的  循环次数  用户点击发送的时间  重试倒计时  在视图上的对象实例 一分钟重试一次，如果收到了服务器的回应，说明收到了，就从数组内删除
      // retry的结构是 .touser   .loop     .startTime          .retryTime  viewObject
      //alert('发送的消息是：'+$scope.send.sendMessage);
      if($scope.send.sendMessage==undefined||$scope.send.sendMessage==""){
        return;
      }
      console.log('和我聊天的人是：'+$scope.touser._id+$scope.touser.name);
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          var time=new Date();
          var timeid=time.getTime();
          var sendContent=$scope.send.sendMessage;
          //实时显示
          //console.log('实时显示');
          var timenow=new Date();
          var _m={
            type:'from',
            userid:_token.userid,
            image:_token.image,
            username:_token.name,
            mess:$scope.send.sendMessage,
            createAt:timenow.getTime(),
            timeid:timeid,
            send:'sending'
          }
          if($scope.messages.length>0){
            //console.log('聊天信息不是0'+$scope.messages[$scope.messages.length-1].createAt);
            var lastCreateAt=$scope.messages[$scope.messages.length-1].createAt;
            if(timenow.getTime()-lastCreateAt>config.timeSpacing*60*1000){
              //console.log('很新的一条，并且是新的时间段');
              //说明不在一个时间段
              var messageper={
                createAt:timenow.getTime(),
                chatlist:[_m]
              }
              $scope.messages.push(messageper);
            }
            else{
              //说明在一个时间段
              //console.log('很新的一条，不是新的时间段');
              $scope.messages[$scope.messages.length-1].chatlist.push(_m);
            }
          }
          else{
            var messageper={
              createAt:timenow.getTime(),
              chatlist:[_m]
            }
            //console.log('我主动和人家说话的'+JSON.stringify(messageper));
            $scope.messages.push(messageper);
            $scope.$apply();
          }
          //console.log('send的消息是：'+$scope.messages[$scope.messages.length-1].chatlist[$scope.messages[$scope.messages.length-1].chatlist.length-1].mess);
          $scope.send.sendMessage = '';
          $scope.send.boxHeight=37;
          $scope.send.boxLineHeight=37;
          $scope.contentBottom=46;
          $scope.send.areaPosition='center';
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
          $scope.$apply();
          //使用socket自带的buffer机制，放进数组后，监视时间，如果超过一定时间，就认为发送失败，改变视图，同时将socket对象中的对应buffer删除。
          var retryObj={
            touser:$scope.touser._id,
            loop:0,
            startTime:timeid
          };
          //console.log('加入重试循环');
          $rootScope.retryList.push(retryObj);
          ////将这条发送消息的视图实例，赋值到重试列表中.
          retryObj.viewObject=_m;
          //如果send的人不在userinfo表中，就存一下
          $usercenterData.user_by_id({token:_token.token,id:$scope.touser._id})
            .success(function(data){
              //alert(JSON.stringify(data));
              //成功后，将用户信息直接插入userinfo表
              document.addEventListener('deviceready', function() {
                var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
                // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
                db.transaction(function(tx){
                  tx.executeSql('insert into userinfo values(?,?,?,?,?)',[data.user._id,data.user.name,data.user.image,data.user.imageUrl,1]);
                },function(error){
                  console.log(error);
                },function(){
                });
              });
            })
            .error(function(){
              $SFTools.myToast(config.userPrompt.ajaxError);
          });

          //将信息存入未发表成功的信息表,
          document.addEventListener('deviceready', function() {
            console.log('存nosend');
            var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
            // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
            db.transaction(function(tx){
              tx.executeSql('create table if not exists nosend(id,fromuser,touser,content,status,imageuri,image,imageurl,image_send_error_reason)');
              //图片的情况下，存uri和base64编码
              //console.log(timeid+_token.userid+$scope.touser._id+sendContent);
              tx.executeSql('insert into nosend values(?,?,?,?,?,?,?,?,?)',[timeid,_token.userid,$scope.touser._id,sendContent,1,'','','','']);
            },function(error){
              console.log(error);
            },function(){
            });
          });

          //发送广播，用户发送信息了,main页面可以接收，改变自己的视图
          //alert('发送消息的通知'+sendContent+JSON.stringify({userid:$scope.touser._id,content:sendContent,timeid:timeid,username:$scope.touser.name}));
          //$rootScope.$broadcast('aaa');
          //alert('发送sending通知'+$scope.touser._id+sendContent+timeid+$scope.touser.name+_token.userid+$scope.touser._id+ sendContent+timeid+_token.deviceid);
          $rootScope.$broadcast('SendingMessage',{userid:$scope.touser._id,content:sendContent,timeid:timeid,username:$scope.touser.name});
          //$rootScope.$broadcast('SendingMessagee',5);
          //发送消息
          //alert('发送消息'+_token.userid+ $scope.touser._id+ sendContent+timeid+_token.deviceid+JSON.stringify(_message));
          iosocket.emit('private message', _token.userid, $scope.touser._id, sendContent,timeid,_token.deviceid,false);

        }
      });
    };
    $scope.sendWithAugs=function(message){
      //send之后，加入retryList
      //各属性描述：   发给谁的  循环次数  用户点击发送的时间  重试倒计时  在视图上的对象实例 一分钟重试一次，如果收到了服务器的回应，说明收到了，就从数组内删除
      // retry的结构是 .touser   .loop     .startTime          .retryTime  viewObject
      //if(messagecontent){
      //  return;
      //}
      console.log('和我聊天的人是：'+$scope.touser._id+$scope.touser.name+JSON.stringify(message));
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          var time=new Date();
          var timeid=time.getTime();
          var sendContent=message.mess;

          //去掉旧视图
          //遍历message只能...
          for(var i=0;i<$scope.messages.length;i++){
            for(var j=0;j<$scope.messages[i].chatlist.length;j++){
              if($scope.messages[i].chatlist[j].createAt===message.createAt){
                //删除掉这个视图
                $scope.messages[i].chatlist.splice(j,1);
                //如果这个视图被删除后，如果他的chatlist空了，那么这个message也删除掉
                if($scope.messages[i].chatlist.length==0){
                  $scope.messages.splice(i,1);
                }
                break;
              }
            }
          }

          //实时显示新视图
          console.log('实时显示');
          var timenow=new Date();
          var _m={
            type:'from',
            userid:_token.userid,
            image:_token.image,
            username:_token.name,
            mess:message.mess,
            createAt:timenow.getTime(),
            timeid:timeid,
            send:'sending'
          }
          if($scope.messages.length>0){
            console.log('聊天信息不是0'+$scope.messages[$scope.messages.length-1].createAt);
            var lastCreateAt=$scope.messages[$scope.messages.length-1].createAt;
            if(timenow.getTime()-lastCreateAt>config.timeSpacing*60*1000){
              console.log('很新的一条，并且是新的时间段');
              //说明不在一个时间段
              var messageper={
                createAt:timenow.getTime(),
                chatlist:[_m]
              }
              $scope.messages.push(messageper);
            }
            else{
              //说明在一个时间段
              console.log('很新的一条，不是新的时间段');
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
          console.log('send的消息是：'+$scope.messages[$scope.messages.length-1].chatlist[$scope.messages[$scope.messages.length-1].chatlist.length-1].mess);
          //$scope.send.sendMessage = '';
          //$scope.send.boxHeight=40;
          //$scope.send.boxLineHeight=40;
          //$scope.contentBottom=52;
          //$scope.send.areaPosition='center';
          $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
          $scope.$apply();
          //加入发送超时模块,一分钟没收到反馈，就再次发送，一直循环，持续5次。如果网络恢复，也尝试发送
          //超过五次，标识为发送不成功，再次发送需要用户确认
          //var retryObj={
          //  touser:$scope.touser._id,
          //  loop:0,
          //  startTime:timeid,
          //  retryTime:0
          //};
          //console.log('加入重试循环');
          //$rootScope.retryList.push(retryObj);
          ////将这条发送消息的视图实例，赋值到重试列表中.
          //retryObj.viewObject=_m;


          //将信息存入未发表成功的信息表
          document.addEventListener('deviceready', function() {
            var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
            // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
            db.executeSql('create table if not exists nosend(id,fromuser,touser,content,status)');
            db.transaction(function(tx){
              //alert('我发信息给'+$scope.touser._id);
              tx.executeSql('delete from nosend where id=?',[message.createAt]);
              tx.executeSql('insert into nosend values(?,?,?,?,?)',[timeid,_token.userid,$scope.touser._id,sendContent,1]);
            },function(tx,error){
              console.log(tx+error);
            },function(){
              //alert('插入nosend成功');
            });
          });

          //发送广播，用户发送信息了,main页面可以接收，改变自己的视图
          //alert('发送消息的通知'+sendContent);
          $rootScope.$broadcast('SendingMessage',{userid:$scope.touser._id,content:sendContent,timeid:timeid,username:$scope.touser.name,image:$scope.touser.image});

          //发送消息
          console.log('发送消息');
          iosocket.emit('private message', _token.userid, $scope.touser._id, sendContent,timeid,_token.deviceid);

        }
      });
    }
    $scope.enterToSend=function(e){
      //var keycode = window.event?e.keyCode:e.which;
      //console.log('点击到了'+keycode);
      //if(keycode==13){
      //  //$scope.myClass = 'green';
      //  $scope.sendTo();
      //}
    }
    $scope.receiveMessagePerson=function(userid){
      // $scope.chatBroadCastListener=
      var recv=$rootScope.$on('ReciveMessage',function(event,obj){
        //保存已经被main页面做了，所以实时显示即可
        //alert('嘿嘿'+JSON.stringify(obj.message));
        if(userid===obj.from._id){
          if($scope.messages.length>0){
            _m={
              type:'to',
              image:$scope.touser.image,
              username:$scope.touser.name,
              mess:obj.message.content,
              createAt:obj.message.meta.createAt,
              messImage:obj.message.imagebase,
              //messImageUri:obj.message.imageuri,
              messImageUrl:obj.message.imageurl,
              messImageWidth:obj.message.imagewidth,
              messImageHeight:obj.message.imageheight
            }
            var timeMessage=new Date(obj.message.meta.createAt);
            var timeLast=$scope.messages[$scope.messages.length-1].createAt;
            if(timeMessage-timeLast>config.timeSpacing*60*1000){
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
              createAt:obj.message.meta.createAt,
              messImage:obj.message.imagebase,
              //messImageUri:obj.message.imageuri,
              messImageUrl:obj.message.imageurl,
              messImageWidth:obj.message.imagewidth,
              messImageHeight:obj.message.imageheight
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
          //说明不是这个人发的,做一个浮动卡片，从上面
          //$scope.scheduleSingleNotification(obj.from.name,obj.message.content);
          $scope.popMessage.show=true;
          $scope.popMessage.name=obj.from.name;
          $scope.popMessage.message=obj.message.content;
          $scope.$apply();
          $timeout(function(){
            $scope.popMessage.show=false;
          },2000);
          console.log('接到了另一个人的消息'+obj.from.name+obj.message.content);
          //铃声

        }
      })
      //console.log('接收'+userid);
      var recvP=$rootScope.$on('ServerRecive'+userid,function(event,obj){
        console.log('最后一条信息内容是：'+$scope.messages[$scope.messages.length-1].chatlist[$scope.messages[$scope.messages.length-1].chatlist.length-1].mess);
        console.log(JSON.stringify($scope.messages));
        console.log(JSON.stringify($scope.messages[0]));
        //alert('接到了angularjs的广播，广播名称是'+'ServerRecive 服务器说，我收到了，你做自己的处理吧'+obj.timeid+obj.from+obj.to+obj.message.content+'事件名称是');
        //服务器收到了，把nosend表的status置0，然后将信息存入chat表
        console.log('chat页面也收到了通知'+JSON.stringify(obj));
        //修改视图
        for(var i=0;i<$scope.messages.length;i++){
          for(var j=0;j<$scope.messages[i].chatlist.length;j++){
            console.log(i+'    '+j);
            console.log($scope.messages[i].chatlist[j].mess);
            //console.log('经常未定义的对象是：'+JSON.stringify($scope.messages[i].chatlist[j])+ $scope.messages[i].chatlist[j].userid+'     '+obj.from+'     '+$scope.messages[i].chatlist[j].timeid+'     '+obj.timeid);
            if($scope.messages[i].chatlist[j].type==='from'&&$scope.messages[i].chatlist[j].userid===obj.from&&$scope.messages[i].chatlist[j].timeid===obj.timeid){
              //说明这条信息是发送成功的那一条
              console.log('chat页面符合条件，修改');
              $scope.messages[i].chatlist[j].send='';
              break;
            }
          }
        }

        for(var k=0;k<$rootScope.retryList.length;k++){
          if(obj.timeid===$rootScope.retryList[k].startTime&&obj.to===$rootScope.retryList[k].touser){
            console.log('客户端收到了，不用再retry了');
            $rootScope.retryList.splice(k,1);
            break;
          }
        }
        $scope.$apply();
        //修改sql
        document.addEventListener('deviceready', function() {
          var db = null;
          db = window.sqlitePlugin.openDatabase({name: obj.from+'.db3', location: 'default'});
          db.transaction(function(tx){
            console.log('发送成功了，修改nosend表的标志位'+JSON.stringify(obj));
            tx.executeSql('update nosend set status=? where id=? and fromuser=? and touser=?',[0,obj.timeid,obj.from,obj.to]);
            var createtime=new Date(obj.message.meta.createAt);
            tx.executeSql('insert into chat values(?,?,?,?,?,?,?,?,?,?,?,?)',[obj.message._id,obj.from,obj.to,obj.message.content,createtime.getTime(),1,1,obj.message.imagebase,obj.message.imagaurl,'',obj.message.imagewidth,obj.message.imageheight]);
          },function(tx,error){
            //alert('事务执行失败'+error);
          },function(){
            //alert('数据库操作成功');
            //服务器说：你发的我收到了。chat页面找到这条信息，然后把这条信息的send:sending属性去掉
            //console.log('客户端收到了回执'+$scope.messages.length);
          });
        });
      });

      $scope.$on('$destroy',function(){
        recv();
        recvP();
      });
    }
    $scope.goMain=function(){
      $ionicNativeTransitions.stateGo('tab.main', {}, {}, {
        "type": "slide",
        "direction": "right", // 'left|right|up|down', default 'left' (which is like 'next')
        "duration": 200, // in milliseconds (ms), default 400
      });
    }
    $scope.setSaw=function(userid,touser){
      //发送通知，告诉main页面，这些东西看过了。
      document.addEventListener('deviceready', function() {
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: userid+'.db3', location: 'default'});
        //chat全部saw置1   main的saw清0
        db.transaction(function(tx){
          tx.executeSql('update chat set saw=1 where fromuser=? and touser=? and saw=0',[touser,userid]);
          tx.executeSql('update main_message set saw=0 where master=? and relation_user_id=?',[userid,touser]);
        },function(error){
        },function(){
          $rootScope.$broadcast('SawMessage',touser);
        })
      });
    }
    $scope.setSendFailed=function(){
      var sFailed=$rootScope.$on('SendFailed',function(event,obj){
        console.log(JSON.stringify(obj)+'发送失败了,chat页面改变视图');
        for(var i=$scope.messages.length-1;i>-1;i--){
          for(var j=$scope.messages[i].chatlist.length-1;j>-1;j--){
            console.log('debug::::::'+$scope.messages[i].chatlist[j].timeid+obj.startTime+$scope.touser._id+obj.touser);
            if($scope.messages[i].chatlist[j].timeid===obj.startTime&&$scope.touser._id===obj.touser){
              $scope.messages[i].chatlist[j].send='failed';
              break;
            }
          }
        }
      });
      $scope.$on('$destroy',function(){
        sFailed();
      });
    }
    $scope.NoReadListener=function(token){
      var noread=$rootScope.$on('ReceiveNoRead',function(event,obj){
        console.log('chat页面收到了服务器同步的信息，同时开始同步chat页面。');
        $scope.receiveMessagePerson(token.userid);
        //$scope.getMessageFromSql(token,$scope.touser.userid);
        //alert(JSON.stringify(obj.chatArray));
        //这里确定一种情况，就是，未读信息一定会在已有信息之后，不存在中途插入的情况。
        /*
        var chats=obj.chatArray;
        console.log(JSON.stringify(chats));
        for(var i=0;i<chats.length;i++){
          if(chats[i].fromuser=$scope.touser){
            //是和这个人聊天
            if($scope.messages.length===0){
              var chatobj={
                type:'from',
                image:token.image,
                username:token.name,
                userid:token.userid,
                mess:chats[i].content,
                createAt:chats[i].createAt,
                send:1
              };
              //循环检查，它应该在哪个message区域
              if($scope.messages.length===0){
                var messagesObj={
                  createAt:chats[i].createAt,
                  chatlist:[chatobj]
                }
                $scope.messages.push(messagesObj);
              }
              else{
                for(var m=0;m<$scope.messages.length;m++){
                  //说明，这条未读信息在当前所有messages信息之前，单独给他建立一个区块。无论他离第一条信息的时间有多靠近。
                  if(chats[i].createAt<$scope.messages[m].createAt&&m===0){
                    var messagesObj={
                      createAt:chats[i].createAt,
                      chatlist:[chatobj]
                    }
                    $scope.messages.unshift(messagesObj);
                    break;
                  }
                  //在m和m+1之间的情况
                  else if($scope.messages[m+1]&&$scope.messages[m].createAt<chats[i].createAt&&$scope.messages[m+1].createAt>=chats[i].createAt){

                  }
                  //在最后的情况
                  else{
                    var lastChatListIdx=$scope.messages[m].chatlist.length;
                    if(chat[i].createAt-$scope.messages[m].chatlist[lastChatListIdx-1].createAt>config.timeSpacing*60*1000){
                      //说明是最新的一条，且在新的区域内
                      var messageobj={
                        createAt:chats[i].createAt,
                        chatlist:[chatobj]
                      };
                      $scope.messages.push(messagesObj);
                    }
                    else{
                      //说明和最后一个时间在一起

                    }
                  }
                }
              }
            }
            else{

            }
          }
        }
        */
      });
      $scope.$on('$destroy',function(){
        noread();
      });
    }
    $scope.changeMyImageListener=function(token){
      var changeMyImage=$rootScope.$on('changeMyImage',function(event,obj){
        alert('chat页面修改自己的头像');
        var image=obj;
        for(var i=0;i<$scope.messages.length;i++){
          for(var j=0;j<$scope.messages[i].chatlist.length;j++){
            if($scope.messages[i].chatlist[j].type=='from'){
              $scope.messages[i].chatlist[j].image=image;
            }
          }
        }
      });
      $scope.$on('$destroy',function(){
        changeMyImage();
      });
    }
    $scope.clickRetry=function(message){
      //alert(JSON.stringify(message));
      var confirmPopup = $ionicPopup.confirm({
        title: '确认',
        template: '重新发送这条信息吗?',
        cancelText: '取消', // String (默认: 'Cancel')。一个取消按钮的文字。
        okText: '确认', // String (默认: 'OK')。OK按钮的文字。
      });
      confirmPopup.then(function(res) {
        if(res) {
          //console.log('You are sure');
          $scope.sendWithAugs(message);
        } else {

          //console.log('You are not sure');
        }
      });
    }
    //输入框的处理
    $scope.checkHeight=function(){
      $('#testTextWidth').text($scope.send.sendMessage);
      var OutDivheight=$('#testTextWidth').height();
      var heightIndex=parseInt(OutDivheight/25)-1;
      if(heightIndex<1){
        $scope.send.boxHeight=37;
        $scope.send.boxLineHeight=37;
        $scope.contentBottom=46;
        $scope.send.areaPosition='center';
      }
      else if(heightIndex===1){
        $scope.send.boxHeight=50;
        $scope.send.boxLineHeight=25;
        $scope.contentBottom=58;
        $scope.send.areaPosition='flex-end';
      }
      else if(heightIndex===2){
        $scope.send.boxHeight=25*(heightIndex+1);
        $scope.send.boxLineHeight=25;
        $scope.contentBottom=83;
        $scope.send.areaPosition='flex-end';
      }
      else{
        $scope.send.boxHeight=25*(heightIndex+1);
        $scope.send.boxLineHeight=25;
        $scope.contentBottom=83+25*heightIndex-25*2;
        $scope.send.areaPosition='flex-end';

      }
      $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
    }
    $scope.createImageChat=function(_token,results){
      for(var i=0;i<results.length;i++){
        var imageinfo=results[i];
        var iiArray=imageinfo.split('|');

        if(iiArray.length!=4){
          break;
        }
        console.log('检查是否有异常'+iiArray.length);
        var imageUri=iiArray[0];
        var imageWidth=iiArray[1];
        var imageHeight=iiArray[2];
        var image=iiArray[3];

        var timenow=new Date();
        var _m={
          type:'from',
          userid:_token.userid,
          image:_token.image,
          username:_token.name,
          mess:'[\image\]',
          messImage:image,
          messImageWidth:imageWidth,
          messImageHeight:imageHeight,
          messImageUri:imageUri,
          createAt:timenow.getTime(),
          timeid:timenow.getTime(),
          send:'sending',
          showProcess:false,
          showProcessPercent:'-100%',
          //错误标识，是因为图片上传失败，或者是因为socket连接失败
          errorReason:'',
          imageurl:''
        }
        if($scope.messages.length>0){
          //console.log('聊天信息不是0'+$scope.messages[$scope.messages.length-1].createAt);
          var lastCreateAt=$scope.messages[$scope.messages.length-1].createAt;
          if(timenow.getTime()-lastCreateAt>config.timeSpacing*60*1000){
            //console.log('很新的一条，并且是新的时间段');
            //说明不在一个时间段
            var messageper={
              createAt:timenow.getTime(),
              chatlist:[_m]
            }
            $scope.messages.push(messageper);
          }
          else{
            //说明在一个时间段
            //console.log('很新的一条，不是新的时间段');
            $scope.messages[$scope.messages.length-1].chatlist.push(_m);
          }
        }
        else{
          var messageper={
            createAt:timenow.getTime(),
            chatlist:[_m]
          }
          //console.log('我主动和人家说话的'+JSON.stringify(messageper));
          $scope.messages.push(messageper);
          $scope.$apply();
        }
        //将数据存入nosend中
        $usercenterData.user_by_id({token:_token.token,id:$scope.touser._id})
          .success(function(data){
            //alert(JSON.stringify(data));
            //成功后，将用户信息直接插入userinfo表
            document.addEventListener('deviceready', function() {
              var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
              // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
              db.transaction(function(tx){
                tx.executeSql('insert into userinfo values(?,?,?,?,?)',[data.user._id,data.user.name,data.user.image,data.user.imageUrl,1]);
              },function(error){
                console.log(error);
              },function(){
              });
            });
          })
          .error(function(){
            $SFTools.myToast(config.userPrompt.ajaxError);
          });

        //将信息存入未发表成功的信息表,
        document.addEventListener('deviceready', function() {
          console.log('存nosend');
          var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
          // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
          db.transaction(function(tx){
            //tx.executeSql('create table if not exists nosend(id,fromuser,touser,content,status,image,imageuri,imageurl,image_send_error_reason)');
            tx.executeSql('insert into nosend values(?,?,?,?,?,?,?,?,?,?,?)',[timenow.getTime(),_token.userid,$scope.touser._id,'[\image\]',1,imageUri,image,'','',imageWidth,imageHeight]);
          },function(error){
            console.log(error);
          },function(){
          });
        });


        //视图显示完成，下面上传图片
        $scope.uploadImage(_token,imageUri,_m);
      }

      $ionicScrollDelegate.$getByHandle('chatScroll').scrollBottom();
      $scope.$apply();
    }
    $scope.uploadImage=function(_token,imageuri,_message){
      _message.showProcess=true;
      var server=config.basePath+'uploadImages';
      //console.log(server);
      var timeid=_message.timeid;
      var filepath=imageuri;
      var option={};
      $cordovaFileTransfer.upload(server,filepath,option).then(
        function(result){
          //result.response.path是路径
          var pathJson=result.response;
          pathJson=pathJson.replace('\\','');
          //alert(JSON.stringify(result)+result.response+JSON.parse(pathJson).path);
          _message.showProcess=false;
          //成功后，发送socket
          console.log('发送socket');
          _message.imageurl=JSON.parse(pathJson).path;
          console.log('发送socket'+_message.imageurl);
          $scope.sendImageSocket(_message);
        },function(err){
          //alert('图片上传失败了'+err);
          //将错误原因存入nosend中
          document.addEventListener('deviceready', function() {
            console.log('存nosend');
            var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
            // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
            db.transaction(function(tx){
              tx.executeSql('update nosend set image_send_error_reason =? where id=?',['image_upload_error',timeid]);
            },function(error){
              console.log(error);
            },function(){
            });
          });
          //如果失败了，这条信息就记为发送失败
          _message.errorReason='upload_image_error';
          _message.send='failed'
          $scope.$apply();;

        },function(progress){
          $timeout(function(){
            var percent=progress.loaded/progress.total;
            _message.showProcessPercent= '-'+(100-parseInt(percent*100))+'%';
          },1000*progress.loaded/progress.total)
        });
    }
    $scope.sendImageSocket=function(_message){
      console.log('开始发送image的socket');
      var timeid=_message.timeid;
      var sendContent=_message.mess;
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          //使用socket自带的buffer机制，放进数组后，监视时间，如果超过一定时间，就认为发送失败，改变视图，同时将socket对象中的对应buffer删除。
          var retryObj={
            touser:$scope.touser._id,
            loop:0,
            startTime:timeid
          };
          //console.log('加入重试循环');
          $rootScope.retryList.push(retryObj);
          ////将这条发送消息的视图实例，赋值到重试列表中.
          retryObj.viewObject=_message;
          //将信息存入未发表成功的信息表,
          document.addEventListener('deviceready', function() {
            console.log('image改nosend');
            var db = window.sqlitePlugin.openDatabase({name: _token.userid+'.db3', location: 'default'});
            // status=1 默认 status=0的时候，说明这条数据发送成功了 id列就是时间
            db.transaction(function(tx){
              tx.executeSql('update nosend set image_send_error_reason=? where id=?',['socket_send_error',timeid]);
            },function(error){
              console.log(error);
            },function(){
            });
          });

          //发送广播，用户发送信息了,main页面可以接收，改变自己的视图
          //alert('发送消息的通知'+sendContent+JSON.stringify({userid:$scope.touser._id,content:sendContent,timeid:timeid,username:$scope.touser.name}));
          //$rootScope.$broadcast('aaa');
          $rootScope.$broadcast('SendingMessage',{userid:$scope.touser._id,content:sendContent,timeid:timeid,username:$scope.touser.name});
          //$rootScope.$broadcast('SendingMessagee',5);
          //发送消息
          //alert('发送消息'+_message.imageurl+_token.userid+ $scope.touser._id+ sendContent+timeid+_token.deviceid+_message.imageurl);
          iosocket.emit('private message', _token.userid, $scope.touser._id, sendContent,timeid,_token.deviceid,_message.imageurl);
        }
      });
    }
    $scope.openImages=function(){
      var options = {
        maximumImagesCount: 9,
        width: 800,
        height: 800,
        quality: 80
      };
      $cordovaImagePicker.getPictures(options)
        .then(function (results) {
          //alert(results.toString().length);
          $SFTools.getToken(function(_token){
            $scope.createImageChat(_token,results);
          });

          for (var i = 0; i < results.length; i++) {
            //用户有选择图片的情况下
            //在chat页面下面，建立相应数量的聊天信息单元
            //图片最好在客户端形成一个低分辨率的图片，现在可以用一张默认图片代替
            //一张图片上传完毕，再发socket消息
          }
        })
    }

    //显示大图片的处理
    $scope.showBigImage=function(message){
      alert("显示大图");
      cordova.plugins.MyMath.plus(['URI',message.imageuri],function(data){console.log(data);alert(data);},function(e){console.log(e);alert(e);});
    }
  }]);
