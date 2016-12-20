
/*
Parse.Cloud.define('hello', function(req, res) {
    res.success('Hi');
});
*/

/**
 * Approve user.
 */
Parse.Cloud.define('approveUser', function(request, response) {
  var creatingUser = request.user;

  var name = request.params.name;
  var email = request.params.email; // string required
  var username = request.params.username; // string required
  var tempPass = request.params.tempPass; // string

  var approvejs = require('../cloud/approve.js');
  approvejs.approveUser(creatingUser, name, email, username, tempPass, response);
});

const NEXT_PUSH_DELAY = 15; // minutes
var sendNextPushAt = new Date();

/**
 * Chat push.
 */
Parse.Cloud.afterSave('message', function(request) {
  var sentAt = new Date(request.object.get('createdAt'));
  console.log("SENT AT", sentAt);
  console.log("NEXT PUSH AT", sendNextPushAt);

  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.notEqualTo('user', request.user);

  if (sentAt > sendNextPushAt) {
    sendNextPushAt = sentAt;
    sendNextPushAt.setMinutes(sentAt.getMinutes() + NEXT_PUSH_DELAY);

    var author = request.object.get('authorUsername');
    var content = request.object.get('content');
    console.log("AUTHOR", author);
    console.log("MESSAGE", content);

    Parse.Push.send({
      where: pushQuery,
      data: {
        aps: {
          pushType: 'Chat',
          badge: 'Increment',
          alert: {
            title: 'Delts are chatting...',
            body: author + ': ' + content
          },
          sound: 'default'
        }
      }
    }, {
      useMasterKey: true,
      success: function () {
        console.log('SUCCESSFUL CHAT PUSH SENT AT', new Date());
      },
      error: function (error) {
        throw 'CHAT PUSH ERROR: ' + error.code + ' : ' + error.message;
      }
    });

  } else { // Send silent push to increment badge number
    Parse.Push.send({
      where: pushQuery,
      data: {
        aps: {
          pushType: 'Chat',
          badge: 'Increment',
          'content-available': 0
        }
      }
    }, {
      useMasterKey: true,
      success: function () {
        console.log('SUCCESSFUL CHAT SILENT PUSH SENT AT', new Date());
      },
      error: function (error) {
        throw 'CHAT SILENT PUSH ERROR: ' + error.code + ' : ' + error.message;
      }
    });
  }
});

/**
 * Reel push.
 */
Parse.Cloud.afterSave('Photo', function(request) {
  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.notEqualTo('user', request.user);
  var author = request.object.get('username');

  Parse.Push.send({
    where: pushQuery,
    data: {
      aps: {
        pushType: 'Reel',
        badge: 'Increment',
        alert: {
          body: author + ' posted a new photo.'
        },
        sound: 'default'
      }
    }
  }, {
    useMasterKey: true,
    success: function () {
      console.log('SUCCESSFUL REEL PUSH SENT AT', new Date());
    },
    error: function (error) {
      throw 'REEL PUSH ERROR: ' + error.code + ' : ' + error.message;
    }
  });
});

/**
 * Calendar push.
 */
Parse.Cloud.afterSave('Event', function(request) {
  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.notEqualTo('user', request.user);

  var pushTitle = 'New event: ';
  // var author = request.object.get('createdBy');
  // if (author) {
  //   pushTitle = author + ' added a new event:';
  // }


  pushTitle += request.object.get('name'); // Event title.

  var date = new Date(request.object.get('startTime'));
  console.log('NOW', new Date());
  console.log('DATE', date);
  var dateFormatter = require('../cloud/dateformat.js');
  var pushBody = dateFormatter.formatDate(date, 'dddd m/dd h:MMt');

  var location = request.object.get('location');
  if (location) {
    pushBody += ' @ ' + location;
  }

  var description = request.object.get('description');
  if (description) {
    pushBody += '\n' + description;
  }

  Parse.Push.send({
    where: pushQuery,
    data: {
      aps: {
        pushType: 'Calendar',
        badge: 'Increment',
        alert: {
          title: pushTitle,
          body: pushBody
        },
        sound: 'default'
      }
    }
  }, {
    useMasterKey: true,
    success: function () {
      console.log('SUCCESSFUL CALENDAR PUSH SENT AT', new Date());
    },
    error: function (error) {
      throw 'CALENDAR PUSH ERROR: ' + error.code + ' : ' + error.message;
    }
  });
});