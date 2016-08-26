/**
 * Created by Administrator on 2016/7/19.
 */
$(function () {

  var iosocket = io.connect('http://localhost:3000');

  iosocket.emit('login', {
    username: 'hahahaha'
  });

  iosocket.on('connect', function () {
    //$('#incomingChatMessages').append($('<li>Connected</li>'));

    /*
    iosocket.on('message', function (message) {
      $('#incomingChatMessages').append($('<li></li>').text(message.username+'说：'+message.content));
    });

    iosocket.on('login', function (message) {
      $('#userlist').append($('<li></li>').text(message.onlineCount));

    });
    */
    iosocket.on('to#{from}', function (message) {
      $('#incomingChatMessages').append($('<li></li>').text(message.from+'对你说：'+message.mess));

    });

    iosocket.on('broadcast_join',function(data){
      console.log(data.username + '加入了聊天室');
    });
    /*
    iosocket.on('disconnect', function () {
      $('#incomingChatMessages').append('<li>Disconnected</li>');
    });
    */
  });

  $('#outgoingChatMessage').keypress(function (event) {
    if (event.which == 13) {
      event.preventDefault();
      //iosocket.send({username:'heheh',content:$('#outgoingChatMessage').val()});
      iosocket.emit('private message','#{from}','#{to}',$('#outgoingChatMessage').val());

      $('#incomingChatMessages').append($('<li></li>').text('我说：'+$('#outgoingChatMessage').val()));
      $('#outgoingChatMessage').val('');
    }
  });
})
