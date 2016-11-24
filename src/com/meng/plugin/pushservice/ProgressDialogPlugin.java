package com.meng.plugin.pushservice;

import android.content.Intent;
import android.util.Log;
import android.widget.Toast;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.json.*;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteException;
import android.content.ContentValues;

import java.sql.Timestamp;
import java.util.Date;
import java.text.SimpleDateFormat;
import io.socket.client.Socket;

/**
 * Created by liumeng on 2016/8/17.
 */
public class ProgressDialogPlugin extends CordovaPlugin {
    CallbackContext callbackContext;

    public ProgressDialogPlugin(){

    }

    @Override
    public void pluginInitialize(){

    }

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException{
        this.callbackContext = callbackContext;
        Log.v("TAG",action);
        if (action.equals("start")) {
            //启动服务
            Intent intent =new Intent(cordova.getActivity(),SocketIOService.class);
            cordova.getActivity().startService(intent);
            return true;
        }
        return false;
    }
}
