angular.module('starter.services', ['loginServices','usercenterServices','schoolServices','gradeServices','childrenServices','mainServices'])
  .factory('$SFTools',['$cordovaToast','$cordovaSQLite','$cordovaDialogs','$cordovaPreferences',function($cordovaToast,$cordovaSQLite,$cordovaDialogs,$cordovaPreferences){
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
        document.addEventListener('deviceready',function() {
          $cordovaPreferences.fetch('loginUser')
            .success(function(value) {
              console.log("Success: " + value);
              var db = window.sqlitePlugin.openDatabase({name: value+'.db3', location: 'default'});
              db.executeSql('SELECT * FROM users where active=1', [], function (rs) {
                if(rs.rows.length>0){
                  token={
                    userid: rs.rows.item(0).id,
                    name: rs.rows.item(0).name,
                    token: rs.rows.item(0).token,
                    createAt:rs.rows.item(0).createAt,
                    image:rs.rows.item(0).image,
                    deviceid:rs.rows.item(0).deviceId
                  }
                  callback(token);
                }
                else{
                  callback({});
                }
              },function(error){
                console.log(error)
                callback({});
              });
            })
            .error(function(error) {
              console.log("Error: " + error);
              callback({});
            })
          });
      },
      getStartPage:function(callback){
          document.addEventListener('deviceready',function() {
            $cordovaPreferences.fetch('startPage')
              .success(function(value) {
                callback(value)
              })
              .error(function(error) {
                callback('main');
              })
          });
      }
    }
  }]);
