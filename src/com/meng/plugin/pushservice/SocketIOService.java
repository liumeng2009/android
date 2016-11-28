package com.meng.plugin.pushservice;

import android.app.ActivityManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.ComponentName;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.os.Binder;
import android.os.IBinder;
import android.support.v4.content.LocalBroadcastManager;
import android.support.v7.app.NotificationCompat;
import android.util.Log;
import com.ionicframework.testtpl199249.MainActivity;
import com.ionicframework.testtpl199249.R;
import com.ionicframework.testtpl199249.AppContext;


import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.GregorianCalendar;
import java.util.List;
import java.util.Locale;

import io.socket.client.Ack;
import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;

import android.content.ContentValues;

public class SocketIOService extends Service {
    private  SocketListener socketListener;
    private Boolean appConnectedToService;
    private  Socket mSocket;
    private boolean serviceBinded = false;
    private final LocalBinder mBinder = new LocalBinder();
    private String username;
    private String userid;
    private SQLiteDatabase db;
    public void setAppConnectedToService(Boolean appConnectedToService) {
        this.appConnectedToService = appConnectedToService;
    }

    public void setSocketListener(SocketListener socketListener) {
        this.socketListener = socketListener;
    }

    public class LocalBinder extends Binder{
       public SocketIOService getService(){
            return SocketIOService.this;
        }
    }

    public void setServiceBinded(boolean serviceBinded) {
        this.serviceBinded = serviceBinded;
    }

    @Override
    public IBinder onBind(Intent intent) {
       return mBinder;
    }

    @Override
    public void onCreate() {
      super.onCreate();
      //db=SQLiteDatabase.openOrCreateDatabase(getApplicationContext().getFilesDir()+"/sfDB.db3",null);
      //如果应用文件夹没有databases文件夹时，会异常
      String DbDirPath=getApplicationContext().getDatabasePath("sfDB.db3").getAbsolutePath();
      DbDirPath= DbDirPath.substring(0,DbDirPath.lastIndexOf("/"));
      File file=new File(DbDirPath);
      if(file.exists()){

      }
      else{
        try{
          file.mkdir();
        }
        catch (Exception e){

        }
      }

      db = SQLiteDatabase.openOrCreateDatabase(getApplicationContext().getDatabasePath("sfDB.db3"), null);
      //建立users表
      String users_table = "create table if not exists users(id,name,active,image,token,createAt,deviceId)";
      db.execSQL(users_table);
      //建立userinfo表
      String userinfo_table = "create table if not exists userinfo(id,name,image,showInMain)";
      db.execSQL(userinfo_table);
      //建立chat表
      String chat_table = "CREATE TABLE IF NOT EXISTS chat (id,fromuser,touser,content,createAt,saw)";
      db.execSQL(chat_table);
      //建立main_message表
      String main_message_table = "create table if not exists main_message(master,relation_user,relation_user_id,content,createAt,saw,status,relation_chat_id)";
      db.execSQL(main_message_table);
      //initUser();
      //initializeSocket();
      //addSocketHandlers();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.v("TAG","服务销毁了");
        closeSocketSession();
    }

    @Override
    public boolean onUnbind(Intent intent) {
        return serviceBinded;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        initUser();
        if(username!=null&&userid!=null&&username!=""&&userid!="") {
          initializeSocket();
          addSocketHandlers();
        }
        return START_STICKY;
    }

    private void initUser(){
      Cursor cursor=db.rawQuery("select id,name from users where active=1",null);
      if(cursor.getCount()>0) {
        cursor.moveToFirst();
        username = cursor.getString(1);
        userid = cursor.getString(0);
      }
    }

    private void initializeSocket() {
        try{
            IO.Options options = new IO.Options();
            options.forceNew = true;
            mSocket = IO.socket(Constants.CHAT_SERVER_URL,options);
        }
        catch (Exception e){
            Log.e("Error", "Exception in socket creation");
            throw new RuntimeException(e);
        }
    }

