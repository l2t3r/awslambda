//This is version 2 of sms script. I have implemented the existing https requests module with promises using the q lib
//Ashley A
//dated: 17-August-2015

var aws  = require('aws-sdk');
var Q = require('q');
var https = require('https');
var queryString = require('querystring');

console.log('Loading event');

// Twilio Credentials
var accountSid = '';
var authToken = '';
var fromNumber = '';

//Object of sms users to notify
var smslist = {
    ashley: '+1xxxxxxxxxx',
    userb: '+1xxxxxxxxxxx',
};


// Lambda export:
exports.handler = function (event, context) {

  //promise version of https request
  function promisedRequest(to)
  {

       var message = {
           To: smslist[to],
           From: fromNumber,
           Body: smsBody
       };

       var messageString = queryString.stringify(message);
       console.log(messageString);

      // Options and headers for the HTTP request
       var requestOptions = {
         host: 'api.twilio.com',
         port: 443,
         path: '/2010-04-01/Accounts/' + accountSid + '/Messages.json',
         method: 'POST',
         headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(messageString),
                    'Authorization': 'Basic ' + new Buffer(accountSid + ':' + authToken).toString('base64')
                 }
       };

    		//create a deferred object from Q
      var deferred  = Q.defer();
      var req = https.request(requestOptions, function(response) {
        //set the response encoding to parse json string
        response.setEncoding('utf8');
        var responseData = '';
        //append data to responseData variable on the 'data' event emission
        response.on('data', function(data) {
          responseData += data;
        });
        //listen to the 'end' event
        response.on('end', function() {
          //resolve the deferred object with the response
          deferred.resolve(responseData);
        });
      });

      //listen to the 'error' event
    	req.on('error', function(err) {
    	  //if an error occurs reject the deferred
    	  deferred.reject(err);
    	});
      req.write(messageString);
    	req.end();
    	//we are returning a promise object
    	//if we returned the deferred object
    	//deferred object reject and resolve could potentially be modified
    	//violating the expected behavior of this function
    	return deferred.promise;

  }

  console.log('Received event..');
  var smsMessage = JSON.parse(event.Records[0].Sns.Message);
  console.log(smsMessage);

  //Build the message I need to send
  var smsBody = smsMessage.Region+" "+smsMessage.AlarmName+" "+smsMessage.NewStateValue+" "+smsMessage.StateChangeTime
  var requests = Object.keys(smslist).map(promisedRequest);

 //Final collection of messages
  Q.all(requests)
        .then(
          function(results){
           console.log("All request have completed");
           console.log(results);
           context.done();
  },function(error){
        context.fail(JSON.stringify(error));
      }
  );


};
