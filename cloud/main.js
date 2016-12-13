
/*
Parse.Cloud.define('hello', function(req, res) {
    res.success('Hi');
});
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

var 
var sendNextPushAt = new Date();

Parse.Cloud.afterSave('message', function(request) {
  var sentAt = new Date(request.object.get('createdAt'));
  console.log("SENT AT", sentAt);
  console.log("NEXT PUSH AT", sendNextPushAt);

  var pushQuery = new Parse.Query(Parse.Installation);
  var author = request.object.get('authorUsername');
  var content = request.object.get('content');
  console.log("AUTHOR", author);
  console.log("MESSAGE", content);

  if (sentAt > sendNextPushAt) {
    sendNextPushAt = sentAt;
    sendNextPushAt.setMinutes(sentAt.getMinutes() + 2);

    Parse.Push.send({
      where: pushQuery,
      data: {
        badge: 'Increment',
        alert: {
          title: 'Delts are chatting...',
          body: author + ': ' + content
        },
        sound: 'default'
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
        badge: 'Increment',
        'content-available': 0
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