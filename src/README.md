# Resolvr DNS Server
![](https://scrutinizer-ci.com/g/andydixon/resolvr-server/badges/quality-score.png?b=master) ![](https://scrutinizer-ci.com/g/andydixon/resolvr-server/badges/build.png?b=master)

Resolvr DNS server and supporting configuration Updating with PHP script. _note to self be more imaginitive_

# Installation #

With NodeJS, memcached and NPM installed, run the following:
``` npm install``` followed by ``` nodejs server.js <ip address to bind to> ``` to start it.


# Known Bugs #

For a change I will empty my head into the *issues* section of GitHub. You may want check that out.

# Performance #

![](https://resolvr.cc/2018stats.jpg)
Even before a lot of optimisations were in place, I had some debug in which would log the requests anonymously into elastic. Here's the stats from November 2018. The DNS resolver is now 450% faster and uses a fraction of memory it's predicesor did.


# License #

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
