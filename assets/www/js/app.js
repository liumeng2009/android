// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js
angular.module('starter', ['ionic', 'starter.controllers', 'starter.services','starter.filters','starter.directives','ionic-native-transitions'])

.run(function($ionicPlatform) {
  $ionicPlatform.ready(function() {
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);

    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }

    //iosocket = io.connect('http://liumeng.iego.cn/',{'reconnect':true,'force new connection': true});



  });
})

.config(function($stateProvider, $urlRouterProvider,$ionicConfigProvider,$sceDelegateProvider,$ionicNativeTransitionsProvider) {

  $ionicNativeTransitionsProvider.setDefaultOptions({
    duration: 400, // in milliseconds (ms), default 400,
    slowdownfactor: 4, // overlap views (higher number is more) or no overlap (1), default 4
    iosdelay: -1, // ms to wait for the iOS webview to update before animation kicks in, default -1
    androiddelay: -1, // same as above but for Android, default -1
    winphonedelay: -1, // same as above but for Windows Phone, default -1,
    fixedPixelsTop: 0, // the number of pixels of your fixed header, default 0 (iOS and Android)
    fixedPixelsBottom: 0, // the number of pixels of your fixed footer (f.i. a tab bar), default 0 (iOS and Android)
    triggerTransitionEvent: '$ionicView.afterEnter', // internal ionic-native-transitions option
    backInOppositeDirection: false // Takes over default back transition and state back transition to use the opposite direction transition to go back
  });

  $ionicNativeTransitionsProvider.setDefaultTransition({
    type: 'slide',
    direction: 'left'
  });

  $ionicNativeTransitionsProvider.setDefaultBackTransition({
    type: 'slide',
    direction: 'right'
  });

  $ionicConfigProvider.scrolling.jsScrolling(false);

  $sceDelegateProvider.resourceUrlWhitelist([
    // Allow same origin resource loads.
    'self',
    'http://127.0.0.1:3000',
    // Allow loading from our assets domain.  Notice the difference between * and **.
    'http://media.w3.org/**']);
  $ionicConfigProvider.views.transition('ios');
  $ionicConfigProvider.tabs.position('bottom');
  $ionicConfigProvider.tabs.style('standard');
  var androidConfigProperties = {
    views: {
      maxCache: 5,
      forwardCache: true,
      transition: 'android'
    },
    navBar: {
    },
    backButton: {
      icon: 'ion-chevron-left',
      text: '&nbsp;',
      previousTitleText: false
    },
    templates: {
      // maxPrefetch: 0
    }
  };
  var iosConfigProperties = {
    views: {
      maxCache: 5,
      forwardCache: true,
      transition: 'ios'
    },
    navBar: {
    },
    backButton: {
      icon: 'ion-chevron-left',
      text: '&nbsp;',
      previousTitleText: false
    },
    templates: {
      // maxPrefetch: 0
    }
  };
  $ionicConfigProvider.setPlatformConfig('ios', iosConfigProperties);
  $ionicConfigProvider.setPlatformConfig('android', androidConfigProperties);
  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
  // setup an abstract state for the tabs directive
    .state('login',{
      url:'/login',
      templateUrl:'js/login/login.html',
      controller:'LoginCtrl',
      params:{redirectUrl:null},
      nativeTransitions: {
        "type": "slide",
        "direction": "up",
        "duration":400
      }
    })
    .state('reg',{
      url:'/reg',
      templateUrl:'js/login/reg.html',
      controller:'RegCtrl'
    })
    .state('tab', {
    url: '/tab',
    abstract: true,
    templateUrl: 'js/usercenter/tabs.html'
  })

  // Each tab has its own nav history stack:

  .state('tab.main', {
    url: '/main',
    views: {
      'tab-main': {
        templateUrl: 'js/weibo/main.html',
        controller:'MainCtrl'
      }
    },
    nativeTransitions: null
  })

  .state('tab.children', {
      url: '/children',
      views: {
        'tab-children': {
          templateUrl: 'js/children/children.html',
          controller:'ChildrenCtrl'
        }
      },
      nativeTransitions: null
    })
    .state('tab.usercenter', {
      url: '/usercenter',
      views: {
        'tab-usercenter': {
          templateUrl: 'js/usercenter/usercenter.html',
          controller:'UserCenterCtrl'
        }
      },
      nativeTransitions:null
    })
    .state('school_list',{
      url:'/school/list',
      templateUrl:'js/school/school_list.html',
      controller:'SchoolListCtrl'
    })
    .state('chat',{
      url:'/chat',
      cache:false,
      templateUrl:'js/chat/chat.html',
      controller:'ChatCtrl',
      params:{'from':null,'to':null}
    })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/tab/main');

});
