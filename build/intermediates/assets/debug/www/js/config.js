/**
 * Created by Administrator on 2016/6/27.
 */
config = {
  appName:'晓园IM',
  //web api
  basePath:'http://g151082j77.iok.la/api/',
  //socket地址
  serverPath:'http://g151082j77.iok.la/',
  //分页
  pagination:{
    pageSize:10,
    currentPage:1
  },
  userPrompt:{
    ajaxError:'服务器响应超时'
  },
  //聊天页面，信息按照时间分段的时间间隔是一分钟，一分钟内认为是属于一个区块的
  timeSpacing:1,
  //sendBuffer里面的内容，一分钟之后会删除掉，认为发送失败。
  sendFailedTime:1

};
