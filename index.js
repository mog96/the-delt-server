// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var S3Adapter = require('parse-server').S3Adapter;
var ParseServer = require('parse-server').ParseServer;
var path = require('path');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI || 'mongodb://mog96:nicolai98@ds019936.mlab.com:19936/rooney-staging';

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'cEpg8HAH75eVLcqfp9VfbQIdUJ1lz7XVMwrZ5EYc',
  masterKey: process.env.MASTER_KEY || 'ueJ88BbtWEfPguvMJ53HkelAs4Kb5TCMkLY0CO6r', //Add your master key here. Keep it secret!
  fileKey: process.env.FILE_KEY || '46067a00-1d80-4666-b544-6ddafe31e07d',
  serverURL: process.env.SERVER_URL || 'http://localhost:1337/parse',  // Don't forget to change to https if needed
  filesAdapter: new S3Adapter(
    process.env.AWS_ACCESS_KEY_ID || 'AKIAJ4GZ47PC6RZGUFRA',
    process.env.AWS_SECRET_ACCESS_KEY || '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',
    process.env.BUCKET_NAME || 'etadeuteron',
    {directAccess: true}
  ),
  push: {
    ios: {
      pfx: process.env.APS_PRODUCTION_CERT_PATH || 'certs/aps_development.p12', // the path and filename to the .p12 file you exported earlier.
      passphrase: process.env.APS_PRODUCTION_CERT_PASSPHRASE || 'etadeuteron',
      bundleId: process.env.APS_APP_BUNDLE_ID || 'com.tdx.thedelt', // The bundle identifier associated with your app
      production: false // Specifies which environment to connect to: Production (if true) or Sandbox
    }
  }
  // liveQuery: {
  //   classNames: ["Posts", "Comments"] // List of classes to support for query subscriptions
  // }
});

// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
  console.log('parse-server-example running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
