exports.approveUser = function (creatingUser, name, email, username, tempPass, response)
{
  "use strict";
    if (!tempPass) {                         
        tempPass = genRandomPass();
    }

    Parse.Cloud.useMasterKey()

    var user = new Parse.User();
    user.set ("name", name);
    user.set ("email", email);
    user.set ("username", username);
    user.set ("password", tempPass);
    // TODO: set other user properties. Only the invited user can change them
    // after the user has been created.

    user.signUp(null, {
      success: function(createdUser) {
        response.success(createdUser)
        /*
        sendInvitationEmail(email, subject, tempPass, {
          success: function(httpResponse) {
            console.log("User " + createdUser.id + " created, and sent email: " + httpResponse.status);
            response.success(createdUser);
          },
          error: function (httpResponse) {
            console.error("user "+ createdUser.id +" created, but couldn't email them. " + httpResponse.status + " " + httpResponse.text);
            response.error("user "+ createdUser.id +" created, but couldn't email them. " + httpResponse.status);
          }
        })
        */
      },
      error: function(user,error) {
        response.error("parse error: couldn't create user " + error.code + " " + error.message);
      }
    });
};

function sendInvitationEmail(email,subject,tempPass,callbackObject) {
    "use strict";
    var sendgrid = require("sendgrid");
    var secrets = require("cloud/secrets.js");
  sendgrid.initialize(secrets.sendgriduser, secrets.sendgridpw); // TODO: your creds here...
  
  var fromname = "My Service";
  var from = "noreply@myservice.com";
  var subject = "Welcome to My Service";
  var template = "hello {email} your temporary password is {pass}" ;
    var emailText = template.replace(/{email}/g,email).replace(/{pass}/g,tempPass);
    
    sendgrid.sendEmail({
        to: email,
        from: from,
    fromname: fromname,
        subject: subject,
        text: emailText,
        
    }, callbackObject);
}

function genRandomPass() {
    return "1223"; // TODO: generate a password using a random pw generator
}