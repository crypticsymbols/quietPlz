'use strict';

var async = require('async');
var dns = require('native-dns');
var server = dns.createServer();
var blacklist = require('./blacklist');

// set up our DNS server
server.on('listening', () => console.log('server listening on', server.address()));
server.on('close', () => console.log('server closed', server.address()));
server.on('error', (err, buff, req, res) => console.error(err.stack));
server.on('socketError', (err, socket) => console.error(err));
server.serve(53);

// set up the database - store in memory and re-import the blacklist each restart
var sqlite3 = require('sqlite3');
var db = new sqlite3.Database(':memory:');
db.serialize(function(){
  db.run("CREATE TABLE IF NOT EXISTS blacklist (domain TEXT)");
  var stmt = db.prepare("INSERT INTO blacklist VALUES (?)");
  blacklist.forEach(function(val, key){
    stmt.run(val)
  })
  stmt.finalize();
});

// Proxy DNS requests to Google
function proxyDnsRequest(question, response, cb) {
  var authority = { address: '8.8.8.8', port: 53, type: 'udp' };
  // console.log('proxying', question.name);
  var request = dns.Request({
    question: question, // forwarding the question
    server: authority,  // this is the DNS server we are asking
    timeout: 1000
  });
  // when we get answers, append them to the response
  request.on('message', (err, msg) => {
    msg.answer.forEach(a => response.answer.push(a));
  });
  request.on('end', cb);
  request.send();
}

// Handle the DNS request to *this* server
function handleRequest(request, response) {

  var answers = [];
  var respond = function(){
    async.parallel(answers, function() { 
      response.send(); 
    });
  }

  var queryFormat = function(domainList){
    return domainList.map(function(q){
      return q.name;
    }).join(', ');
  }

  var filterAndRespond = function(blacklist, question, responder){
    var blacklistMapped = blacklist.map(function(v){ return v.domain; })
    question.forEach(function(question, key){
      if (blacklistMapped.indexOf(question.name) === -1){
        answers.push(function(cb){
          proxyDnsRequest(question, response, cb);
        });  
      }
    })
    responder();
  }

  // get domains in the query that are blacklisted
  var query = "SELECT domain FROM blacklist WHERE domain IN (?)";
  db.all(query, queryFormat(request.question), function(err, rows){
    if (err){
      // console.log(err);
      respond();
    } else {
      filterAndRespond(rows, request.question, respond)
    }
  });
}

server.on('request', handleRequest);
