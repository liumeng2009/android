package com.liumeng;

import android.content.Intent;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * This class echoes a string called from JavaScript.
 */
public class MyMath extends CordovaPlugin {
    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        if (action.equals("Plus")) {
            Intent intent = new Intent(cordova.getActivity(), ImageZoomActivity.class);
            String type=args.getString(0);
            if(type=="URI"){
              intent.putExtra("type","URI");
              intent.putExtra("uriString",args.getString(1));
            }
            else if(type=="URL"){
              intent.putExtra("type","URI");
              intent.putExtra("uriString",args.getString(1));
            }
            //哪张表
            //intent.putExtra("type",args.getString(0));


            //发送人
            //intent.putExtra("userid",args.getString(1));
            //消息id
            //intent.putExtra("id",args.getString(2));

            this.cordova.getActivity().startActivity(intent);
            return true;
        }
        return false;
    }
}
