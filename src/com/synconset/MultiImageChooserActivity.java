/*
 * Copyright (c) 2012, David Erosa
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following  conditions are met:
 *
 *   Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 *   Redistributions in binary form must reproduce the above copyright notice,
 *      this list of conditions and the following  disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING,  BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT  SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR  BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDIN G NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH  DAMAGE
 *
 * Code modified by Andrew Stephan for Sync OnSet
 *
 */

package com.synconset;

import java.io.ByteArrayOutputStream;
import java.io.FileNotFoundException;
import java.net.URI;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;

import com.ionicframework.testtpl199249.R;
import com.synconset.FakeR;
import com.yalantis.ucrop.UCrop;
import com.yalantis.ucrop.UCropActivity;
import android.app.Activity;
import android.app.ActionBar;
import android.app.AlertDialog;
import android.app.LoaderManager;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.CursorLoader;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.Loader;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Matrix;
import android.net.Uri;
import android.os.AsyncTask;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.support.annotation.NonNull;
import android.util.Base64;
import android.util.Log;
import android.util.SparseBooleanArray;
import android.view.Display;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.AbsListView;
import android.widget.AbsListView.OnScrollListener;
import android.widget.AdapterView;
import android.widget.AdapterView.OnItemClickListener;
import android.widget.BaseAdapter;
import android.widget.GridView;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import com.victor.loading.rotate.RotateLoading;

