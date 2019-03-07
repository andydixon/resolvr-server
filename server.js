'use strict';

/**

    Resolvr DNS Server - Advert, Spyware and Malware DNS Level Blocker
    Copyright (C) 2018- Andy Dixon

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
**/

let memcached = require('memcached');
let dns = require('native-dns');
let crypto = require('crypto');
let server = dns.createServer();
let authority = {
    address: '8.8.8.8',
    port: 53,
    type: 'udp'
};


let async = require('async');
let staticZones = require('./blacklist.js');
let memcache = new memcached('localhost');
let blacklist = staticZones['blacklist'];
var io = require('socket.io').listen(61327);

console.log('A R T E M I S  -  DNS Resolver Engine for cesolvr.cc');
console.log('Version 1.0  (c) 2018-2019 Andy Dixon');

function proxy(question, response, cb) {
    var request = dns.Request({
        question: question, // forwarding the question
        server: authority, // this is the DNS server we are asking
        timeout: 1000
    });
    // when we get answers, append them to the response
    request.on('message', (err, msg) => {
        let ttl = 60;
        //msg.answer.forEach(a => response.answer.push(a));
        msg.answer.forEach(function(record) {
            response.answer.push(record);
            ttl = record.ttl;
        });
        memcache.set(question.name + question.type, response.answer, ttl, function(err, result) {
            if (err) console.error(err);
        }); // @fixme: 60 seconds needs to be replaced by the TTL
    });

    request.on('end', cb);
    request.send();
}

function handleRequest(request, response) {

    let broadcast = {
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        ipAddress: request.address.address,
        status: 'success',
        hostname: request.question[0].name,
        note: ""
    };

    let f = [];

    request.question.forEach(question => {
        memcache.get(question.name + question.type, function(err, data) {
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
                    broadcast.note = "Blacklisted";
                    broadcast.status = 'warning';
                } else {
                    f.push(cb => proxy(question, response, cb));
                }
            }
            io.emit("resolvr_monitor", broadcast);
            io.emit(generateHash(request.address.address), broadcast);
            async.parallel(f, function() {
                response.send();
            });
        });
    });
}


function generateHash(ipAddress) {
    return crypto.createHash('sha256').update("salty" + ipAddress + "goat").digest('hex');
}



server.on('request', handleRequest);

server.on('listening', () => console.log('server listening on', server.address()));
server.on('close', () => console.log('server closed', server.address()));
server.on('error', (err, buff, req, res) => console.error(err.stack));
server.on('socketError', (err, socket) => console.error(err));

// For individual user monitoring, send the sha256 of their handle so they can subscribve
io.on('connection', function(socket) {
    var ipAddress = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address;
    socket.emit('handler', generateHash(ipAddress));
});

server.serve(53);
