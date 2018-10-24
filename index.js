var config = require('./config');

// start monitoring with elastic apm early
var apm = require('elastic-apm-node').start(config.elasticApm)

var cluster = require('cluster');

if (cluster.isMaster) {
    cluster.fork();

    cluster.on('exit', function(worker, code, signal) {
        cluster.fork();
    });
}

if (cluster.isWorker){

    var fs = require('fs');
    var app = require('express')();

    var sslCert = {
        cert: fs.readFileSync('/etc/letsencrypt/live/twitter.tracemap.info/fullchain.pem'),
        key: fs.readFileSync('/etc/letsencrypt/live/twitter.tracemap.info/privkey.pem')
    };

    var https = require('https').createServer( sslCert, app);
    var io = require('socket.io')(https);
    var Twitter = require('node-twitter-api');
    var mysql = require('mysql');

    var userExistsErrorPage = config.pages.userExistsPage;
    var errorPage = config.pages.errorPage;


    //Get mysql-credentials from config file
    var dbCon = mysql.createConnection({
        host: config.dbCred.host,
        user: config.dbCred.user,
        password: config.dbCred.password,
        database: config.dbCred.database
    });

    // Connect to the database
    dbCon.connect( function( error){
        if( error) console.log( error);
    });


    // This function is executed when a client connets to the server
    io.on('connection', function(socket){


        // Some information about the connecting client for the log
        var clientAddr = socket.request.connection.remoteAddress;
        var clientPort = socket.request.connection.remotePort;
        var client = clientAddr + ":" + clientPort;
        console.log("New Connection (" + client + ")");

        // Twitter Object to identify your application 
        // key&secret are stored in your application settings
        var twitter = new Twitter({
            consumerKey: config.twitterCred.consumerKey,
            consumerSecret: config.twitterCred.consumerSecret,
            callback: config.twitterCred.callback,
            x_auth_access_type: "read"
        });

        // Get numbers of token in the db and send it to the
        // frontend for showing a counter
        (function() {
            var sql = "SELECT COUNT(1)AS tokenCount FROM userCredentials WHERE accessToken IS NOT NULL";
            dbReadData(sql, function( result){
                socket.emit('setCounter', result[0].tokenCount);
            });
        })();

        // When client clicks the "Login with Twitter" button:
        // Get requestToken & requestTokenSecret, save them to the users database
        // and redirect the client to twitter login page
        socket.on('twitterAuth', function(){
            twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results){
                if(error) {
                    console.log("######  Error getting OAuth request token: " + JSON.stringify(error));
                } else {
                    var sql = "INSERT INTO userCredentials (requestToken, requestTokenSecret) VALUES ('"
                        + requestToken + "', '" + requestTokenSecret + "')";
                    dbWriteData(sql, function( result){
                            console.log( "requestToken & requestSecret are stored in the db.");
                    });
                    socket.emit('redirect', twitter.getAuthUrl(requestToken));
                }
            });
        });

        // When callback url specified in the config connects to the server:
        // Get according requestToken from the database and receive
        // accessToken && accessTokenSecret from twitter.
        // verify the credentials and safe them to the database.
        socket.on('getAccessToken', function(oauth_token, oauth_verifier){
            dbReadData("SELECT requestTokenSecret FROM userCredentials WHERE requestToken = '"
                    + oauth_token + "'", function ( result){
                var requestTokenSecret = result;
                twitter.getAccessToken(oauth_token, requestTokenSecret, oauth_verifier, function( error, accessToken, accessTokenSecret, results){
                    if( error) handleError( error);
                    //Verify if Token & Secret are valid:
                    twitter.verifyCredentials(accessToken, accessTokenSecret, function( error, data, response){
                        if( error) handleError( error);
                        else {
                            var userName = data["screen_name"];
                            console.log( userName + " is now saved to the database.");
                            var sql = "UPDATE userCredentials SET accessToken = '" + accessToken + 
                                "', accessTokenSecret = '" + accessTokenSecret +
                                "', userName = '" + userName +
                                "' WHERE requestToken = '" + oauth_token + "'";
                            dbWriteData(sql, function( result){
                                console.log( "accessToken & accessTokenSecret for " 
                                        + userName + " are saved to the database.");
                            });
                        }
                    });

                });
            });
        });

        //Read some data from the database and return it
        function dbReadData( query, callback){
            dbCon.query( query, function( error, result, fields){
                if( error) handleError( error);
                else callback( result);
            });
        }

        //Write some data to the database and return result
        function dbWriteData( query, callback){
            dbCon.query( query, function( error, result){
                if( error) handleError( error);
                else callback( result);
            });
        }

        //Handle errors:
        //Redirect user to "user exists page" if accessToken is already in the database
        //Redirect user to "error page" for other errors (ask him to try again)
        function handleError( error){
            console.log( "!!!!!  " + error + "  !!!!!");
            if(error.code && error.code.indexOf("ER_DUP_ENTRY") >= 0) {
                console.log("redirecting to user exists page");
                socket.emit('redirect', userExistsErrorPage);
            } else {
                socket.emit('redirect', errorPage);
            }

            //Save message to error.log with client ip and error message
            var clientAddr = socket.request.connection.remoteAddress;
            var logMsg = clientAddr + "\n" + error + "\n\n";
            fs.appendFile('error.log', logMsg, function( err){
                if( err) console.log( "!!!!!  Couldnt write Error to error.log: " + err);
            });
        }

        socket.on('disconnect', function(){
            console.log( client + " disconnected.");
        });
    });

    //Listening for clients on port 3000
    https.listen(3000, function(){
        console.log('listening on port 3000');
    });

}