public class MultiImageChooserActivity extends Activity implements OnItemClickListener,
  LoaderManager.LoaderCallbacks<Cursor> {
  private static final String TAG = "ImagePicker";

  public static final int NOLIMIT = -1;
  public static final String MAX_IMAGES_KEY = "MAX_IMAGES";
  public static final String WIDTH_KEY = "WIDTH";
  public static final String HEIGHT_KEY = "HEIGHT";
  public static final String QUALITY_KEY = "QUALITY";
  private static final int MEDIA_TYPE_IMAGE = 1;
  private static final int CAPTURE_IMAGE_ACTIVITY_REQUEST_CODE=123;

  private ImageAdapter ia;

  private Cursor imagecursor, actualimagecursor;
  private int image_column_index, image_column_orientation, actual_image_column_index, orientation_column_index;
  private int colWidth;

  private static final int CURSORLOADER_THUMBS = 0;
  private static final int CURSORLOADER_REAL = 1;

  private Map<String, Integer> fileNames = new HashMap<String, Integer>();
  private Map<String,Integer> resultFileName=new HashMap<String, Integer>();
  private SparseBooleanArray checkStatus = new SparseBooleanArray();

  private int maxImages;
  private int maxImageCount;

  private int hasCamara=0;

  private int desiredWidth;
  private int desiredHeight;
  private int quality;

  private GridView gridView;

  private final ImageFetcher fetcher = new ImageFetcher();

  private int selectedColor = 0xff32b2e1;
  private boolean shouldRequestThumb = true;

  private FakeR fakeR;

  private RotateLoading progress;

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    fakeR = new FakeR(this);
    setContentView(fakeR.getId("layout", "multiselectorgrid"));
    fileNames.clear();

    maxImages = getIntent().getIntExtra(MAX_IMAGES_KEY, NOLIMIT);
    desiredWidth = getIntent().getIntExtra(WIDTH_KEY, 0);
    desiredHeight = getIntent().getIntExtra(HEIGHT_KEY, 0);
    quality = getIntent().getIntExtra(QUALITY_KEY, 0);
    maxImageCount = maxImages;
    if(maxImageCount==1) {
      hasCamara=1;
    }
    else{
      hasCamara=0;
    }

    Display display = getWindowManager().getDefaultDisplay();
    int width = display.getWidth();

    colWidth = width / 4;

    gridView = (GridView) findViewById(fakeR.getId("id", "gridview"));
    gridView.setOnItemClickListener(this);
    gridView.setOnScrollListener(new OnScrollListener() {
      private int lastFirstItem = 0;
      private long timestamp = System.currentTimeMillis();

      @Override
      public void onScrollStateChanged(AbsListView view, int scrollState) {
        if (scrollState == SCROLL_STATE_IDLE) {
          shouldRequestThumb = true;
          ia.notifyDataSetChanged();
        }
      }

      @Override
      public void onScroll(AbsListView view, int firstVisibleItem, int visibleItemCount, int totalItemCount) {
        float dt = System.currentTimeMillis() - timestamp;
        if (firstVisibleItem != lastFirstItem) {
          double speed = 1 / dt * 1000;
          lastFirstItem = firstVisibleItem;
          timestamp = System.currentTimeMillis();

          // Limit if we go faster than a page a second
          shouldRequestThumb = speed < visibleItemCount;
        }
      }
    });


    ia = new ImageAdapter(this);
    gridView.setAdapter(ia);

    LoaderManager.enableDebugLogging(false);
    getLoaderManager().initLoader(CURSORLOADER_THUMBS, null, this);
    getLoaderManager().initLoader(CURSORLOADER_REAL, null, this);
    setupHeader();
    updateAcceptButton();
    //progress=null;
    progress = (RotateLoading) findViewById(R.id.rotateloading);
    //progress.start();
    //progress = new ProgressDialog(this);
    //progress.setTitle(R.string.processing_images_header);
    //progress.setMessage(MultiImageChooserActivity.this.getResources().getString(R.string.processing_images_message));
  }

  @Override
  public void onPause(){
    fileNames.clear();
    updateAcceptButton();
    progress.stop();
    super.onPause();
  }

  @Override
  public void onItemClick(AdapterView<?> arg0, View view, int position, long id) {
    String name = getImageName(position-hasCamara);
    int rotation = getImageRotation(position-hasCamara);
    if(hasCamara==1){
      if(position==0){
        //Toast.makeText(MultiImageChooserActivity.this,"打开摄像头",Toast.LENGTH_SHORT).show();
        Intent intent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
        Uri fileUri = getOutputMediaFileUri(MEDIA_TYPE_IMAGE); // create a file to save the image
        Log.v("URI",fileUri.toString());
        intent.putExtra(MediaStore.EXTRA_OUTPUT, fileUri);
        startActivityForResult(intent, CAPTURE_IMAGE_ACTIVITY_REQUEST_CODE);
      }
    }
    if (name == null) {
      return;
    }
    boolean isChecked = !isChecked(position);
    if (maxImages == 0 && isChecked) {
      isChecked = false;
      Toast.makeText(MultiImageChooserActivity.this,"最多只能选择"+maxImageCount+"张图片",Toast.LENGTH_SHORT).show();
    } else if (isChecked) {
      fileNames.put(name, new Integer(rotation));
      if (maxImageCount == 1) {
        this.selectClicked(null);
      } else {
        maxImages--;
        ImageView imageView = (ImageView)view;
        if (android.os.Build.VERSION.SDK_INT>=16) {
          imageView.setImageAlpha(128);
        } else {
          imageView.setAlpha(128);
        }
        view.setBackgroundColor(selectedColor);
      }
    } else {
      fileNames.remove(name);
      maxImages++;
      ImageView imageView = (ImageView)view;
      if (android.os.Build.VERSION.SDK_INT>=16) {
        imageView.setImageAlpha(255);
      } else {
        imageView.setAlpha(255);
      }
      view.setBackgroundColor(Color.TRANSPARENT);
    }

    checkStatus.put(position, isChecked);
    updateAcceptButton();
  }

  @Override
  public Loader<Cursor> onCreateLoader(int cursorID, Bundle arg1) {
    CursorLoader cl = null;

    ArrayList<String> img = new ArrayList<String>();
    switch (cursorID) {

      case CURSORLOADER_THUMBS:
        img.add(MediaStore.Images.Media._ID);
        img.add(MediaStore.Images.Media.ORIENTATION);
        break;
      case CURSORLOADER_REAL:
        img.add(MediaStore.Images.Thumbnails.DATA);
        img.add(MediaStore.Images.Media.ORIENTATION);
        break;
      default:
        break;
    }

    cl = new CursorLoader(MultiImageChooserActivity.this, MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
      img.toArray(new String[img.size()]), null, null, "DATE_MODIFIED DESC");
    return cl;
  }

  @Override
  public void onLoadFinished(Loader<Cursor> loader, Cursor cursor) {
    if (cursor == null) {
      // NULL cursor. This usually means there's no image database yet....
      return;
    }

    switch (loader.getId()) {
      case CURSORLOADER_THUMBS:
        imagecursor = cursor;
        image_column_index = imagecursor.getColumnIndex(MediaStore.Images.Media._ID);
        image_column_orientation = imagecursor.getColumnIndex(MediaStore.Images.Media.ORIENTATION);
        ia.notifyDataSetChanged();
        break;
      case CURSORLOADER_REAL:
        actualimagecursor = cursor;
        String[] columns = actualimagecursor.getColumnNames();
        actual_image_column_index = actualimagecursor.getColumnIndexOrThrow(MediaStore.Images.Media.DATA);
        orientation_column_index = actualimagecursor.getColumnIndexOrThrow(MediaStore.Images.Media.ORIENTATION);
        break;
      default:
        break;
    }
  }

  @Override
  public void onLoaderReset(Loader<Cursor> loader) {
    if (loader.getId() == CURSORLOADER_THUMBS) {
      imagecursor = null;
    } else if (loader.getId() == CURSORLOADER_REAL) {
      actualimagecursor = null;
    }
  }

  public void cancelClicked(View ignored) {
    setResult(RESULT_CANCELED);
    finish();
  }

  public void selectClicked(View ignored) {
    ((TextView) getActionBar().getCustomView().findViewById(fakeR.getId("id", "actionbar_done_textview"))).setVisibility(View.INVISIBLE);
    //getActionBar().getCustomView().findViewById(fakeR.getId("id", "actionbar_done")).setVisibility(View.INVISIBLE);
    progress.start();
    Intent data = new Intent();
    if (fileNames.isEmpty()) {
      this.setResult(RESULT_CANCELED);
      progress.stop();
      finish();
    } else {
      if(hasCamara==1){
        for(String key:fileNames.keySet()){
          File file=new File(key);
          UCrop.Options ops=new UCrop.Options();
          UCrop.of(Uri.fromFile(file),Uri.fromFile(new File(getCacheDir(), "myCropImage2.jpg")))
            //.withOptions(ops)
            .withAspectRatio(9, 9)
            .withMaxResultSize(1000, 1000)
            .start(MultiImageChooserActivity.this);

        }
      }
      else{
        new ResizeImagesTask().execute(fileNames.entrySet());
      }
      //

    }
  }

  @Override
  public void onActivityResult(int requestCode, int resultCode, Intent data) {
    //Bitmap bp = (Bitmap) data.getExtras().get("data");
    Log.v("TYYYY","出结果了"+resultCode);

    if(requestCode == CAPTURE_IMAGE_ACTIVITY_REQUEST_CODE) {
      if (resultCode == RESULT_OK) {
        // Image captured and saved to fileUri specified in the Intent
        //Toast.makeText(this, "Image saved to:\n" +
        //    data.getData(),
        //  Toast.LENGTH_LONG).show();
        File fileCamera=new File(Environment.getExternalStorageDirectory() + "/my_camera/tmp/camera_test_0.jpg");
        if(fileCamera!=null){
          Uri uriCamera=Uri.fromFile(fileCamera);
          UCrop.of(uriCamera,Uri.fromFile(new File(getCacheDir(), "myCropImage2.jpg")))
            .withAspectRatio(9, 9)
            .withMaxResultSize(1000, 1000)
            .start(MultiImageChooserActivity.this);
        }
        else{
          Toast.makeText(this, "拍照失败，请重试",
            Toast.LENGTH_SHORT).show();
        }

        //Bitmap bitmap=(Bitmap) data.getExtras().get("data");
        //Uri uri=saveBitmapToFile(bitmap);
        //Log.v("SUCCESS","保存成功，返回的uri是："+uri.toString());

      } else if (resultCode == RESULT_CANCELED) {
        // User cancelled the image capture
        Toast.makeText(this, "Image save canceled by user",
          Toast.LENGTH_LONG).show();
        Log.v("canceled","canceled");
      } else {
        // Image capture failed, advise user
        Toast.makeText(this, "Image save error",
          Toast.LENGTH_LONG).show();
        Log.v("error","error");

      }
    }


    if (resultCode == RESULT_OK) {
      if (requestCode == 0x01) {
        final Uri selectedUri = data.getData();
        if (selectedUri != null) {
          //startCropActivity(data.getData());
          Log.v("TAG","111111");
        } else {
          Log.v("TAG","2222222");
          //Toast.makeText(SampleActivity.this, R.string.toast_cannot_retrieve_selected_image, Toast.LENGTH_SHORT).show();
        }
      } else if (requestCode == UCrop.REQUEST_CROP) {
        handleCropResult(data);
        Log.v("TAG","333333");
      }
    }
    if (resultCode == UCrop.RESULT_ERROR) {
      //handleCropError(data);
      Log.v("TAG","44444444");
    }
  }

  private void handleCropResult(@NonNull Intent result) {
    final Uri resultUri = UCrop.getOutput(result);
    if (resultUri != null) {
      //Log.v("result",resultUri.toString());
      //ResultActivity.startWithUri(SampleActivity.this, resultUri);
      resultFileName.put(resultUri.getPath(),1);
      new ResizeImagesTask().execute(resultFileName.entrySet());
    } else {
      Toast.makeText(MultiImageChooserActivity.this,"裁剪失败",Toast.LENGTH_SHORT).show();
      //Toast.makeText(SampleActivity.this, R.string.toast_cannot_retrieve_cropped_image, Toast.LENGTH_SHORT).show();
    }
  }

  /*********************
   * Helper Methods
   ********************/
  private void updateAcceptButton() {

    ((TextView) getActionBar().getCustomView().findViewById(fakeR.getId("id", "actionbar_done_textview")))
      .setEnabled(fileNames.size() != 0);
    getActionBar().getCustomView().findViewById(fakeR.getId("id", "actionbar_done")).setEnabled(fileNames.size() != 0);

  }

  private void setupHeader() {
    // From Roman Nkk's code
    // https://plus.google.com/113735310430199015092/posts/R49wVvcDoEW
    // Inflate a "Done/Discard" custom action bar view
        /*
         * Copyright 2013 The Android Open Source Project
         *
         * Licensed under the Apache License, Version 2.0 (the "License");
         * you may not use this file except in compliance with the License.
         * You may obtain a copy of the License at
         *
         *     http://www.apache.org/licenses/LICENSE-2.0
         *
         * Unless required by applicable law or agreed to in writing, software
         * distributed under the License is distributed on an "AS IS" BASIS,
         * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
         * See the License for the specific language governing permissions and
         * limitations under the License.
         */
    LayoutInflater inflater = (LayoutInflater) getActionBar().getThemedContext().getSystemService(
      LAYOUT_INFLATER_SERVICE);
    final View customActionBarView = inflater.inflate(fakeR.getId("layout", "actionbar_custom_view_done_discard"), null);
      /*
      customActionBarView.findViewById(fakeR.getId("id", "actionbar_done")).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                // "Done"
                selectClicked(null);
            }
        });
        customActionBarView.findViewById(fakeR.getId("id", "actionbar_discard")).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });
*/
    customActionBarView.findViewById(fakeR.getId("id", "actionbar_discard_textview")).setOnClickListener(new View.OnClickListener() {
      @Override
      public void onClick(View v) {
        // "Done"
        //selectClicked(null);
        finish();
      }
    });

    View doneView=customActionBarView.findViewById(fakeR.getId("id", "actionbar_done"));

    View doneTextView=customActionBarView.findViewById(fakeR.getId("id","actionbar_done_textview"));
    doneTextView.setOnClickListener(new View.OnClickListener(){
      @Override
      public void onClick(View v){
        selectClicked(null);
      }
    });
    Log.v("TAF",""+hasCamara);
    if(hasCamara==1) {
      doneView.setVisibility(View.INVISIBLE);
      doneTextView.setVisibility(View.INVISIBLE);
    }
    else{
      doneView.setVisibility(View.VISIBLE);
      doneTextView.setVisibility(View.VISIBLE);
    }

    // Show the custom action bar view and hide the normal Home icon and title.
    final ActionBar actionBar = getActionBar();
    actionBar.setDisplayOptions(ActionBar.DISPLAY_SHOW_CUSTOM, ActionBar.DISPLAY_SHOW_CUSTOM
      | ActionBar.DISPLAY_SHOW_HOME | ActionBar.DISPLAY_SHOW_TITLE);
    actionBar.setCustomView(customActionBarView, new ActionBar.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT));
  }

  private String getImageName(int position) {
    actualimagecursor.moveToPosition(position);
    String name = null;

    try {
      name = actualimagecursor.getString(actual_image_column_index);
    } catch (Exception e) {
      return null;
    }
    return name;
  }

  private int getImageRotation(int position) {
    actualimagecursor.moveToPosition(position);
    int rotation = 0;

    try {
      rotation = actualimagecursor.getInt(orientation_column_index);
    } catch (Exception e) {
      return rotation;
    }
    return rotation;
  }

  public boolean isChecked(int position) {
    if(hasCamara==1){
      return false;
    }
    else{
      boolean ret = checkStatus.get(position);
      return ret;
    }

  }

  private Uri getOutputMediaFileUri(int type){
    return Uri.fromFile(getOutputMediaFile(type));
  }

  /** Create a File for saving an image or video */
  private File getOutputMediaFile(int type){
    //File mediaStorageDir = new File(getApplicationContext().getCacheDir().toString()+"/came");
    File mediaStorageDir=new File(Environment.getExternalStorageDirectory() + "/my_camera/tmp");
    if (! mediaStorageDir.exists()){
      if (! mediaStorageDir.mkdirs()){
        Log.d("cache", "failed to create directory"+mediaStorageDir.getAbsolutePath());
        return null;
      }
    }
    File mediaFile = null;
    if(type==MEDIA_TYPE_IMAGE) {
      mediaFile = new File(mediaStorageDir.getPath(),"camera_test_0.jpg");
    }
    return mediaFile;
  }


  /*********************
   * Nested Classes
   ********************/
  private class SquareImageView extends ImageView {
    public SquareImageView(Context context) {
      super(context);
    }

    @Override
    public void onMeasure(int widthMeasureSpec, int heightMeasureSpec) {
      super.onMeasure(widthMeasureSpec, widthMeasureSpec);
    }
  }


  private class ImageAdapter extends BaseAdapter {
    private final Bitmap mPlaceHolderBitmap;

    public ImageAdapter(Context c) {
      Bitmap tmpHolderBitmap = BitmapFactory.decodeResource(getResources(), fakeR.getId("drawable", "loading_icon"));
      mPlaceHolderBitmap = Bitmap.createScaledBitmap(tmpHolderBitmap, colWidth, colWidth, false);
      if (tmpHolderBitmap != mPlaceHolderBitmap) {
        tmpHolderBitmap.recycle();
        tmpHolderBitmap = null;
      }
    }

    public int getCount() {
      if (imagecursor != null) {
        return imagecursor.getCount()+hasCamara;
      } else {
        return 0;
      }
    }

    public Object getItem(int position) {
      return position;
    }

    public long getItemId(int position) {
      return position;
    }

    // create a new ImageView for each item referenced by the Adapter
    public View getView(int pos, View convertView, ViewGroup parent) {
      if(hasCamara==1) {
        if (pos == 0) {
          //Log.v("TIPS","第一个位置改图片");
          if(convertView!=null) {
            ImageView iv = (ImageView) convertView;
            iv.setImageResource(R.drawable.__picker_camera);
            iv.setScaleType(ImageView.ScaleType.CENTER_CROP);
            WindowManager wm = MultiImageChooserActivity.this.getWindowManager();
            iv.setMinimumHeight(wm.getDefaultDisplay().getWidth() / 3);
            return iv;
          }
          else{
            ImageView temp = new SquareImageView(MultiImageChooserActivity.this);
            temp.setScaleType(ImageView.ScaleType.CENTER_CROP);
            //convertView = (View)temp;
            return temp;
          }
        }
      }
      if (convertView == null) {
        ImageView temp = new SquareImageView(MultiImageChooserActivity.this);
        temp.setScaleType(ImageView.ScaleType.CENTER_CROP);
        convertView = (View)temp;
      }

      ImageView imageView = (ImageView)convertView;
      imageView.setImageBitmap(null);

      final int position = pos-hasCamara;

      if (!imagecursor.moveToPosition(position)) {
        return imageView;
      }

      if (image_column_index == -1) {
        return imageView;
      }

      final int id = imagecursor.getInt(image_column_index);
      final int rotate = imagecursor.getInt(image_column_orientation);
      if (isChecked(pos)) {
        if (android.os.Build.VERSION.SDK_INT>=16) {
          imageView.setImageAlpha(128);
        } else {
          imageView.setAlpha(128);
        }
        imageView.setBackgroundColor(selectedColor);
      } else {
        if (android.os.Build.VERSION.SDK_INT>=16) {
          imageView.setImageAlpha(255);
        } else {
          imageView.setAlpha(255);
        }
        imageView.setBackgroundColor(Color.TRANSPARENT);
      }
      if (shouldRequestThumb) {
        fetcher.fetch(Integer.valueOf(id), imageView, colWidth, rotate);
      }

      return imageView;
    }
  }


  private class ResizeImagesTask extends AsyncTask<Set<Entry<String, Integer>>, Void, ArrayList<String>> {
    private Exception asyncTaskError = null;

    @Override
    protected ArrayList<String> doInBackground(Set<Entry<String, Integer>>... fileSets) {
      Set<Entry<String, Integer>> fileNames = fileSets[0];
      ArrayList<String> al = new ArrayList<String>();
      try {
        Iterator<Entry<String, Integer>> i = fileNames.iterator();
        Bitmap bmp;
        Bitmap returnBmp;
        while(i.hasNext()) {
          Entry<String, Integer> imageInfo = i.next();
          File file = new File(imageInfo.getKey());
          int rotate = imageInfo.getValue().intValue();
          BitmapFactory.Options options = new BitmapFactory.Options();
          options.inSampleSize = 1;
          options.inJustDecodeBounds = true;
          BitmapFactory.decodeFile(file.getAbsolutePath(), options);
          int width = options.outWidth;
          int height = options.outHeight;

          float scale = calculateScale(width, height);
          float returnScale=0.05f;
          BitmapFactory.Options returnOption=new BitmapFactory.Options();
          int returnInSampleSize=calculateInSampleSize(options, (int)(width*returnScale), (int)(height*returnScale));
          returnOption.inSampleSize=returnInSampleSize;
          if (scale < 1) {
            int finalWidth = (int)(width * scale);
            int finalHeight = (int)(height * scale);
            int inSampleSize = calculateInSampleSize(options, finalWidth, finalHeight);

            options = new BitmapFactory.Options();
            options.inSampleSize = inSampleSize;

            try {
              bmp = this.tryToGetBitmap(file, options, rotate, true);
              returnBmp=this.tryToGetBitmap(file, returnOption, rotate, false);
            } catch (OutOfMemoryError e) {
              options.inSampleSize = calculateNextSampleSize(options.inSampleSize);
              returnOption.inSampleSize = calculateNextSampleSize(returnOption.inSampleSize);
              try {
                bmp = this.tryToGetBitmap(file, options, rotate, false);
                returnBmp=this.tryToGetBitmap(file, returnOption, rotate, false);
              } catch (OutOfMemoryError e2) {
                throw new IOException("Unable to load image into memory.");
              }
            }
          } else {
            try {
              bmp = this.tryToGetBitmap(file, null, rotate, false);
              returnBmp=this.tryToGetBitmap(file, returnOption, rotate, false);
            } catch(OutOfMemoryError e) {
              options = new BitmapFactory.Options();
              options.inSampleSize = 2;
              try {
                bmp = this.tryToGetBitmap(file, options, rotate, false);
                returnBmp=this.tryToGetBitmap(file, returnOption, rotate, false);
              } catch(OutOfMemoryError e2) {
                options = new BitmapFactory.Options();
                options.inSampleSize = 4;
                try {
                  bmp = this.tryToGetBitmap(file, options, rotate, false);
                  returnBmp=this.tryToGetBitmap(file, returnOption, rotate, false);
                } catch (OutOfMemoryError e3) {
                  throw new IOException("Unable to load image into memory.");
                }
              }
            }
          }

          file = this.storeImage(bmp, file.getName());

          String string = null;

          ByteArrayOutputStream bStream = new ByteArrayOutputStream();

          returnBmp.compress(Bitmap.CompressFormat.JPEG, 100, bStream);

          byte[] bytes = bStream.toByteArray();

          string = Base64.encodeToString(bytes, Base64.DEFAULT);

          al.add(Uri.fromFile(file).toString()+"|"+bmp.getWidth()+"|"+bmp.getHeight()+"|data:image/jpeg;base64,"+string);
        }
        return al;
      } catch(IOException e) {
        try {
          asyncTaskError = e;
          for (int i = 0; i < al.size(); i++) {
            URI uri = new URI(al.get(i));
            File file = new File(uri);
            file.delete();
          }
        } catch(Exception exception) {
          // the finally does what we want to do
        } finally {
          return new ArrayList<String>();
        }
      }
    }

    @Override
    protected void onPostExecute(ArrayList<String> al) {
      Intent data = new Intent();

      if (asyncTaskError != null) {
        Bundle res = new Bundle();
        res.putString("ERRORMESSAGE", asyncTaskError.getMessage());
        data.putExtras(res);
        setResult(RESULT_CANCELED, data);
      } else if (al.size() > 0) {
        Bundle res = new Bundle();
        res.putStringArrayList("MULTIPLEFILENAMES", al);
        if (imagecursor != null) {
          res.putInt("TOTALFILES", imagecursor.getCount());
        }
        data.putExtras(res);
        setResult(RESULT_OK, data);
      } else {
        setResult(RESULT_CANCELED, data);
      }
      progress.stop();
      finish();
    }

    private Bitmap tryToGetBitmap(File file, BitmapFactory.Options options, int rotate, boolean shouldScale) throws IOException, OutOfMemoryError {
      Bitmap bmp;
      if (options == null) {
        bmp = BitmapFactory.decodeFile(file.getAbsolutePath());
      } else {
        bmp = BitmapFactory.decodeFile(file.getAbsolutePath(), options);
      }
      if (bmp == null) {
        throw new IOException("The image file could not be opened.");
      }
      if (options != null && shouldScale) {
        float scale = calculateScale(options.outWidth, options.outHeight);
        bmp = this.getResizedBitmap(bmp, scale);
      }
      if (rotate != 0) {
        Matrix matrix = new Matrix();
        matrix.setRotate(rotate);
        bmp = Bitmap.createBitmap(bmp, 0, 0, bmp.getWidth(), bmp.getHeight(), matrix, true);
      }
      return bmp;
    }

    /*
    * The following functions are originally from
    * https://github.com/raananw/PhoneGap-Image-Resizer
    *
    * They have been modified by Andrew Stephan for Sync OnSet
    *
    * The software is open source, MIT Licensed.
    * Copyright (C) 2012, webXells GmbH All Rights Reserved.
    */
    private File storeImage(Bitmap bmp, String fileName) throws IOException {
      int index = fileName.lastIndexOf('.');
      String name = fileName.substring(0, index);
      String ext = fileName.substring(index);
      File file = File.createTempFile("tmp_" + name, ext);
      OutputStream outStream = new FileOutputStream(file);
      if (ext.compareToIgnoreCase(".png") == 0) {
        bmp.compress(Bitmap.CompressFormat.PNG, quality, outStream);
      } else {
        bmp.compress(Bitmap.CompressFormat.JPEG, quality, outStream);
      }
      outStream.flush();
      outStream.close();
      return file;
    }

    private Bitmap getResizedBitmap(Bitmap bm, float factor) {
      int width = bm.getWidth();
      int height = bm.getHeight();
      // create a matrix for the manipulation
      Matrix matrix = new Matrix();
      // resize the bit map
      matrix.postScale(factor, factor);
      // recreate the new Bitmap
      Bitmap resizedBitmap = Bitmap.createBitmap(bm, 0, 0, width, height, matrix, false);
      return resizedBitmap;
    }
  }

  private int calculateInSampleSize(BitmapFactory.Options options, int reqWidth, int reqHeight) {
    // Raw height and width of image
    final int height = options.outHeight;
    final int width = options.outWidth;
    int inSampleSize = 1;

    if (height > reqHeight || width > reqWidth) {
      final int halfHeight = height / 2;
      final int halfWidth = width / 2;

      // Calculate the largest inSampleSize value that is a power of 2 and keeps both
      // height and width larger than the requested height and width.
      while ((halfHeight / inSampleSize) > reqHeight && (halfWidth / inSampleSize) > reqWidth) {
        inSampleSize *= 2;
      }
    }

    return inSampleSize;
  }

  private int calculateNextSampleSize(int sampleSize) {
    double logBaseTwo = (int)(Math.log(sampleSize) / Math.log(2));
    return (int)Math.pow(logBaseTwo + 1, 2);
  }

  private float calculateScale(int width, int height) {
    float widthScale = 1.0f;
    float heightScale = 1.0f;
    float scale = 1.0f;
    if (desiredWidth > 0 || desiredHeight > 0) {
      if (desiredHeight == 0 && desiredWidth < width) {
        scale = (float)desiredWidth/width;
      } else if (desiredWidth == 0 && desiredHeight < height) {
        scale = (float)desiredHeight/height;
      } else {
        if (desiredWidth > 0 && desiredWidth < width) {
          widthScale = (float)desiredWidth/width;
        }
        if (desiredHeight > 0 && desiredHeight < height) {
          heightScale = (float)desiredHeight/height;
        }
        if (widthScale < heightScale) {
          scale = widthScale;
        } else {
          scale = heightScale;
        }
      }
    }

    return scale;
  }
}
