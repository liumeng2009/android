/*
       Licensed to the Apache Software Foundation (ASF) under one
       or more contributor license agreements.  See the NOTICE file
       distributed with this work for additional information
       regarding copyright ownership.  The ASF licenses this file
       to you under the Apache License, Version 2.0 (the
       "License"); you may not use this file except in compliance
       with the License.  You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

       Unless required by applicable law or agreed to in writing,
       software distributed under the License is distributed on an
       "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
       KIND, either express or implied.  See the License for the
       specific language governing permissions and limitations
       under the License.
 */

package com.ionicframework.testtpl199249;

import android.app.ActivityManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.sqlite.SQLiteDatabase;
import android.os.Bundle;
import android.preference.Preference;
import android.util.Log;
import android.widget.Toast;

import org.apache.cordova.*;

import java.io.File;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import com.xiaomi.mipush.sdk.MiPushClient;


public class MainActivity extends CordovaActivity
{
    public static List<String> logList = new CopyOnWriteArrayList<String>();
    private DemoApplication appContext;
    private SQLiteDatabase db;
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        if(appContext == null)
          appContext = (DemoApplication) getApplication();

        SharedPreferences preferences=getSharedPreferences("startPage",MODE_WORLD_READABLE);

        Intent intent = getIntent();
        String userid = intent.getStringExtra("chatWith");
        String username=intent.getStringExtra("username");

        if(userid!=null&&userid!=""&&username!=null&&username!=""){
          //通过intent过来的，进去chat页面,用sharedPreferences
          SharedPreferences.Editor editor=preferences.edit();
          editor.putString("startPage","chat");
          editor.commit();

        }
        else{
          SharedPreferences.Editor editor=preferences.edit();
          editor.putString("startPage","main");
          editor.commit();
        }
        //initDatabase();
        DemoApplication.setMainActivity(this);
        loadUrl(launchUrl);
        //Intent serviceIntent = new Intent(this,SocketIOService.class);
        //startService(serviceIntent);
    }

    @Override
    protected void onPause() {
      Log.v("Info","paused");
      super.onPause();
      //appContext.setBack();
    }
    @Override
    protected void onResume() {
      // TODO Auto-generated method stub
      super.onResume();
      //appContext.setFront();
    }
    private void initDatabase(){
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
      String users_table = "create table if not exists users(id text primary key not null unique ,name,active,image,token,createAt,deviceId)";
      db.execSQL(users_table);
      //建立userinfo表
      String userinfo_table = "create table if not exists userinfo(id text primary key not null unique,name,image,showInMain)";
      db.execSQL(userinfo_table);
      //建立chat表
      String chat_table = "CREATE TABLE IF NOT EXISTS chat (id text primary key not null unique,fromuser,touser,content,createAt,saw)";
      db.execSQL(chat_table);
      //建立main_message表
      String main_message_table = "create table if not exists main_message(master,relation_user,relation_user_id,content,createAt,saw,status,relation_chat_id)";
      db.execSQL(main_message_table);

      String nosend_table="create table if not exists nosend(id,fromuser,touser,content,status)";
      db.execSQL(nosend_table);

      db.close();

    }

}