    private void closeSocketSession(){
        mSocket.disconnect();
        mSocket.off();
    }
    private void addSocketHandlers(){
        mSocket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                Intent intent = new Intent(SocketEventConstants.socketConnection);
                intent.putExtra("connectionStatus", true);
                broadcastEvent(intent);
                //socket用户登录
                JSONObject json = new JSONObject();
                try {
                  json.put("name", username);
                  json.put("_id", userid);
                  json.put("type","service");
                  mSocket.emit("login", json);
                } catch (JSONException e) {
                  e.printStackTrace();
                }
            }
        });

        mSocket.on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                Intent intent = new Intent(SocketEventConstants.socketConnection);
                intent.putExtra("connectionStatus", false);
                broadcastEvent(intent);
            }
        });


        mSocket.on(Socket.EVENT_CONNECT_ERROR, new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                Intent intent = new Intent(SocketEventConstants.connectionFailure);
                broadcastEvent(intent);
            }
        });

        mSocket.on(Socket.EVENT_CONNECT_TIMEOUT, new Emitter.Listener() {
            @Override
            public void call(Object... args) {
                Intent intent = new Intent(SocketEventConstants.connectionFailure);
                broadcastEvent(intent);
            }
        });
        addNewMessageHandler();

        mSocket.connect();
    }

    public void addNewMessageHandler(){
        mSocket.off(SocketEventConstants.newMessage);
        mSocket.on(SocketEventConstants.newMessage, new Emitter.Listener() {
            @Override
            public void call(final Object... args) {

                JSONObject data = (JSONObject) args[0];
                String id;
                String fromuser;
                String touser;
                String content;
                long createAt;
                try {
                  JSONObject chat=data.getJSONObject("message");
                  JSONObject from=data.getJSONObject("from");
                  JSONObject meta=chat.getJSONObject("meta");

                  id = chat.getString("_id");
                  fromuser = chat.getString("from");
                  touser = chat.getString("to");
                  content = chat.getString("content");
                  String createAtDate = meta.getString("createAt");
                  SimpleDateFormat sdf=new SimpleDateFormat("yyyy-MM-dd'T'hh:mm:ss.SSS'Z'", Locale.ENGLISH);
                  Date d= null;
                  try {
                    d = sdf.parse(createAtDate);
                  } catch (ParseException e) {
                    e.printStackTrace();
                  }
                  Calendar c=new GregorianCalendar();
                  c.setTime(d);
                  c.add(Calendar.HOUR,8);
                  d=c.getTime();
                  createAt=d.getTime();
                  Log.v("TAG",String.valueOf(createAt));

                  ContentValues cv=new ContentValues();
                  cv.put("id",id);
                  cv.put("fromuser",fromuser);
                  cv.put("touser",touser);
                  cv.put("content",content);
                  cv.put("createAt",createAt);
                  cv.put("saw",0);
                  if (isForeground("com.ionicframework.testtpl199249")) {
                    //app在前台,服务不需要插入数据了
                  } else {
                    //app在后台，插入数据
                    //发送者的身份，存入userinfo表
                    String userinfoExist="select * from userinfo where id='"+from.getString("_id")+"'";
                    Cursor cursor1=db.rawQuery(userinfoExist,null);
                    if(cursor1.getCount()!=0){
                      //存在的话，就把z这个用户的信息更新
                      Log.v("TAG","修改用户信息");
                      ContentValues cvUserInfoUpdate=new ContentValues();
                      //cvUserInfoUpdate.put("image",from.getString("image"));
                      cvUserInfoUpdate.put("name",from.getString("name"));
                      db.update("userinfo",cvUserInfoUpdate,"id=?",new String[]{from.getString("_id")});
                    }
                    else{
                      //不存在的时候，把这个用户信息插入
                      Log.v("TAG","插入用户信息");
                      ContentValues cvUserInfoNew=new ContentValues();
                      cvUserInfoNew.put("id",from.getString("id"));
                      cvUserInfoNew.put("image",from.getString("image"));
                      cvUserInfoNew.put("name",from.getString("name"));
                      cvUserInfoNew.put("showInMain",1);
                      db.insert("userinfo",null,cvUserInfoNew);
                    }
                    //判断重复
                    String chatExist="select * from chat where id='"+chat.getString("_id")+"'";
                    Cursor cursor2=db.rawQuery(chatExist,null);
                    if(cursor2.getCount()!=0){
                      Log.v("TAG","有这条信息");
                      //存在，就不能插入了
                    }
                    else{
                      //不存在
                      Log.v("TAG","没有这条信息，需要insert");
                     db.insert("chat",null,cv);
                    }

                    //修改main表 接收消息后，根据main表的relation_chat_id，判断。如果这条消息id和表里面存的一致，则说明page已经做了操作了，不需要数据库操作了，如果不一致，就需要改变数据库。
                    Log.v("Info","开始进行main_message的更新");
                    String masterExist="select * from main_message where master='"+touser+"' and status=1";
                    Cursor cursor3=db.rawQuery(masterExist,null);
                    if(cursor3.getCount()!=0){
                      //存在这个人，就不能插入了,要看看这条数据的relation_chat_id是否一致
                      cursor3.moveToFirst();
                      String chatid=cursor3.getString(7);
                      int saw2=cursor3.getInt(5);
                      if(chatid==id){
                        //不需要修改数据了
                        Log.v("none","service不需要更新main，因为page已经做了");
                      }
                      else{
                        //需要修改数据
                        Log.v("Update","service更新main消息"+content);
                        ContentValues cvEditMain=new ContentValues();
                        cvEditMain.put("content",content);
                        cvEditMain.put("createAt",createAt);
                        cvEditMain.put("saw",saw2+1);
                        db.update("main_message",cvEditMain,"master=? and status=1",new String[]{touser});
                      }
                    }
                    else{
                      Log.v("create","service新增main消息");
                      //不存在这个人，需要向main_message插入新一条消息
                      ContentValues cvMainMessage=new ContentValues();
                      cvMainMessage.put("master",touser);
                      cvMainMessage.put("relation_user",from.getString("name"));
                      cvMainMessage.put("relation_user_id",fromuser);
                      cvMainMessage.put("content",content);
                      cvMainMessage.put("createAt",createAt);
                      cvMainMessage.put("saw",0);
                      cvMainMessage.put("status",1);
                      cvMainMessage.put("relation_chat_id",id);
                      db.insert("main_message",null,cvMainMessage);
                    }

                    //发送消息
                    showNotificaitons(from.getString("_id"),from.getString("name"),content);
                  }
                } catch (JSONException e) {
                  Log.v("ERROR",e.getStackTrace().toString());
                  return;
                }

            }
        });
    }

    public void removeMessageHandler() {
        mSocket.off(SocketEventConstants.newMessage);
    }

    public void emit(String event,Object[] args,Ack ack){
        mSocket.emit(event, args, ack);
    }
    public void emit (String event,Object... args) {
        try {
            mSocket.emit(event, args,null);
        }
        catch (Exception e){
            e.printStackTrace();
        }
    }

    public void addOnHandler(String event,Emitter.Listener listener){
            mSocket.on(event, listener);
    }

    public void connect(){
        mSocket.connect();
    }

    public void disconnect(){
        mSocket.disconnect();
    }

    public void restartSocket(){
        mSocket.off();
        mSocket.disconnect();
        addSocketHandlers();
    }

    public void off(String event){
        mSocket.off(event);
    }

    private void broadcastEvent(Intent intent){
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

    public boolean isSocketConnected(){
        if (mSocket == null){
            return false;
        }
        return mSocket.connected();
    }

    public void showNotificaitons(String userid,String username, String message){
        Intent toLaunch = new Intent(getApplicationContext(), MainActivity.class);

        //toLaunch.putExtra("chatWith",userid);
        //toLaunch.putExtra("username",username);
        toLaunch.putExtra("message",message);

        toLaunch.setAction("android.intent.action.MAIN");
        PendingIntent pIntent = PendingIntent.getActivity(getApplicationContext(), 0,toLaunch,
                PendingIntent.FLAG_UPDATE_CURRENT);


        Notification n  = new NotificationCompat.Builder(this)
                .setContentTitle(username)
                .setContentText(message)
                .setContentIntent(pIntent)
                .setDefaults(Notification.DEFAULT_SOUND)
                .setAutoCancel(true)
                .setSmallIcon(R.drawable.icon)
                .build();
        NotificationManager notificationManager =
                (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        notificationManager.cancelAll();
        notificationManager.notify(0, n);
    }

    public boolean isForeground(String myPackage) {
        //ActivityManager manager = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
        //List<ActivityManager.RunningTaskInfo> runningTaskInfo = manager.getRunningTasks(1);
        //ComponentName componentInfo = runningTaskInfo.get(0).topActivity;
        //return componentInfo.getPackageName().equals(myPackage);
      AppContext appContext=(AppContext) getApplication();
      return appContext.getAppFrom();
    }
}
