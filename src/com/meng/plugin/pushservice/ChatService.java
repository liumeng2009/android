package com.meng.plugin.pushservice;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.os.Handler;
import android.os.IBinder;
import android.util.Log;
import android.widget.Toast;

import com.ionicframework.testtpl199249.R;

import io.socket.client.IO;
import io.socket.client.On;
import io.socket.emitter.Emitter;
import org.json.JSONException;
import org.json.JSONObject;

import java.net.URISyntaxException;
import java.util.Date;
import java.util.List;
import java.util.Timer;
import java.util.TimerTask;

import io.socket.client.Socket;

public class ChatService extends Service {

    public static final String TAG="ChatService";
    static final int NOTIFICATION_ID=0x123;
    NotificationManager nm;

    private Socket mSocket;
    private SQLiteDatabase db;
    private String username;
    private String _id;
    boolean isConnect=false;

    @Override
    public void onCreate(){
      super.onCreate();
      Log.d(TAG, "onCreate() executed");
      db=SQLiteDatabase.openOrCreateDatabase(this.getFilesDir().toString()+"/sfDB.db3",null);
      //ChatApplication app = (ChatApplication) getApplication();
      //mSocket = app.getSocket();
      try {
        mSocket = IO.socket(Constants.CHAT_SERVER_URL);
      } catch (URISyntaxException e) {
        e.printStackTrace();
      }
    }

    @Override
    public int onStartCommand(Intent intent,int flags,int startId){
      Log.d(TAG, "onStartCommand() executed");
      //数据库中找到当前激活的账户
      Cursor cursor=db.query("users",new String[]{"_id","name"},"active=?",new String[]{"1"},null,null,null);
      if(cursor.getCount()>0) {
        cursor.moveToFirst();
        username = cursor.getString(1);
        _id = cursor.getString(0);
        JSONObject json = new JSONObject();
        try {
          json.put("name", username);
          json.put("_id", _id);
          mSocket.emit("login", json);
        } catch (JSONException e) {
          e.printStackTrace();
        }
        mSocket.on(Socket.EVENT_CONNECT, onConnect);
        mSocket.on(Socket.EVENT_RECONNECT, onReConnect);
        mSocket.on(Socket.EVENT_DISCONNECT, onDisconnect);
        mSocket.on(Socket.EVENT_CONNECT_ERROR, onConnectError);
        mSocket.on(Socket.EVENT_CONNECT_TIMEOUT, onConnectError);
        mSocket.on("message", onReceiveMessage);
        mSocket.connect();
      }
      else{
        //数据库里面不存在这个用户
        Log.v(TAG,"不监听");
      }
      //heart beat
      //return super.onStartCommand(intent, flags, startId);
      return START_STICKY;
    }

    @Override
    public void onDestroy(){
        super.onDestroy();
        Log.d(TAG,"onDestroy() executed");
        mSocket.disconnect();
        mSocket.off(Socket.EVENT_CONNECT, onConnect);
        mSocket.off(Socket.EVENT_RECONNECT,onReConnect);
        mSocket.off(Socket.EVENT_DISCONNECT, onDisconnect);
        mSocket.off(Socket.EVENT_CONNECT_ERROR, onConnectError);
        mSocket.off(Socket.EVENT_CONNECT_TIMEOUT, onConnectTimeOut);
        mSocket.off("to"+_id,onReceiveMessage);

    }

    @Override
    public IBinder onBind(Intent intent) {
        // TODO: Return the communication channel to the service.
        throw new UnsupportedOperationException("Not yet implemented");
    }
    private Emitter.Listener onConnect = new Emitter.Listener() {
        @Override
        public void call(Object... args) {
          Log.v(TAG,"连接了");
          isConnect=true;
          //只要连接成功就发送一个带有名字的请求
          JSONObject json=new JSONObject();
          try {
            json.put("name",username);
            json.put("id",_id);
            mSocket.emit("connectsuccess",json);
          } catch (JSONException e) {
            e.printStackTrace();
          }
          //handler.removeCallbacks(runnable);
        }
    };

