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

const net = require('net');
var memcached = require('memcached');
var dns = require('native-dns');
var crypto = require('crypto');
var uuid = require('./fastuuid');
var async = require('async');
var io = require('socket.io').listen(61327);


var customRecords = [];
let server = dns.createServer();

let authority = [
    { address: '8.8.8.8', port: 53, type: 'udp' },
    { address: '8.8.4.4', port: 53, type: 'udp' },
    { address: '208.67.222.222', port: 53, type: 'udp' },
    { address: '208.67.220.220', port: 53, type: 'udp' },
    { address: '1.1.1.1', port: 53, type: 'udp' }
];

// Specify zone profiles. @fixme: Code is dodgy AF
try {
    var staticZones = require('./profiles/' + process.argv[1] + '.js');
    console.log("Loaded profile "+ process.argv[1]);
} catch (e) {
    var staticZones = require('./profiles/full.js');
    console.log("Loaded default (full) profile");
}


let memcache = new memcached('localhost');
let blacklist = staticZones['blacklist'];
let serverUUID = uuid.v4();


function proxy(question, response, cb) {
    var server = authority[Math.floor(Math.random() * authority.length)];
    var request = dns.Request({
        question: question,
        server: server, 
        timeout: 1000
    });
    console.log(question.name + " proxied to " + server.address);
    // when we get answers, append them to the response
    request.on('message', (err, msg) => {
        var ttl = 60;
        msg.answer.forEach(function (record) {
            response.answer.push(record);
            ttl = record.ttl;
        });
        memcache.set(question.name + question.type, response.answer, ttl, function (err, result) {
            if (err) console.error(err);
        });
    });

    request.on('end', cb);
    request.send();
}

function handleRequest(request, response) {
    // Default emit for web based UI
    var broadcast = {
        timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
        ipAddress: request.address.address,
        status: 'success',
        hostname: request.question[0].name,
        note: ""
    };

    var f = [];

    request.question.forEach(question => {
        memcache.get(question.name + question.type, function (err, data) {
            console.log(question);
            if (data) {
                broadcast.note = "cached";
                broadcast.status = 'primary';
                response.answer = data;
                console.log(question.name + " Type " + question.type + " is cached");
            } else {
                var custom = customRecords[question.name];
                if (custom !== undefined) {
                    response.answer.push(custom);
                    response.send();
                } else {
                    var entry = blacklist[question.name];
                    if (entry !== undefined) {
                        //Host is blacklisted
                        //so lets not send anything for a DNSFAIL.
                        //Which is bad so we should really fix this
                        response.answer.push(dns.NOTFOUND); //possibly?
                        broadcast.note = "Blacklisted";
                        broadcast.status = 'warning';
                        console.log(question.name + " is blacklisted.");
                    } else {
                        f.push(cb => proxy(question, response, cb));
                    }
                }
            }
            io.emit("resolvr_monitor", broadcast);
            io.emit(generateHash(request.address.address), broadcast);
            if (response.answer.length > 0 || f.length > 0) {
                try {
                    async.parallel(f, function () {
                        response.send();
                    });
                } catch (e) { }
            }
        });
    });
}
