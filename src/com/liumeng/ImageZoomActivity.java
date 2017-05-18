package com.liumeng;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.net.Uri;
import android.os.Bundle;

import com.ionicframework.testtpl199249.R;
import com.liumeng.view.ZoomImageView;

public class ImageZoomActivity extends Activity {
  SQLiteDatabase db;
  ZoomImageView myImageView;
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    overridePendingTransition(android.R.anim.fade_in,0);
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_image_zoom);
    myImageView=(ZoomImageView)findViewById(R.id.myImageView);

    Intent intent= getIntent();
    String type=intent.getStringExtra("type");

    if(type=="URI"){
      String uriStr=intent.getStringExtra("uriString");
      queryUri(uriStr);
    }
    else if(type=="URL"){
      String messageId=intent.getStringExtra("messageId");
      String userid=intent.getStringExtra("userId");
      queryChat(userid,messageId);
    }
    else{

    }

  }
  private void queryChat(String userid,String id){
    db = openOrCreateDatabase(userid+".db3", Context.MODE_PRIVATE, null);
    String[] fields={"id","fromuser","touser","imageurl","imageuri"};
    String[] selectArgs={id};
    Cursor cursor=db.query("chat",fields,"id=?",selectArgs,null,null,null);
    if(cursor.moveToFirst()){
      for(int i=0;i<cursor.getCount();i++){
        cursor.move(i);
        String fromuser=cursor.getString(1);
        String touser=cursor.getString(2);
        String imageurl=cursor.getString(3);
        String imageuri=cursor.getString(4);

        //图片信息是自己发的，那么直接读取uri内的图片就可以
        if(fromuser==userid){
          Uri imageUri=Uri.parse(imageuri);
          myImageView.setImageURI(imageUri);
        }
      }
    }
  }

  private void queryUri(String uri){
    Uri imageUri=Uri.parse(uri);
    myImageView.setImageURI(imageUri);
  }

  @Override
  public void finish(){
    super.finish();
    overridePendingTransition(0,android.R.anim.fade_out);
  }
}
