angular.module('dogfeed', [
    'ngFeeds',
    'ngSockethubClient',
    'ngSockethubRemoteStorage',
    'ngRemoteStorage',
    'ngMessages',
    'ngRoute',
    'ngTouch'
]).

/**
 * routes
 */
config(['$routeProvider', '$locationProvider',
function ($routeProvider, $locationProvider) {
  $locationProvider.html5Mode(true);
  $routeProvider.
    when('/', {
      templateUrl: "/res/views/main.html"
    }).
    when('/settings/sockethub', {
      templateUrl: "sockethub-settings.html"
    }).
    when('/feeds/add', {
      templateUrl: '/res/js/feeds/feed-add.html.tpl'
    }).
    when('/feeds/edit/:feed', {
      templateUrl: '/res/js/feeds/feed-edit.html.tpl'
    }).
    when('/feeds/:feed', {
      templateUrl: '/res/views/articles.html'
    }).
    when('/feeds/:feed/article/:article', {
      templateUrl: '/res/views/articles.html'
    }).
    when('/contacts', {
      templateUrl: 'contacts.html'
    }).
    when('/scores', {
      templateUrl: 'scores.html'
    }).
    when('/calendar', {
      templateUrl: 'calendar.html'
    }).
    otherwise({
      redirectTo: "/"
    });
}]).

run(['$rootScope', '$timeout',
function ($rootScope, $timeout) {
  $rootScope.delayed = false;
  $timeout(function () {
    // give the app a second or two to load before we determine if the user
    // is logged in or not.
    $rootScope.delayed = true;
  }, 3000);
}]).

run([function () {
  // TODO
  // this should be executed when we know the appropriate dom elements are
  // loaded.
  // right now if someone *starts* on the settings page, this will be executed
  // and wont bind to anything as the contacts view was not registered.
  setTimeout(function () {
    $(document).ready(function() {
      $('[data-toggle=offcanvas]').click(function() {
        if ($('.opposite-sidebar').hasClass('slider-active')) {
          $('.opposite-sidebar').removeClass('slider-active');
          $('#remotestorage-widget').removeClass('hidden');
        } else {
          $('.opposite-sidebar').addClass('slider-active');
          $('#remotestorage-widget').addClass('hidden');
        }
      });

      // always close slider when navigation happens
      $('.main-link').click(function() {
        $('.opposite-sidebar').removeClass('slider-active');
        $('#remotestorage-widget').removeClass('hidden');
      });
      //$("[name='showRead']").bootstrapSwitch('size', 'small');
    });
  }, 500);
}]).


/**
 * remotestorage config
 */
run(['RemoteStorageConfig',
function (RScfg) {
  RScfg.modules = [
    ['sockethub', 'rw', {'cache': false, 'public': false}],
    ['feeds', 'rw', {'cache': false, 'public': false}],
    ['articles', 'rw', {'cache': false, 'public': false}]
  ];
}]).

/**
 * messages config
 */
run(['MessagesConfig',
function (cfg) {
  //cfg.timeout = 15000;
}]).

/**
 * get sockethub settings and try to connect
 */
run(['SockethubBootstrap',
function (SockethubBootstrap) {
  SockethubBootstrap.run('dogfeed', {
    // default connection settings, if none found in remoteStorage
    host: 'silverbucket.net',
    port: '443',
    path: '/sockethub',
    tls: true,
    secret: '1234567890'
  });
}]).

/**
 * remoteStorage
 */
run(['$rootScope', 'RS', '$timeout',
function ($rootScope, RS, $timeout) {
  // set custom messages
  var dict = RemoteStorage.I18n.getDictionary();
  dict.view_connect = "<strong>Login</strong>";
  RemoteStorage.I18n.setDictionary(dict);

  // check if connected
  if (!RS.isConnected()) {
    $timeout(function () {
      if (!RS.isConnected()) {
        //$rootScope.$broadcast('message', {message: 'remotestorage-connect', timeout: false});
      }
    }, 3000);
  }
}]).

/**
 * listeners/emitters
 */
run(['$rootScope', '$location',
function ($rootScope, $location) {
  $rootScope.$on('sockethubSettingsSaved', function() {
    $location.path('/');
  });
}]).

/**
 * filter: fromNow (date)
 */
filter('fromNow', [
function() {
  return function (dateString) {
    //console.log("FROMNOW: " + moment(new Date(dateString)).fromNow());
    //return new Date(dateString).toDateString();
    return moment(new Date(dateString)).fromNow();
  };
}]).

