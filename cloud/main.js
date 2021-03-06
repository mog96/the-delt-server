var twttrtxt = require('twitter-text');




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
 * Reel Push - New Post
 */
Parse.Cloud.afterSave('Photo', function(request) {
  if (request.object.existed()) {
    return;
  }

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
 * Alert Push - New Alert
 */
Parse.Cloud.afterSave('Alert', function(request) {
  // TODO: CHECK ALERT'S INCONVERSATION PARAM
  if (request.object.existed()) {
    return;
  }

  var alert = request.object;
  alert.fetch().then(function(fetchedAlert) {
    var subject = alert.get('subject');
    var message = alert.get('message');
    var usernames = [];

    if (subject) {
      usernames = twttrtxt.extractMentions(subject);
    }
    if (message) {
      usernames.concat(twttrtxt.extractMentions(message));
    }
    fetchedAlert.set('inConversation', usernames.map(function(username) {
      return username.toLowerCase();
    }));
    fetchedAlert.save().then(function(updatedAlert) {

      console.log('ALERT WITH USERNAMES:', updatedAlert.get('inConversation'));

      var pushQuery = new Parse.Query(Parse.Installation);
      // Don't exclude user that sent request because we want to reload alerts feed.

      var author = updatedAlert.get('author');
      author.fetch().then(function(fetchedAuthor) {
        var authorUsername = fetchedAuthor.get('username');
        if (!subject) {
          subject = '[no subject]';
        }

        var alertObj = {
          pushType: 'Alert',
          title: 'Alert from ' + authorUsername + ':'
        };
        if (message) {
          alertObj['title'] += ' ' + subject;
          alertObj['body'] = message;
        } else {
          alertObj['body'] = subject;
        }

        console.log('ALERT PUSH:', alertObj);

        Parse.Push.send({
          where: pushQuery,
          data: {
            aps: {
              pushType: 'Alert',
              badge: 'Increment',
              alert: alertObj,
              sound: 'default'
            }
          }
        }, {
          useMasterKey: true,
          success: function () {
            console.log('SUCCESSFUL ALERT PUSH SENT AT', new Date());
          },
          error: function (error) {
            throw 'ALERT PUSH ERROR: ' + error.code + ' : ' + error.message;
          }
        });
      });
    });
  });
});




/**
 * Alert - New Reply
 */
Parse.Cloud.afterSave('AlertReply', function(request) {
  if (request.object.existed()) {
    return;
  }

  var message = request.object.get('message');
  var author = request.object.get('author');
  author.fetch().then(function(fetchedAuthor) {
    var authorUsername = fetchedAuthor.get('username');

    /*
     * Associate reply with alert.
     */
    var replyToAlert = request.object.get('alert');
    replyToAlert.fetch().then(function(fetchedAlert) {

      console.log('ALERT:', fetchedAlert);

      var alertQuery = new Parse.Query('Alert');
      alertQuery.equalTo('objectId', fetchedAlert.id);

      console.log('ID:', fetchedAlert.id);

      return alertQuery.find();
      // return Parse.Promise.error({ "message": "No Games Found!", "code": 108 });
    }).then(function(results) {

      console.log('RESULTS:', results);

      if (results.length == 1) {
        var alert = results[0];
        // Add reply to Alert.
        alert.add('replies', request.object);
        // Increment reply count.
        alert.increment('replyCount');

        /*
         * Append new mentioned usernames to those in alert conversation.
         */
        var message = request.object.get('message');
        var usernames = twttrtxt.extractMentions(message);

        console.log('USERNAMES IN ALERT MESSAGE:', usernames);

        usernames.map(function (elem) {
          alert.addUnique('inConversation', elem.toLowerCase());
        });
        alert.addUnique('inConversation', authorUsername.toLowerCase());

        console.log('HAVE AFTER:', alert.get('inConversation'));

        return alert.save();
      } else {
        response.error('None or multiple internal objects for Alert with objectId ', fetchedAlert.objectId);
      }
    }).then(function(updatedAlert) {

      console.log('UPDATED ALERT: ', updatedAlert);

      var fetchedUsernames = updatedAlert.get('inConversation');

      console.log('ALERT HAS USERNAMES:', fetchedUsernames);

      var pushQuery = new Parse.Query(Parse.Installation);
      if (!(fetchedUsernames.indexOf('everyone') >= 0)) {
        pushQuery.containedIn('username', fetchedUsernames);
      }
      var alertObj = {
        title: 'Reply from ' + authorUsername + ':',
        body: message
      };
      Parse.Push.send({
        where: pushQuery,
        data: {
          aps: {
            pushType: 'Alert',
            alert: alertObj,
            sound: 'default'
          }
        }
      }, {
        useMasterKey: true,
        success: function () {
          console.log('SUCCESSFUL REPLY PUSH SENT AT', new Date());
        },
        error: function (error) {
          throw 'REPLY PUSH ERROR: ' + error.code + ' : ' + error.message;
        }
      });

    }, function(error) {
      console.log('Error updating alert for reply ', request.object, '. ', error);
    });
  });
});




/**
 * Chat Push - New Message
 */
Parse.Cloud.afterSave('message', function(request) {
  if (request.object.existed()) {
    return;
  }

  var sentAt = new Date(request.object.get('createdAt'));
  console.log("SENT AT", sentAt);
  console.log("NEXT PUSH AT", sendNextPushAt);

  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.notEqualTo('user', request.user);

  var author = request.object.get('authorUsername');
  var content = request.object.get('content');
  console.log("AUTHOR", author);
  console.log("MESSAGE", content);

  if (sentAt > sendNextPushAt) {
    sendNextPushAt = sentAt;
    sendNextPushAt.setMinutes(sentAt.getMinutes() + NEXT_PUSH_DELAY);

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
          sound: 'default',
          // 'content-available': 1,
          alert: {
            title: 'New message from ' + author + ':',
            body: content
          }
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
 * Calendar Push - New Event
 */
Parse.Cloud.afterSave('Event', function(request) {
  if (request.object.existed()) {
    return;
  }

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