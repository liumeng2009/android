/**
 * Created by Administrator on 2016/7/22.
 */
angular.module('mainControllers',['ngCordova'])
  .controller('MainCtrl',['$scope','$rootScope','$state','$ionicModal','$usercenterData','$mainData','$ionicLoading','$ionicPopup','$timeout','$window','$cordovaToast','$SFTools','$location','$ionicHistory',function($scope,$rootScope,$state,$ionicModal,$usercenterData,$mainData,$ionicLoading,$ionicPopup,$timeout,$window,$cordovaToast,$SFTools,$location,$ionicHistory){
    $scope.$on('$ionicView.loaded',function(){
      //app默认进入页面
      var db = null;
      var username='';
      var _id='';
      $scope.chats=[];
      //alert('main加载');
      $SFTools.getToken(function(_token){
        if(_token&&_token.userid&&_token!=''){
          var chatXiaoYuan={
            id:0,
            name:'晓园团队',
            userid:0,
            content:'欢迎加入晓园IM',
            createAt:_token.createAt,
            new:0
          };
          $scope.chats.push(chatXiaoYuan);
          //从sql找到列表数据
          $scope.initMessageFromSql(_token.userid);
          //接收“用户看过了”这条消息
          $scope.MessageSawListener();
          //接收“用户向这个人发信息了”这条消息
          $scope.SendingMessageListener();
          //接收服务器收到了之后，发的通知
          $scope.ServerReciverListener();

          $usercenterData.usercenter({token:_token.token})
            .success(function(data){
              if(data.success===0){
                $state.go('login');
                $scope.showErrorMesPopup(data.msg);
              }
              else{
                //服务器上的没有收到的消息，接收一下
                $scope.initMessageFromServer();
                //获取socket信息，发送angularjs通知
                iosocket.on('message',function(obj){
                  alert('收到消息了');
                  $rootScope.$broadcast('ReciveMessage',obj);
                });
                //服务器说，你发的消息我收到了
                iosocket.on('reciveMessage',function(obj){
                  //alert('发送广播：服务器收到了。广播的名称为serverRecive'+obj.to);
                  $rootScope.$broadcast('ServerRecive'+obj.to,obj);
                  $rootScope.$broadcast('ServerRecive',obj);
                  //更新main列表
                  for(var i=0;i<$scope.chats.length;i++){
                    if($scope.chats[i].userid===obj.to){
                      $scope.chats[i].content=obj.message.content;
                      var timee=new Date(obj.message.meta.createAt);
                      $scope.chats[i].createAt=timee.getTime();
                      $scope.chats[i].new=0;
                      break;
                      $scope.$apply();
                    }
                  }
                });
                //收到了消息之后的处理
                $scope.receiveMessage();
              }
            })
            .error(function(){
              $scope.showErrorMesPopup('网络连接错误');
            });
        }
        else{
          //$SFTools.myToast('getToken这个service提供的token有问题')
          $timeout(function(){
            $state.go('login');
          },0);
        }
      });
    });

    $scope.$on('$ionicView.afterEnter',function(){

    });

    //弹出modal
    $ionicModal.fromTemplateUrl('templates/modal_add.html', {
      scope: $scope,
      animation: 'slide-in-up'
    }).then(function(modal) {
      $scope.modal = modal;
    });
    $scope.openModal=function(userid,username){
      var registerKeyBoard='';
      $scope.messages=[];
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
      if(userid){
        $scope.modal.show();
        $scope.touser={
          name:username
        }
        $SFTools.getToken(function(_token){
          $scope.fromuser={
            name:_token.name,
            _id:_token.userid,
            image:_token.image
          }
          $scope.getMessageFromSql(_token,userid);

          $scope.setSaw(_token.userid,userid);

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
                $scope.receiveMessagePerson(userid);
              }
            })
            .error(function(){
              $scope.showErrorMesPopup('网络连接错误2222');
            });
        });
      }
      else{
        $scope.modal.hide();
      }

    }

    $scope.chatwidth=function(userid,username){
      var db=null;
      var token='';
      document.addEventListener('deviceready', function() {
        db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
        db.transaction(function(tx) {
            tx.executeSql('SELECT * FROM users where active=1', [], function(tx, rs) {
              console.log('Record count (expected to be 2): ' + rs.rows.item(0).token);
              token=rs.rows.item(0).token;
            }, function(tx, error) {
              $state.go('login');
            });
          },function(tx,error){
            $SFTools.myToast(error.message);
          },
          function(){
            if(token){
              console.log('token是'+token);
              //跳转
              $state.go('chat',{userid:userid,username:username});
            }
            else{
              $timeout(function(){
                $state.go('login');
              },100);
            }

          });
      });
    }
    $scope.showErrorMesPopup = function(title,cb) {
      $SFTools.myToast(title);
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
          iosocket.on('ansuserlist'+$scope.chats[i].id,function(obj){
            for(var i=0;i<$scope.chats.length;i++){
              if(obj._id.toString()===$scope.chats[i].id.toString()){
                $scope.chats[i].online=obj.online;
                $scope.$apply();
              }
            }
          });
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
    $scope.receiveMessage=function(){
      $rootScope.$on('ReciveMessage',function(event,obj){
        var chat=obj.message;
        var from=obj.from;
        var db = null;
        //根据当前path决定new值
        var newMessage=false;
        var path=$location.path();
        //path格式是 /chat/id/name
        var pathArray=path.split('/');
        if(pathArray[1]&&pathArray[1]==='chat'&&pathArray[2]===from._id){
          //说明当前路径在chat，并且和这个人说话，那么就不存在new的情况了。
          newMessage=false;
        }
        else{
          newMessage=true;
        }

        //向服务器发送消息，我收到了，你的标志位可以修改了
        iosocket.emit('ReciveMessage',{chatid:obj.message._id});

        //$SFTools.myToast('web端接收到的消息是'+from.name+'发送的'+chat.content+chat.meta.createAt);
        //存数据库
        document.addEventListener('deviceready', function() {
          var exist=true;
          db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
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
                db.executeSql('INSERT INTO chat VALUES (?,?,?,?,?,?)', [chat._id, chat.from, chat.to, chat.content, createtime.getTime(), 0]);
              }
            });

            if(exist){
              db.executeSql('update userinfo set name=?,image=? where id=?',[from.name,from.image,from._id]);
            }
            else{
              db.executeSql('insert into userinfo values(?,?,?,?)',[from._id,from.name,from.image,1]);
            }

            //最后更新首页表。数据不好查，只好建立新的表来保存，还可以提高首页性能
            // status说明：1：正常 | failed：发送失败 | bak：草稿
            db.executeSql('create table if not exists main_message(master,relation_user,relation_user_id,content,createAt,saw,status)');
            var master=chat.to;
            var relation_user=from.name;
            var relation_user_id=from._id;
            db.executeSql('select count(master) as mycount,saw from main_message where master=\''+master+'\' and relation_user_id=\''+relation_user_id+'\'',[],function(rs){
              var countMain = rs.rows.item(0).mycount;
              var saw=rs.rows.item(0).saw;
              var createAtTime=new Date(chat.meta.createAt);
              if(countMain>0){
                //存在
                db.executeSql('update main_message set content=?,createAt=?,saw=? where master=? and relation_user_id=?',[chat.content,createAtTime.getTime(),newMessage?(parseInt(saw)+1):0,master,relation_user_id]);
              }
              else{
                db.executeSql('insert into main_message values(?,?,?,?,?,?,?)',[master,relation_user,relation_user_id,chat.content,createAtTime.getTime(),newMessage?1:0,1]);
              }
            });




          },function(tx,error){
            alert(error.message);
          });
        });

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
                }
                else{
                  $scope.chats[i].new=0;
                }
              }
              else{
                if(newMessage){
                  $scope.chats[i].new=1;
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
                $scope.chats.unshift(newObj);
                break;
              }
            }
          }
        }
        $scope.$apply();
      })
    }
    $scope.initMessageFromSql=function(touser){
      document.addEventListener('deviceready', function() {
        //从sql读取今天并且没有查看过的所有信息
        var db=null;
        db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
        //var sqlStr='select chat.id,chat.content,chat.createAt,chat.saw,userinfo.id,userinfo.name,userinfo.image from chat,userinfo where chat.saw=0 and chat.from=userinfo.id';
        //今天的所有消息
        var date=new Date();
        var DateToday=new Date();
        DateToday.setFullYear(date.getFullYear(),date.getMonth(),date.getDay());
        var DateTodayTime=DateToday.getTime();

        console.log('出问题的sql语句加的参数是：'+touser);

        //一个sql语句无法完成，必须拼接对象了
        var sqlContentStr='select userinfo.name as username,chat.createAt as createAt,chat.id as chatid,chat.content as content,userinfo.id as id,M.new as newmessage'+
        ' from chat inner join userinfo on chat.fromuser=userinfo.id'+
        ' inner join '+
        ' (select count(content) as new,fromuser from chat where saw=0 and touser=\''+touser+'\'  group by fromuser) as M'+
        ' on chat.fromuser=M.fromuser,'+
        ' (select max(createAt) as createAt,fromuser from chat group by fromuser) as T'+
        ' where chat.fromuser=T.fromuser'+
        ' and chat.createAt=T.createAt'+
        ' order by createAt';

        var SqlAllStr='select chat.id,chat.content,chat.createAt,chat.saw,chat.fromuser,chat.touser,A.name as fromusername,B.name as tousername '+
        ' from chat,userinfo as A,userinfo as B'+
        ' where chat.fromuser=a.id'+
        ' and chat.touser=B.id'+
        ' and (fromuser=\''+touser+'\' or touser=\''+touser+'\')'+
        ' order by createAt desc';

        var SqlMainMessage='select * from main_message where master=\''+touser+'\' group by relation_user_id order by createAt';

        db.transaction(function(tx){
          tx.executeSql(SqlMainMessage,[],function(tx,rs){
            for(var i=0;i<rs.rows.length;i++){
              //console.log('有新的消息吗？'+rs.rows.item(i).content+rs.rows.item(i).fromname+rs.rows.item(i).saw+rs.rows.item(i).fromimage+rs.rows.item(i).createAt);
              console.log('222222222222222222222'+rs.rows.item(i).newmessage);

              for(var p in rs.rows.item(i)){
                console.log('tttttttttttttttttttt'+p);
              }

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
            }
          },function(tx,error){
            console.log('select error is'+error.message);
          });
        },function(tx,error){
          console.log('transaction error is'+error.message);
        },function(){
          $scope.$apply();
          console.log('transaction success');
        });
      });
    }
    //这个人的信息被看了，main列表的saw置0
    $scope.MessageSawListener=function(){
      $rootScope.$on('SawMessage',function(event,obj){
        alert('接到了看过了通知'+obj);
        for(var i=0;i<$scope.chats.length;i++){
          if($scope.chats[i].userid===obj){
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
            break;
          }
        }
      });
    }
    //服务器说，你发的消息我收到了，这时候main列表的处理
    $scope.ServerReciverListener=function(){
      $rootScope.$on('ServerRecive',function(event,obj){
        //alert('debug:服务器收到了，修改main列表');
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
          db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
          db.transaction(function(tx){
            var createAt=new Date(obj.message.meta.createAt);
            tx.executeSql('update main_message set content=?,createAt=?,saw=0 where master=? and relation_user_id=? and status=1',[obj.message.content,createAt.getTime(),obj.from,obj.to]);
            tx.executeSql('delete from main_message where master=? and relation_user_id=? and status=\'sending\' and createAt=?',[obj.from,obj.to,obj.timeid]);
          },function(error){
            //alert('main事务执行失败'+error);
          },function(){
            //alert('发送过程的消息确认完成');
          });
        });


      });
    }
    $scope.initMessageFromServer=function(){
      console.log('来自服务器的消息');
    }

    //聊天modal的方法
    $scope.messages=[];
    $scope.sendMessage='';
    $scope.keyBoardStatus=false;
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
                //alert('第'+i+'条信息'+rs.rows.item(i).content);
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
                  //alert('走这里了');
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
          },function(error){
          //alert(error);
        },
          function(){
            //alert($scope.messages.length);
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
    $scope.receiveMessagePerson=function(userid){
      $rootScope.$on('ReciveMessage',function(event,obj){
        //保存已经被main页面做了，所以实时显示即可
        if(userid===obj.from._id){
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
      $rootScope.$on('ServerRecive'+userid,function(event,obj){
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
    $scope.setSaw=function(userid,touser){
      //发送通知，告诉main页面，这些东西看过了。
      document.addEventListener('deviceready', function() {
        var db = null;
        db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
        //chat全部saw置1   main的saw清0
        db.transaction(function(tx){
          tx.executeSql('update chat set saw=1 where fromuser=? and touser=? and saw=0',[userid,touser]);
          tx.executeSql('update main_message set saw=0 where master=? and relation_user_id=?',[userid,touser]);
        },function(error){
        },function(){
          alert('发送我看过了这个通知');
          $rootScope.$broadcast('SawMessage',userid);
        })
      });
    }

  }]);