/**
 * filter: pagination
 */
filter('pagination', [
function() {
  var count = 0;
  var max = 3;
  return function (article) {
    console.log("pagination received: ", article);
    if (!article) { return false; }
    count = count + 1;
    if (count > 10) {
      console.log('pagination returned false');
      return false;
    }
    console.log('pagination returned article: ',article);
    return article;
  };
}]).

/**
 * filter: encode
 */
filter('encode', [
function () {
  return function (url) {
    return encodeURIComponent(url);
  };
}]).

/**
 * filter: decode
 */
filter('decode', [
function () {
  return function (url) {
    return decodeURIComponent(url);
  };
}]).

/**
 * filter: md5
 */
filter('md5', [
function () {
  return function (s) {
    return remoteStorage.feeds.md5sum(s);
  };
}]).


///////////////////////////////////////////////////////////////////////////
//
// CONTROLLERS
//
///////////////////////////////////////////////////////////////////////////

/**
 * controller: titlebarCtrl
 */
controller('titlebarCtrl',
['$scope', '$rootScope', 'SockethubSettings', 'RS',
function ($scope, $rootScope, settings, RS) {

  $scope.showFeedList = function () {
    if ($rootScope.snapper.state().state === "left") {
      $rootScope.snapper.close();
    } else {
      $rootScope.snapper.open('left');
    }
  };

  $scope.$watch('settings.connected', function (newVal, oldVal) {
    if (settings.connected) {
      settings.conn.port = Number(settings.conn.port);
      RS.call('sockethub', 'writeConfig', ['dogfeed', settings.conn]).then(function () {
        console.log("Sockethub config saved to remoteStorage");
      }, function (err) {
        console.log('Failed saving Sockethub config to remoteStorage: ', err);
      });
    }
  });
}]).

/**
 * controller: contactsCtrl
 */
controller('contactsCtrl',
['$scope',
function ($scope) {

  $scope.contacts = [
    {
      name: 'John Doe',
      title: 'Head Coach',
      number: '123456789'
    },
    {
      name: 'Katherine Lundquist',
      title: 'Goalie Coach',
      number: '8881924445'
    },
    {
      name: 'Fredrick Hanzel',
      title: 'Team Physician',
      number: '2282819191'
    }
  ];
}]).

/**
 * controller: scoresCtrl
 */
controller('scoresCtrl',
['$scope',
function ($scope) {

  $scope.scores = [
    {date: '22-02-2014',time:'13:00',game:'ST Saens/ZZZ C1 - Yellow Purple C1G',score:'2 - 1'},
    {date: '22-02-2014',time:'12:30',game:'Womble D2 - Yellow Purple D2',score:'6 - 1'},
    {date: '22-02-2014',time:'11:30',game:'Union E1 - Yellow Purple E1',score:'8 - 1'},
    {date: '22-02-2014',time:'11:00',game:'Vile \'30 D2 - Yellow Purple D4',score:'1 - 4'},
    {date: '22-02-2014',time:'10:15',game:'Yellow Purple F7 - SCE F4',score:'1 - 0'},
    {date: '22-02-2014',time:'10:00',game:'Sleep 2G - Yellow Purple E5',score:'4 - 4'},
    {date: '22-02-2014',time:'9:00',game:'SCD \'33 F1 - Yellow Purple F6M',score:'6 - 1'},
    {date: '22-02-2014',time:'0:00',game:'Yellow Purple E3 - WVW E2',score:'3 - 2'},
    {date: '22-02-2014',time:'0:00',game:'Millars SC E2 - Yellow Purple E2',score:'4 - 3'},
    {date: '16-02-2014',time:'14:00',game:'Yellow Purple VR1 - Hoboken VR1',score:'2 - 3'},
    {date: '16-02-2014',time:'14:00',game:'Yellow Purple 1 - SML 1',score:'3 - 2'},
    {date: '16-02-2014',time:'12:00',game:'Yellow Purple 7 - Trojans 3',score:'2 - 1'},
    {date: '16-02-2014',time:'12:00',game:'Yellow Purple 7 - Trojans 3',score:'2 - 1'},
    {date: '16-02-2014',time:'11:30',game:'Yellow Purple 2 - GVA 2',score:'4 - 0'},
    {date: '16-02-2014',time:'11:00',game:'VMS \'12 3 - Yellow Purple 4',score:'2 - 5'},
    {date: '16-02-2014',time:'11:00',game:'Trix \'31 2 - Yellow Purple 3',score:'6 - 1'},
    {date: '16-02-2014',time:'9:45',game:'Alternate 5 - Yellow Purple 8',score:'1 - 1'},
    {date: '16-02-2014',time:'9:45',game:'Alternate 5 - Yellow Purple 8',score:'1 - 1'},
    {date: '16-02-2014',time:'9:30',game:'Yellow Purple 5 - Union 2',score:'2 - 1'}
  ];
}]).

