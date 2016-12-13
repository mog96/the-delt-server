
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

Parse.cloud.afterSave("message", function(request) {
  var pushQuery = new Parse.Query(Parse.Installation);
  Parse.push.send({
    where: pushQuery,
    data: {
      alert: {
        "title": "Delts are chatting:",
        "body": "Check it out."          /// LAST USER AND LAST MESSAGE
      },
      sound: "defualt"
    }
  }, {
    success: function () {
      // SUCCESSFUL PUSH
    },
    error: function (error) {
      throw "CHAT PUSH ERROR: " + error.code + " : " + error.message;
    }
  });
});