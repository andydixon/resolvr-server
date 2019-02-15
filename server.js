'use strict';
let memcached = require('memcached');
let dns = require('native-dns');
let server = dns.createServer();
let authority = {
    address: '8.8.8.8',
    port: 53,
    type: 'udp'
};


let async = require('async');
let staticZones  = require('./blacklist.js');
let memcache = new memcached('localhost');
let blacklist = staticZones['blacklist'];
var io = require('socket.io').listen(61327);

function proxy(question, response, cb) {
    var request = dns.Request({
        question: question, // forwarding the question
        server: authority, // this is the DNS server we are asking
        timeout: 1000
    });
    // when we get answers, append them to the response
    request.on('message', (err, msg) => {
        msg.answer.forEach(a => response.answer.push(a));
	memcache.set(question.name+question.type, response.answer, 60,function( err, result ){
		                    if( err ) console.error( err );
		                }); // @fixme: 60 seconds needs to be replaced by the TTL
    });

    request.on('end', cb);
    request.send();
}

function handleRequest(request, response) {
	var today = new Date();
	let broadcast={timestamp:today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate()+' '+today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds(),ipAddress:request.address.address,status:'success',hostname:request.question[0].name,note:""};

    let f = [];

    request.question.forEach(question => {
        memcache.get(question.name+question.type, function(err, data) {
            if (data) {
		broadcast.note = "cached";
		    broadcast.status = 'primary';
                response.answer = data;
            } else {
                let entry = blacklist[question.name];
                if (entry !== undefined) {
			//Host is blacklisted
			//so lets not send anything for a DNSFAIL.
			//The comment block below shows how to craft a record
		/**
		  try{
                  	entry[0].records.forEach(record => {
                        record.name = question.name;
                        record.ttl = record.ttl || 1800;
                        response.answer.push(dns[record.type](record));
			    broadcast.note="Blacklisted";
			    broadcast.status = 'warning';
                    });
			} catch(e) {
				broadcast.note = "Exception AC1";
				broadcast.status = 'danger';
			} 
				**/
                        broadcast.note="Blacklisted";
                        broadcast.status = 'warning';
                } else {
                    f.push(cb => proxy(question, response, cb));
                }
            }
		io.emit("resolvr_monitor",broadcast);
	    async.parallel(f, function() {
	    	response.send();
	        });
        });
    });
}

server.on('request', handleRequest);

server.on('listening', () => console.log('server listening on', server.address()));
server.on('close', () => console.log('server closed', server.address()));
server.on('error', (err, buff, req, res) => console.error(err.stack));
server.on('socketError', (err, socket) => console.error(err));

server.serve(53);
