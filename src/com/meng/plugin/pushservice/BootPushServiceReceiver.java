package com.meng.plugin.pushservice;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

/**
 * Created by liumeng on 2016/8/23.
 */
public class BootPushServiceReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    Intent service = new Intent(context,ChatService.class);
    intent.putExtra("username","dreams");
    intent.putExtra("_id","577bc1ffca1d345501cf73b2");
    context.startService(service);
    Log.v("TAG", "开机自动服务自动启动.....");
  }
}