    private Emitter.Listener onReConnect = new Emitter.Listener() {
      @Override
      public void call(Object... args) {
        Log.v(TAG,"重新连接了"+mSocket.id());
      }
    };

    private Emitter.Listener onDisconnect = new Emitter.Listener() {
        @Override
        public void call(Object... args) {
          Log.v(TAG,"断开连接了");
          isConnect=false;
          //handler.postDelayed(runnable,1000);
        }
    };

    private Emitter.Listener onConnectError = new Emitter.Listener() {
        @Override
        public void call(Object... args) {
          Log.v(TAG,"连接错误");
          //Toast.makeText(ChatService.this,R.string.error_connect, Toast.LENGTH_LONG).show();
        }
    };

    private Emitter.Listener onConnectTimeOut = new Emitter.Listener() {
      @Override
      public void call(Object... args) {
        Log.v(TAG,"连接超时");
        //Toast.makeText(ChatService.this,R.string.error_connect, Toast.LENGTH_LONG).show();
      }
    };

    private Emitter.Listener onReceiveMessage = new Emitter.Listener() {
        @Override
        public void call(final Object... args) {
            JSONObject data = (JSONObject) args[0];
            Log.v(TAG,data.toString());
            //将消息存入数据库
            try {
                JSONObject messageJson=data.getJSONObject("message");
                JSONObject fromJson=data.getJSONObject("from");
                boolean isExistChats=DbTools.isExistTable(db,"chats");
                boolean isExistActor=DbTools.isExistTable(db,"actor");
                //建立chats表
                if(!isExistChats){
                    db.execSQL("create table chats(_id varchar(255) primary key,fromuser varchar(255),touser varchar(255),content varchar(4000),createAt date,saw int)");
                }
                //建立actor表
                if(!isExistChats){
                    db.execSQL("create table actor(_id varchar(255) primary key,name varchar(50),image clob)");
                }
                //将from和to这两个人的信息存入actor表，如果人存在，就不操作，如果不存在，从服务器请求这个人的信息，存入actor
                String from=messageJson.getString("from");
                String to=messageJson.getString("to");
                //from存入actor
                DbTools.saveActor(db,from);
                DbTools.saveActor(db,to);
                //将消息存入chats表
                if(DbTools.IsExist(db,"chats","_id",messageJson.getString("_id"))){
                    //这条信息存在，就不管了
                }
                else {
                    //信息不存在，就存入sql
                    ContentValues cvChats = new ContentValues();
                    cvChats.put("_id", messageJson.getString("_id"));
                    cvChats.put("fromuser", messageJson.getString("from"));
                    cvChats.put("touser", messageJson.getString("to"));
                    cvChats.put("content", messageJson.getString("content"));
                    JSONObject meta=messageJson.getJSONObject("meta");
                    cvChats.put("createAt", meta.getString("createAt"));
                    cvChats.put("saw", 0);
                    db.insert("chats",null,cvChats);
                }
              //向服务器发送回执，表明我收到了这条信息



                //发送通知
                nm=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
                Intent intent=new Intent(ChatService.this,com.ionicframework.testtpl199249.MainActivity.class);
                PendingIntent pi=PendingIntent.getActivity(ChatService.this,0,intent,0);
                final Notification.Builder builder = new Notification.Builder(ChatService.this);
                try {
                    builder.setAutoCancel(true)
                            .setTicker(fromJson.getString("name"))
                            .setSmallIcon(R.drawable.icon)
                            .setContentTitle(fromJson.getString("name"))
                            .setContentText(messageJson.getString("content").toString())
                            .setDefaults(Notification.DEFAULT_SOUND)
                            .setWhen(System.currentTimeMillis())
                            .setContentIntent(pi);
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                nm.notify(NOTIFICATION_ID,builder.getNotification());


            } catch (Exception e) {
                e.printStackTrace();
            }

        }
    };
}