controller('calendarCtrl',
['$scope',
function ($scope) {

  $scope.calendar = [
{date:'29-02-2014',time:'13:00',game:'ST Saens/ZZZ C1 - Yellow Purple C1G'},
{date:'29-02-2014',time:'12:30',game:'Womble D2 - Yellow Purple D2'},
{date:'29-02-2014',time:'11:30',game:'Union E1 - Yellow Purple E1'},
{date:'29-02-2014',time:'11:00',game:'Vile \'30 D2 - Yellow Purple D4'},
{date:'29-02-2014',time:'0:00',game:'Yellow Purple E3 - WVW E2'},
{date:'29-02-2014',time:'0:00',game:'Millars SC E2 - Yellow Purple E2'},
{date:'07-03-2014',time:'14:00',game:'Yellow Purple VR1 - Hoboken VR1'},
{date:'07-03-2014',time:'14:00',game:'Yellow Purple 1 - SML 1'},
{date:'29-02-2014',time:'10:15',game:'Yellow Purple F7 - SCE F4'},
{date:'29-02-2014',time:'10:00',game:'Sleep 2G - Yellow Purple E5'},
{date:'29-02-2014',time:'9:00',game:'SCD \'33 F1 - Yellow Purple F6M'},
{date:'07-03-2014',time:'12:00',game:'Yellow Purple 7 - Trojans 3'},
{date:'07-03-2014',time:'12:00',game:'Yellow Purple 7 - Trojans 3'},
{date:'07-03-2014',time:'11:30',game:'Yellow Purple 2 - GVA 2'},
{date:'07-03-2014',time:'11:00',game:'VMS \'12 3 - Yellow Purple 4'},
{date:'07-03-2014',time:'11:00',game:'Trix \'31 2 - Yellow Purple 3'},
{date:'07-03-2014',time:'9:45',game:'Alternate 5 - Yellow Purple 8'},
{date:'07-03-2014',time:'9:45',game:'Alternate 5 - Yellow Purple 8'},
{date:'07-03-2014',time:'9:30',game:'Yellow Purple 5 - Union 2'}
  ];
}]).

controller('mainCtrl', ['$scope', 'RS', 'SH', '$timeout', '$rootScope', '$routeParams', 'Feeds',
function ($scope, RS, SH, $timeout, $rootScope, $routeParams, Feeds) {
  //console.log("mainCtrl ROUTE PARAMS: ", $routeParams);
  $scope.isConnected = function () {
    //console.log('isConnected: ['+RS.isConnected()+'] ['+SH.isConnected()+'] ['+$routeParams.feed+']');
    if ((RS.isConnected()) && (SH.isConnected())) {
      return true;
    } else {
      if ((($routeParams.feed) || (Feeds.data.articles.length > 0)) && (SH.isConnected())) {
        return true;
      } else {
        return false;
      }
    }
  };

  $scope.isConnecting = function () {
    //console.log('isConnecting: ['+RS.isConnected()+'] ['+SH.isConnected()+']');
    if ((RS.isConnecting()) || (SH.isConnecting())) {
      return true;
    } else {
      return false;
    }
  };

  $scope.delayed = function () {
    return $rootScope.delayed;
  };

  $scope.waitingForArticles = function () {
    if ((Feeds.data.articles.length <= 1) &&
        (Feeds.data.infoArray > 0)) {
      return true;
    } else {
      return false;
    }
  };

  $scope.haveArticles = function () {
    if (Feeds.data.articles.length > 0) {
      return true;
    } else {
      return false;
    }
  };

  $scope.noFeeds = function () {
    if ((Feeds.data.infoArray.length === 0) &&
        (Feeds.data.state.remoteStorage)) {
      return true;
    } else {
      return false;
    }
  };

}]).

directive('loading', [
function () {
  return {
    restrict: 'E',
    templateUrl: 'loading.html'
  };
}]).

directive('welcome', [
function () {
  return {
    restrict: 'E',
    templateUrl: 'welcome.html'
  };
}]).

directive('about', [
function () {
  return {
    restrict: 'E',
    templateUrl: 'about.html'
  };
}]);
