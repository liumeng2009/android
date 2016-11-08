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
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import com.meng.plugin.pushservice.SocketIOService;

import org.apache.cordova.*;


public class MainActivity extends CordovaActivity
{
    private AppContext appContext;
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        if(appContext == null)
          appContext = (AppContext) getApplication();
/*
        Intent intent = getIntent();
        String userid = intent.getStringExtra("chatWith");
        String username=intent.getStringExtra("username");

        if(userid!=null&&userid!=""&&username!=null&&username!=""){
          //通过intent过来的，进去chat页面
        }
        else{
          loadUrl(launchUrl);
        }

*/
      loadUrl(launchUrl);
        Intent serviceIntent = new Intent(this,SocketIOService.class);
        startService(serviceIntent);
    }

    @Override
    protected void onPause() {
      Log.v("Info","paused");
      super.onPause();
      appContext.setBack();
    }
    @Override
    protected void onResume() {
      // TODO Auto-generated method stub
      super.onResume();
      appContext.setFront();
    }

}
