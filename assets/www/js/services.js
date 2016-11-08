angular.module('starter.services', ['loginServices','usercenterServices','schoolServices','gradeServices','childrenServices','mainServices'])
  .factory('$SFTools',['$cordovaToast','$cordovaSQLite','$cordovaDialogs',function($cordovaToast,$cordovaSQLite,$cordovaDialogs){
    return {
      myToast:function(msg){
        document.addEventListener('deviceready',function() {
          $cordovaToast
            .show(msg, 'short', 'center')
            .then(function (success) {
            }, function (error) {
            });
        });
      },
      myDialog:function(msg,title,buttonName,callback){
        document.addEventListener('deviceready',function() {
          $cordovaDialogs
            .alert(msg, title,buttonName)
            .then(function (success) {
              callback();
            });
        });
      },
      getToken:function(callback){
        if(token){
          console.log('来自全局变量');
          callback(token);
        }
        else{
          document.addEventListener('deviceready',function() {
            var db = window.sqlitePlugin.openDatabase({name: 'sfDB.db3', location: 'default'});
            db.transaction(function(tx) {
              tx.executeSql('SELECT * FROM users where active=1', [], function (tx, rs) {
                console.log('Record count (expected to be 2): ' + rs.rows.item(0).token);
                token={
                  userid: rs.rows.item(0).id,
                  name: rs.rows.item(0).name,
                  token: rs.rows.item(0).token,
                  createAt:rs.rows.item(0).createAt,
                  image:rs.rows.item(0).image
                }
              })
            },function(tx,error){
              return callback('');
            },function(){
              console.log('来自数据库');
              callback(token);
            });
          });
        }
      }
    }
  }]);
