package com.meng.plugin.pushservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.util.Log;
import android.widget.Toast;

/**
 * Created by liumeng on 2016/8/23.
 */
public class BootPushServiceReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    Log.v("TAG", "开机自动服务自动启动....");
    ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
    NetworkInfo activeNetwork = cm.getActiveNetworkInfo();
    if (activeNetwork != null) { // connected to the internet
      Log.v("TAG","符合条件，启动服务");
      Intent startServiceIntent = new Intent(context, ChatService.class);
      context.startService(startServiceIntent);
      Log.d("From receiver", "connected");
    } else {
      Log.d("From receiver", "not connected");
      // not connected to the internet
    }
  }
}
