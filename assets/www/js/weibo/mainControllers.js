/**
 * Created by Administrator on 2016/7/22.
 */
angular.module('mainControllers',['ngCordova'])
  .controller('MainCtrl',['$scope','$rootScope','$state','$ionicModal','$usercenterData','$mainData','$ionicLoading','$ionicPopup','$timeout','$window','$cordovaToast','$SFTools','$location','$ionicHistory','$cordovaStatusbar','$ionicScrollDelegate','$cordovaKeyboard','$ionicPlatform','$interval','$cordovaDevice','$loginData','$ionicNativeTransitions','$cordovaDialogs','$cordovaPreferences',function($scope,$rootScope,$state,$ionicModal,$usercenterData,$mainData,$ionicLoading,$ionicPopup,$timeout,$window,$cordovaToast,$SFTools,$location,$ionicHistory,$cordovaStatusbar,$ionicScrollDelegate,$cordovaKeyboard,$ionicPlatform,$interval,$cordovaDevice,$loginData,$ionicNativeTransitions,$cordovaDialogs,$cordovaPreferences){
    $scope.AppName=config.appName;
    $rootScope.retryList=[];
    $scope.$on('$ionicView.loaded',function(){
      //alert('main loaded');
      //app默认进入页面
      var db = null;
      var username='';
      var _id='';
      $scope.chats=[];
      $rootScope.NewMessageCount=0;
      $scope.LoadingServer=false;
      $scope.getRegId(function(regId){
        $SFTools.getToken(function(_token){
          if(_token&&_token.userid&&_token!=''){
            //初始化main页面的欢迎信息
            $scope.initChat(_token);
            //从sql找到列表数据，让用户离线的时候也可以浏览消息
            $scope.initMessageFromSql(_token.userid);
            //接收用户发送失败的通知，改变view
            $scope.MessageSendFailedListener();
            //消息发送失败的重试机制
            $scope.retry(_token);
            //收到了消息之后的处理
            $scope.receiveMessage(_token);
            //接收“用户看过了”这条消息
            $scope.MessageSawListener();
            //接收“用户向这个人发信息了”这条消息
            $scope.SendingMessageListener();
            //接收服务器收到了之后，发的通知
            $scope.ServerReciverListener();
            //同步服务器消息成功，改变view
            $scope.NoReadListener();


            //确认用户是否成功登陆,带上mipush的regid，将这个用户的regId列改成带过去的参数，其他用户的regid如果是这个，就把它删掉。
            $usercenterData.usercenter({token:_token.token,regId:regId})
              .success(function(data){
                if(data.success===0){
                  $state.go('login');
                  $SFTools.myToast(data.msg);
                }
                else{
                  //同步设备号
                  $loginData.setDeviceId({token: _token.token, deviceId:_token.deviceid}).success(function(){
                    $SFTools.myToast('同步服务器信息成功')
                    //接收离线信息
                    $scope.initMessageFromServer(_token)
                    //初始化socket，登录到聊天服务器
                    $scope.retrySocket(_token);
                  }).error(function(){
                    $SFTools.myToast('同步服务器信息失败');
                  });
                }
              })
              .error(function(){
                $SFTools.myToast(config.userPrompt.ajaxError);
              });
          }
          else{
            $state.go('login');
          }
        });
      })

    });

    $scope.$on('$ionicView.afterEnter',function(){
      //让app不往前面的url跳
      $ionicHistory.clearHistory();
      $ionicHistory.clearCache();
    });

    $scope.getRegId=function(callback){
      document.addEventListener('deviceready',function(){
        $cordovaPreferences.fetch("regId")
          .success(function(value){
            console.log('获取regid成功'+value);
            callback(value);
          })
          .error(function(error){
            console.log(error);
            callback("")
          })
      });
    }

    $scope.chatWith=function(id,name){
      if(id!=0) {
        $ionicNativeTransitions.stateGo('chat', {userid:id,username:name}, {}, {
          "type": "slide",
          "direction": "left", // 'left|right|up|down', default 'left' (which is like 'next')
          "duration": 200, // in milliseconds (ms), default 400
        });
      }
      else{
        $SFTools.myToast('welcome to XiaoYuan IM!');
      }
    }

    $scope.retrySocket=function(_token){
      $scope.initSocket(_token)
      /*
      $interval(function(){
        console.log('客户端检查，并且重连'+iosocket.connected+iosocket.id);
        if(iosocket&&iosocket.connected){
          //正常
          console.log('socket正常');
        }
        else{
          console.log('socket不正常');
          $scope.initSocket(_token)
        }

      },10*1000);
      */
    }

    $scope.initSocket=function(_token){
      //尝试建立客户端的主动重连机制，一分钟一次
      iosocket = io.connect(config.serverPath, {'reconnect': true});
      iosocket.on('connect', function () {
        console.log('连接了，不知道是重新连还是直接连，username是' + _token.name + ',_id是' + _token.userid);
        if (_token.name != '' && _token.userid != '') {
          iosocket.emit('login', {
            name: _token.name,
            _id: _token.userid,
            type: 'page'
          });
        }
      });
      //获取socket信息，发送angularjs通知
      iosocket.on('message',function(obj){
        console.log('page接收到了socket的消息');
        $rootScope.$broadcast('ReciveMessage',obj);
      });
      //服务器说，你发的消息我收到了
      iosocket.on('reciveMessage',function(obj){
        console.log('发送广播：服务器收到了。广播的名称为serverRecive'+obj.to);
        $rootScope.$broadcast('ServerRecive'+obj.to,obj);
        $rootScope.$broadcast('ServerRecive',obj);
        //更新main列表
        for(var i=0;i<$scope.chats.length;i++){
          if($scope.chats[i].userid===obj.to){
            $scope.chats[i].content=obj.message.content;
            var timee=new Date(obj.message.meta.createAt);
            $scope.chats[i].createAt=timee.getTime();
            $scope.chats[i].new=0;
            $scope.$apply();
            break;
          }
        }
      });
      iosocket.on('reconnect',function(){
        console.log('重新连接事件触发，发出通知，可以用这个通知来加载离线消息。');
        //$rootScope.$broadcast('socketReconnect',{});
        $scope.initMessageFromServer(_token);
      });
      iosocket.on('ping',function(obj){
        //console.log('server ping'+iosocket.id);
      });

      iosocket.on('disconnect',function(){
        console.log('服务器断开连接了');
      })

    }

    //从服务器同步离线消息，并发出全局通知
    $scope.initMessageFromServer=function(token){
      $scope.LoadingServer=true;
      document.addEventListener('deviceready', function() {
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: token.userid+'.db3', location: 'default'});
        //获得当前main界面的数据
        db.executeSql('select * from main_message',[],function(rs){
          var mainArray=[];
          var userInfoArray=[];
          for(var o=0;o<rs.rows.length;o++){
            var mainObj={
              master:rs.rows.item(o).master,
              relation_user:rs.rows.item(o).relation_user,
              relation_user_id:rs.rows.item(o).relation_user_id,
              content:rs.rows.item(o).content,
              createAt:rs.rows.item(o).createAt,
              saw:rs.rows.item(o).saw,
              status:rs.rows.item(o).status,
              relation_chat_id:rs.rows.item(o).relation_chat_id
            }
            mainArray.push(mainObj);
          }
          //获得当前userinfo表的信息
          db.executeSql('select * from userinfo',[],function(rsUserInfo){
            for(var oo=0;oo<rsUserInfo.rows.length;oo++){
              var userInfoObj={
                id:rsUserInfo.rows.item(oo).id,
                name:rsUserInfo.rows.item(oo).name,
                image:rsUserInfo.rows.item(oo).image,
                showInMain:rsUserInfo.rows.item(oo).showInMain
              }
              userInfoArray.push(userInfoObj);
            }
            //服务器上存的7天内的，和这个客户端不一致的所有消息
            $mainData.not_read_list({token:token.token}).success(function(data){
              console.log('从服务器同步信息的条数是：'+JSON.stringify(data));
              //获取信息之后，将同步的信息，存入sqlite
              var insertSqls=[];
              var insertUser=[];
              var mainServer=[];
              var chatResult=[];

              for(var i=0;i<data.chats.length;i++){
                //首先看和user发生关系的这个人的信息，是否在userinfo表中存在，存在不修改，不存在新增
                var fromuser=data.chats[i].from;
                var touser=data.chats[i].to;
                //同步userinfo表
                var relation_user={};
                if(token.userid===fromuser._id.toString()) {
                  relation_user={
                    name:touser.name,
                    userid:touser._id,
                    image:touser.image,
                    action:'to'
                  }
                }
                else{
                  relation_user={
                    name:fromuser.name,
                    userid:fromuser._id,
                    image:fromuser.image,
                    action:'from'
                  }
                }
                console.log('这条有关联系人的信息是：'+relation_user.name+'他的行为是'+relation_user.action);
                var existUser=false;

                if(userInfoArray.length>0){
                  for(var ui=0;ui<userInfoArray.length;ui++){
                    console.log('循环'+relation_user.userid+'和'+userInfoArray[ui].id);
                    if(relation_user.userid===userInfoArray[ui].id){
                      //说明存在，不管
                      break;
                    }
                    else{
                      if(ui===userInfoArray.length-1){
                        //说明不存在，插入
                        console.log(relation_user.name+'不存在插入1');
                        var userInfoArrayObj={
                          id:relation_user.userid,
                          name:relation_user.name,
                          image:relation_user.image,
                          showInMain:1
                        }
                        userInfoArray.push(userInfoArrayObj);
                        insertUser.push('insert into userinfo values(\''+userInfoArrayObj.id+'\',\''+userInfoArrayObj.name+'\',\''+userInfoArrayObj.image+'\',1)');
                        break;
                      }
                    }
                  }
                }
                else{
                  console.log(relation_user.name+'不存在插入2');
                  var userInfoArrayObj={
                    id:relation_user.userid,
                    name:relation_user.name,
                    image:relation_user.image,
                    showInMain:1
                  }
                  userInfoArray.push(userInfoArrayObj);
                  insertUser.push('insert into userinfo values(\''+userInfoArrayObj.id+'\',\''+userInfoArrayObj.name+'\',\''+userInfoArrayObj.image+'\',1)');
                }


                //同步chat
                var createDate=new Date(data.chats[i].meta.createAt);
                var chatObj={
                  id:data.chats[i]._id,
                  fromuser:fromuser._id.toString(),
                  touser:touser._id.toString(),
                  content:data.chats[i].content,
                  createAt:createDate.getTime(),
                  saw:0
                }
                chatResult.push(chatObj);

                console.log('服务器同步过来的消息，客户端没有，进行插入操作');
                insertSqls.push('insert into chat values(\''+chatObj.id+'\',\''+chatObj.fromuser+'\',\''+chatObj.touser+'\',\''+chatObj.content+'\','+chatObj.createAt+',0)')


                //同步main_message
                //得到的服务器消息，需要和sqlite中的main_message作比较 mainArray是当前数据库中的数据
                //把服务器传输过来的数据，做main_message筛选,放在mainServer里面
                console.log('mainServer第'+i+'次插入的时候数据是：'+JSON.stringify(mainServer));
                if(mainServer.length===0){
                  var mainServerObj={
                    master:token.userid,
                    relation_user:relation_user.name,
                    relation_user_id:relation_user.userid,
                    content:data.chats[i].content,
                    createAt:createDate.getTime(),
                    saw:relation_user.action==='to'?0:((data.chats[i].saw==="0"||data.chats[i].saw==="1"||data.chats[i].saw==="")?1:0),
                    status:1,
                    relation_chat_id:relation_user.action==="to"?"":data.chats[i]._id.toString()
                  }
                  mainServer.push(mainServerObj);
                }
                else{
                  for(var k=0;k<mainServer.length;k++){
                    if(mainServer[k].relation_user_id===relation_user.userid){
                      console.log('Mainserver中的第'+k+'个人和这条chat的人是相同的'+mainServer[k].relation_user_id+mainServer[k].relation_user);
                      //比较他们的createAt
                      if(mainServer[k].createAt> createDate.getTime()){
                        //说明这条信息和之前那个相比，不新，就不需要更新了
                      }
                      else{
                        //更加新的一条信息，需要更新mainServer
                        mainServer[k].content=data.chats[i].content;
                        mainServer[k].createAt=createDate.getTime();
                        if(relation_user.action==='to'){
                          mainServer[k].saw=0;
                        }
                        else{
                          console.log('测试数据666666666是：'+mainServer[k].saw+'和'+data.chats[i].saw);
                          mainServer[k].saw=(data.chats[i].saw==="0"||data.chats[i].saw==="1"||data.chats[i].saw==="")?mainServer[k].saw+1:mainServer[k].saw;
                        }
                        mainServer[k].relation_chat_id=relation_user.action==="to"?"":data.chats[i]._id.toString();
                      }
                      break;
                    }
                    else{
                      //说明是和另一个人的联系
                      if(k===mainServer.length-1){
                        //说明是新的，insert进mainServer
                        var mainServerObj={
                          master:token.userid,
                          relation_user:relation_user.name,
                          relation_user_id:relation_user.userid,
                          content:data.chats[i].content,
                          createAt:createDate.getTime(),
                          saw:relation_user.action==='to'?0:((data.chats[i].saw==="0"||data.chats[i].saw==="1"||data.chats[i].saw==="")?1:0),
                          status:1,
                          relation_chat_id:relation_user.action==="to"?"":data.chats[i]._id.toString()
                        }
                        mainServer.push(mainServerObj);
                      }
                      else{
                        //继续循环
                      }
                    }
                  }
                }
              }

              console.log('mainServer这时候的值'+JSON.stringify(mainServer));

              //循环完毕，把mainServer[]和mainArray[]整合，确定这一系列的sql
              //mainResult这个数组，用来给其他页面，作为广播的一个参数
              var mainResult=[];
              if(mainArray.length===0){
                //相当于main_message对象是空的，把服务器的main直接放进去就可以了
                for(var ss=0;ss<mainServer.length;ss++){
                  insertSqls.push('insert into main_message values(\''+mainServer[ss].master+'\',\''+mainServer[ss].relation_user+'\',\''+mainServer[ss].relation_user_id+'\',\''+mainServer[ss].content+'\','+mainServer[ss].createAt+','+mainServer[ss].saw+','+mainServer[ss].status+',\''+mainServer[ss].relation_chat_id+'\')');
                  mainResult.push(mainServer[ss]);
                }
              }
              else{
                for(var cc=0;cc<mainServer.length;cc++){
                  for(var tt=0;tt<mainArray.length;tt++){
                    console.log('测试数据333333333333是：'+mainArray[tt].relation_user_id+'和'+mainServer[cc].relation_user_id+(mainArray[tt]));
                    if(mainArray[tt].relation_user_id===mainServer[cc].relation_user_id){
                      if(mainArray[tt].createAt>mainServer[cc].createAt){
                        //说明这条信息不新，不用修改了
                      }
                      else{
                        //说明服务器过来的这个消息是新的，修改之
                        var contentUpdate=mainServer[cc].content;
                        var createAtUpdate=mainServer[cc].createAt;
                        var sawUpdate=0;
                        if(mainServer[cc].relation_chat_id===""){

                        }
                        else{
                          sawUpdate=parseInt(mainArray[tt].saw)+parseInt(mainServer[cc].saw);
                        }
                        console.log('测试数据222222222是：'+sawUpdate);
                        var relationChatIdUpdate=mainServer[cc].relation_chat_id;
                        var masterUpdate=mainServer[cc].master;
                        var relationUserId=mainServer[cc].relation_user_id;
                        insertSqls.push('update main_message set content=\''+contentUpdate+'\',createAt='+createAtUpdate+',saw='+sawUpdate+',relation_chat_id=\''+relationChatIdUpdate+'\' where master=\''+masterUpdate+'\' and relation_user_id=\''+relationUserId+'\' and status=1 ');
                        var mainResultObj={
                          master:masterUpdate,
                          relation_user:mainServer[cc].relation_user,
                          relation_user_id:relationUserId,
                          content:contentUpdate,
                          createAt:createAtUpdate,
                          saw:sawUpdate,
                          status:1,
                          relation_chat_id:relationChatIdUpdate
                        }
                        mainResult.push(mainResultObj);
                        console.log('测试数据：'+JSON.stringify(mainResultObj));
                      }
                      break;
                    }
                    else{
                      //循环到最后一个
                      if(tt===mainArray.length-1){
                        //说明就是最后的一个了,需要insert
                        insertSqls.push('insert into main_message values(\''+mainServer[cc].master+'\',\''+mainServer[cc].relation_user+'\',\''+mainServer[cc].relation_user_id+'\',\''+mainServer[cc].content+'\','+mainServer[cc].createAt+','+mainServer[cc].saw+','+mainServer[cc].status+',\''+mainServer[cc].relation_chat_id+'\')');
                        var mainResultObj={
                          master:mainServer[cc].master,
                          relation_user:mainServer[cc].relation_user,
                          relation_user_id:mainServer[cc].relation_user_id,
                          content:mainServer[cc].content,
                          createAt:mainServer[cc].createAt,
                          saw:mainServer[cc].saw,
                          status:1,
                          relation_chat_id:mainServer[cc].relation_chat_id
                        }
                        mainResult.push(mainResultObj);
                      }
                      else{

                      }
                    }
                  }
                }
              }
              console.log('信息规整完成，插入了'+insertUser.length+'条用户数据，插入了'+insertSqls.length+'条chat和userinfo数据');
              console.log('同步的聊天信息sql是：'+JSON.stringify(insertSqls));
              console.log('同步的用户信息sql是：'+JSON.stringify(insertUser));
              db.transaction(function(tx){
                for(var u=0;u<insertUser.length;u++){
                  tx.executeSql(insertUser[u]);
                }
                for(var z=0;z<insertSqls.length;z++){
                  tx.executeSql(insertSqls[z]);
                }
              },function(err){
                console.log('写入数据库出错了'+err.message+'if判断'+err.message.indexOf('UNIQUE'));
                if(err.message.indexOf('UNIQUE')>-1){
                  console.log('让服务器更新chat设备号，保持与客户端统一。');
                  //说明是重复信息，但出现这个错误，重新向服务器发送一个请求，让服务器把相关chat的设备号改变.
                  $mainData.setNewDeviceId({userid:token.userid,deviceid:token.deviceid,token:token.token});
                }
                $scope.LoadingServer=false;
              },function(){
                //$scope.chats=[];
                if(mainResult.length>0||chatResult.length>0) {
                  console.log('服务器同步了消息，发出通知');
                  $rootScope.$broadcast('ReceiveNoRead', {mainArray: mainResult, chatArray: chatResult});
                }
                $scope.LoadingServer=false;
                console.log('写入数据库成功,服务器可以修改标志位了,把这个用户相关的消息的标志位都改成这台设备的');
                $mainData.setNewDeviceId({userid:token.userid,deviceid:token.deviceid,token:token.token});
                isSync=true;
              });
            }).error(function(data){
              $SFTools.myToast('从服务器同步信息失败');
              $scope.LoadingServer=false;
            });
          })
        })
      });
    }
    //接收消息，收到别人的消息的处理
    $scope.receiveMessage=function(token){
      $rootScope.$on('ReciveMessage',function(event,obj){
        var chat=obj.message;
        var from=obj.from;
        var db = null;
        //根据当前path决定new值，变了，根据modal是否存在而决定
        var newMessage=true;
        var currentUrl=$location.path();
        if(currentUrl.indexOf('chat')>-1){
          //说明在chat页面
          var urls=currentUrl.split('/');
          if(urls[2]===obj.from._id){
            newMessage=false;
          }
        }

        //向服务器发送消息，我收到了，你的标志位可以修改了
        iosocket.emit('ReciveMessage',{chatid:obj.message._id,deviceid:token.deviceid});

        //$SFTools.myToast('web端接收到的消息是'+from.name+'发送的'+chat.content+chat.meta.createAt);
        //存数据库
        document.addEventListener('deviceready', function() {
          var exist=true;
          db = window.sqlitePlugin.openDatabase({name: token.userid+'.db3', location: 'default'});
          db.executeSql('create table if not exists userinfo(id,name,image,showInMain)');
          db.executeSql('CREATE TABLE IF NOT EXISTS chat (id,fromuser,touser,content,createAt,saw)');
          db.executeSql('select count(*) AS mycount from userinfo where id=?',[from._id],function(rs){
            var count=rs.rows.item(0).mycount;
            if(count>0){
              exist=true;
            }
            else{
              exist=false;
            }
            console.log('发出消息的这个人的信息在数据库里面存在吗？'+exist+'信息是：'+from.name);
            db.executeSql('select count(*) as mycount from chat where id=?',[chat._id],function(rs) {
              var createtime=new Date(chat.meta.createAt);
              var existChat;
              var countChat = rs.rows.item(0).mycount;
              if (countChat > 0) {
                existChat = true;
              }
              else {
                existChat = false;
              }
              //alert('是否存在这条信息'+existChat+chat.content);
              if (existChat) {
                //alert('不操作');
              }
              else {
                //alert('插入');
                db.executeSql('INSERT INTO chat VALUES (?,?,?,?,?,?)', [chat._id, chat.from, chat.to, chat.content, createtime.getTime(), newMessage?0:1]);
              }
            });

            if(exist){
              db.executeSql('update userinfo set name=?,image=? where id=?',[from.name,from.image,from._id]);
            }
            else{
              db.executeSql('insert into userinfo values(?,?,?,?)',[from._id,from.name,from.image,1]);
            }

            //最后更新首页表。数据不好查，只好建立新的表来保存，还可以提高首页性能
            // status说明：1：正常 | failed：发送失败 | bak：草稿 relation
            db.executeSql('create table if not exists main_message(master,relation_user,relation_user_id,content,createAt,saw,status,relation_chat_id)');
            var master=chat.to;
            var relation_user=from.name;
            var relation_user_id=from._id;
            db.executeSql('select count(master) as mycount,saw from main_message where master=\''+master+'\' and relation_user_id=\''+relation_user_id+'\'',[],function(rs){
              var countMain = rs.rows.item(0).mycount;
              var saw=rs.rows.item(0).saw;
              var createAtTime=new Date(chat.meta.createAt);
              if(countMain>0){
                //存在
                db.executeSql('update main_message set content=?,createAt=?,saw=?,relation_chat_id=? where master=? and relation_user_id=?',[chat.content,createAtTime.getTime(),newMessage?(parseInt(saw)+1):0,chat._id,master,relation_user_id]);
              }
              else{
                db.executeSql('insert into main_message values(?,?,?,?,?,?,?,?)',[master,relation_user,relation_user_id,chat.content,createAtTime.getTime(),newMessage?1:0,1,chat._id]);
              }
              console.log('page修改了main_message的值');
            });
          },function(tx,error){
            alert(error.message);
          });
        });

        //提醒铃声,不能这么做，这样做，音量是用媒体音量来控制的，不是通过铃声音量来控制的
        /*
        $cordovaNativeAudio
          .preloadSimple('click', 'audio/highhat.mp3').then(function (msg) {
          console.log(msg);
        }, function (error) {
          alert(error);
        });
        $cordovaNativeAudio.play('click');
        */

        $cordovaDialogs.beep(1);


        //实时显示
        if($scope.chats.length===0){
          var newObj={
            id:chat._id,
            name:from.name,
            userid:from._id,
            content:chat.content,
            createAt:chat.meta.createAt,
            new:newMessage?1:0
          }
          $scope.chats.unshift(newObj);
        }
        else{
          for(var i=0;i<$scope.chats.length;i++){
            //console.log('ffffffffffff'+$scope.chats[i].name+from.name+from._id+$scope.chats[i].userid);
            if(from.name===$scope.chats[i].name&&from._id===$scope.chats[i].userid){
              $scope.chats[i].content=chat.content;
              if($scope.chats[i].new){
                if(newMessage) {
                  $scope.chats[i].new = parseInt($scope.chats[i].new) + 1;
                  $rootScope.NewMessageCount=parseInt($rootScope.NewMessageCount)+1;
                }
                else{
                  $scope.chats[i].new=0;
                }
              }
              else{
                if(newMessage){
                  $scope.chats[i].new=1;
                  $rootScope.NewMessageCount=parseInt($rootScope.NewMessageCount)+1;
                }
                else{
                  $scope.chats[i].new=0;
                }

              }
              $scope.chats[i].createAt=chat.meta.createAt;

              //将这个对象置前
              var newObj=$scope.chats[i];
              $scope.chats.splice(i,1);
              $scope.chats.unshift(newObj);

              break;
            }
            else{
              if(i===$scope.chats.length-1){
                //说明是一个新的用户
                var newObj={
                  id:chat._id,
                  name:from.name,
                  userid:from._id,
                  content:chat.content,
                  createAt:chat.meta.createAt,
                  new:newMessage?1:0
                }
                $rootScope.NewMessageCount=parseInt($rootScope.NewMessageCount)+1;
                $scope.chats.unshift(newObj);
                break;
              }
            }
          }
        }
        $scope.$apply();
      })
    }
    //欢迎信息初始化
    $scope.initChat=function(_token){
      var chatXiaoYuan={
        id:0,
        name:'晓园团队',
        userid:0,
        content:'欢迎加入晓园IM',
        createAt:0,
        new:0
      };
      $scope.chats.push(chatXiaoYuan);
    }
    //加载在手机sql中存的前20条
    $scope.initMessageFromSql=function(touser){
      document.addEventListener('deviceready', function() {
          //从sql读取今天并且没有查看过的所有信息
          var db=null;
          db = window.sqlitePlugin.openDatabase({name: touser+'.db3', location: 'default'});

          db.executeSql('create table if not exists main_message(master,relation_user,relation_user_id,content,createAt,saw,status,relation_chat_id)');
          db.executeSql('CREATE TABLE IF NOT EXISTS chat (id text primary key not null unique,fromuser,touser,content,createAt,saw)');
          db.executeSql("create table if not exists nosend(id,fromuser,touser,content,status)");


          var SqlMainMessage='select * from main_message where master=\''+touser+'\' group by relation_user_id order by createAt';

          db.transaction(function(tx){
            tx.executeSql(SqlMainMessage,[],function(tx,rs){
              for(var i=0;i<rs.rows.length;i++){
                var chat={
                  id:'',
                  name:rs.rows.item(i).relation_user,
                  userid:rs.rows.item(i).relation_user_id,
                  content:rs.rows.item(i).content,
                  createAt:rs.rows.item(i).createAt,
                  new:rs.rows.item(i).saw,
                  type:rs.rows.item(i).status
                };
                $scope.chats.unshift(chat);
                $rootScope.NewMessageCount=parseInt($rootScope.NewMessageCount)+parseInt(rs.rows.item(i).saw);
              }
            },function(tx,error){
              console.log('select error is'+error.message);
            });
          },function(tx,error){
            console.log('transaction error is'+error.message);
          },function(){
            //alert('发送失败的消息');
            var noSendList=[];
            //然后把发送失败的这部分加上，如果nosend里面有比现在这条信息更新的，发送失败的消息，就把这条消息放在$scope.chat里 状态是 发送失败
            db.executeSql('select * from nosend where fromuser=\''+touser+'\' and status=1 group by touser',[],function(rs){
              for(var i=0;i<rs.rows.length;i++){
                var nosendObj={
                  id:rs.rows.item(i).id,
                  fromuser:rs.rows.item(i).fromuser,
                  touser:rs.rows.item(i).touser,
                  content:rs.rows.item(i).content
                };
                noSendList.push(nosendObj);
              }
              //将这个数组附加到$scope.chats上
              for(var i=0;i<noSendList.length;i++){
                //alert('第'+i+'条未发消息');
                for(var j=0;j<$scope.chats.length;j++){
                  if(noSendList[i].touser===$scope.chats[j].userid){
                    //alert(noSendList[i].touser+'和'+$scope.chats[j].userid);
                    if(parseInt(noSendList[i].id)> parseInt($scope.chats[j].createAt)){
                      //alert(parseInt(noSendList[i].id)+'和'+ parseInt($scope.chats[j].createAt));
                      //alert(noSendList[i].content+ parseInt(noSendList[i].id));
                      $scope.chats[j].content=noSendList[i].content;
                      $scope.chats[j].type='failed';
                      $scope.chats[j].createAt=parseInt(noSendList[i].id);
                    }
                    break;
                  }
                  else{
                    if(j===$scope.chats.length-1){
                      //如果都没有这条信息，就说明，这个人是新的，需要新增，新增就需要这个人的username和image
                      //从db中找到这个人的信息
                      db.executeSql('select * from userinfo where id=\''+noSendList[i].touser+'\'',[],function(rs){
                        if(rs.rows.item(0)&&rs.rows.item(0).name&&rs.rows.item(0).image&&rs.rows.item(0).name!=''){
                          var chat={
                            id:'',
                            name:rs.rows.item(0).name,
                            userid:noSendList[i].touser,
                            content:noSendList[i].content,
                            createAt:parseInt(noSendList[i].id),
                            new:0,
                            type:'failed'
                          };
                          $scope.chats.push(chat);
                        };
                      });
                    }
                  }
                }

              }

              //排序
              $scope.mainSortByCreateTime();

            },function(error){

            });
            console.log('transaction success');
          });
        });
    }
    //这个人的信息被看了，main列表的saw置0
    $scope.MessageSawListener=function(){
      $rootScope.$on('SawMessage',function(event,obj){
        for(var i=0;i<$scope.chats.length;i++){
          if($scope.chats[i].userid===obj){
            var oldnew=$scope.chats[i].new;
            $rootScope.NewMessageCount=parseInt($rootScope.NewMessageCount)-parseInt(oldnew);
            $scope.chats[i].new=0;
            break;
          }
        }
      })
    }
    //向这个人发送信息了，这条信息体现在main列表中
    $scope.SendingMessageListener=function(){
      $rootScope.$on('SendingMessage',function(event,obj){
        var userid=obj.userid;
        var content=obj.content;
        for(var i=0;i<$scope.chats.length;i++){
          if($scope.chats[i].userid===userid){
            $scope.chats[i].type='sending';
            $scope.chats[i].content=content;
            $scope.chats[i].createAt=obj.timeid;
            //将这条消息置前
            var obj=$scope.chats[i];
            $scope.chats.splice(i,1);
            $scope.chats.unshift(obj);
            break;
          }
          else{
            if(i===$scope.chats.length-1){
              //说明和这个人还没有联系呢
              var chatObj={
                id:'',
                name:obj.username,
                userid:obj.userid,
                content:obj.content,
                createAt:obj.timeid,
                new:0,
                type:'sending'
              }
              //alert(JSON.stringify(chatObj)+JSON.stringify(chatObj2));
              $scope.chats.unshift(chatObj);
              //$scope.chats.push(chatObj2);
              //$scope.$apply();
            }
          }
        }
      });
    }
    //服务器说，你发的消息我收到了，这时候main列表的处理
    $scope.ServerReciverListener=function(){
      $rootScope.$on('ServerRecive',function(event,obj){
        console.log('debug:服务器收到了，修改main列表');
        //main页面要做的事情是：main列表对应信息的‘发送中’，去掉。数据库中，sending的这条信息删除，将content createAt替换到status=1那条信息上
        for(var i=0;i<$scope.chats.length;i++){
          if($scope.chats[i].userid===obj.to){
            //alert('符合条件，进行修改');
            $scope.chats[i].type='';
            break;
          }
        }
        $scope.$apply();
        document.addEventListener('deviceready', function() {
          var db=null;
          db = window.sqlitePlugin.openDatabase({name: obj.from+'.db3', location: 'default'});
          db.transaction(function(tx){
            var createAt=new Date(obj.message.meta.createAt);
            tx.executeSql('update main_message set content=?,createAt=?,saw=0 where master=? and relation_user_id=? and status=1',[obj.message.content,createAt.getTime(),obj.from,obj.to]);
          },function(error){
            //alert('main事务执行失败'+error);
          },function(){
            //alert('发送过程的消息确认完成');
          });
        });


      });
    }
    //消息发送失败的消息
    $scope.MessageSendFailedListener=function(){
      $rootScope.$on('SendFailed',function(event,obj){
        //alert('接收到了信息失败的消息'+obj.userid);
        for(var i=0;i<$scope.chats.length;i++){
          //alert($scope.chats[i].userid+'   '+obj.userid+'         '+$scope.chats.createAt+'     '+obj.timeid);
          if($scope.chats[i].userid===obj.touser&&$scope.chats[i].createAt===obj.startTime){
            $scope.chats[i].type='failed';
            break;
          }
        }
      })
    }
    //离线信息收到之后的处理
    $scope.NoReadListener=function(){
      $rootScope.$on('ReceiveNoRead',function(event,obj){
        console.log('main页面收到了服务器同步的信息，同时开始同步main页面。');
        var mainArray=obj.mainArray;
        //mainArray排序，createAt小的在前面
        var pageNew=0;
        for(var i=0;i<mainArray.length;i++){
          for(var j=0;j<mainArray.length-i-1;j++){
            if(mainArray[j].createAt>mainArray[j+1].createAt){
              var temp=mainArray[j];
              mainArray[j]=mainArray[j+1];
              mainArray[j+1]=temp;
            }
          }
          pageNew=pageNew+parseInt(mainArray[i].saw?mainArray[i].saw:0);
          $rootScope.NewMessageCount=pageNew;
        }

        console.log(JSON.stringify(mainArray));

        //将有关的main加入到chats[]对象中
        //mainArray中的内容 逐条 和现在chats[]中的信息做比较，做更新和新增

        if($scope.chats.length===1){
          console.log('第一种情况');
          //说明只有一个欢迎消息,那就把所有的mainArray信息,按照时间排序放到chats内
          for(var i=0;i<mainArray.length;i++){
            var chatObj={
              id:'',
              name:mainArray[i].relation_user,
              userid:mainArray[i].relation_user_id,
              content:mainArray[i].content,
              createAt:mainArray[i].createAt,
              new:mainArray[i].saw,
              type:mainArray[i].status
            };
            $scope.chats.unshift(chatObj);
          }
        }
        else{
          //有死循环
          for(var i=0;i<mainArray.length;i++){
            console.log('i是：'+i);
            for(var j=0;j<$scope.chats.length;j++){
              console.log('j是：'+j);
              console.log('数据是'+$scope.chats[j].userid+'和'+mainArray[i].relation_user_id+'和'+mainArray[i].createAt+'和'+$scope.chats[j].createAt);
              if($scope.chats[j].userid===mainArray[i].relation_user_id&&mainArray[i].createAt>$scope.chats[j].createAt){
                console.log('同一个人的信息'+$scope.chats[j].new+'       '+mainArray[i].saw);
                $scope.chats[j].content=mainArray[i].content;
                $scope.chats[j].createAt=mainArray[i].createAt;
                if(!$scope.chats[j].new||$scope.chats[j].new===0){
                  console.log('liu');
                  $scope.chats[j].new=mainArray[i].saw;
                }
                else{
                  console.log('li'+parseInt($scope.chats[j].new)+parseInt(mainArray[i].saw));
                  //$scope.chats[j].new=  parseInt($scope.chats[j].new)+parseInt(mainArray[i].saw);
                  $scope.chats[j].new=mainArray[i].saw;
                }
                break;
              }
              else{
                console.log('不同一个人的信息');
                if(j===$scope.chats.length-1){
                  console.log('新的一个人的信息');
                  var chatObj={
                    id:'',
                    name:mainArray[i].relation_user,
                    userid:mainArray[i].relation_user_id,
                    content:mainArray[i].content,
                    createAt:mainArray[i].createAt,
                    new:mainArray[i].saw,
                    type:mainArray[i].status
                  };
                  $scope.chats.unshift(chatObj);
                  break;
                }
              }
            }
          }
        }
        console.log('测试数据4444444444是：'+JSON.stringify($scope.chats))
        $scope.mainSortByCreateTime();
        $scope.$apply();

      });
    }

    $scope.retry=function(token){
      $interval(function(){
        for(var i=0;i<$rootScope.retryList.length;i++){
          var retryObj=$rootScope.retryList[i];
          ////超过n秒
          //if(retryObj.retryTime>config.sendFailedTime){
          //  retryObj.loop++;
          //  console.log('发送的消息超时了啊'+JSON.stringify(retryObj));
          //
          //  //重新发送
          //  iosocket.emit('private message', token.userid, retryObj.touser,retryObj.viewObject.mess ,retryObj.startTime,token.deviceid);
          //  retryObj.retryTime=0;
          //  retryObj.viewObject.send='retry';
          //  retryObj.viewObject.retryTime=retryObj.loop;
          //}
          ////超过n次
          //if(retryObj.loop>RETRY_TIME){
          //  retryObj.viewObject.send='failed';
          //  //发送发送失败通知，用来告诉main页面
          //  //alert('发送信息失败的消息'+retryObj.touser._id);
          //  $rootScope.$broadcast('MessageFailed',{userid:retryObj.touser,timeid:retryObj.startTime});
          //  //failded之后，从循环中移除
          //  $rootScope.retryList.splice(i,1);
          //}

          //new
          if(retryObj.loop>config.sendFailedTime*60){
            //说明超时了
            //retrylist删除，sendBuffer删除，发送超时通知
            $rootScope.retryList.splice(i,1);

            if(iosocket&&iosocket.sendBuffer){
              for(var j=0;j<iosocket.sendBuffer.length;j++){
                console.log(JSON.stringify(iosocket.sendBuffer[j].data));
                if(retryObj.startTime===iosocket.sendBuffer[j].data[3]&&retryObj.touser===iosocket.sendBuffer[j].data[1]){
                  iosocket.sendBuffer.splice(j,1);
                  break;
                }
              }
            }
            else{
              //可能断线了已经
            }


            $rootScope.$broadcast('SendFailed',retryObj);

          }
          else{
            retryObj.loop++;
          }

        }
      },1000)
    }
    //首页视图排序
    $scope.mainSortByCreateTime=function(){
      for(var i=0;i<$scope.chats.length;i++){
        for(var j=0;j<$scope.chats.length-i-1;j++){
          if($scope.chats[j].createAt<$scope.chats[j+1].createAt){
            var temp=$scope.chats[j];
            $scope.chats[j]=$scope.chats[j+1];
            $scope.chats[j+1]=temp;
          }
        }
      }
      $scope.$apply();
    }

  }]);
