#!/bin/sh
cd /src
memcached -vv -p11211 -u memcache -m 64 &
node server.js
