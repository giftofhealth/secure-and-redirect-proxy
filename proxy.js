// -*- mode: javascript -*-
//    A multi backend secure proxy and plaintext port redirector
//    Copyright (C) 2019 Rajesh Vaidheeswarran
//
//    This program is free software: you can redistribute it and/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, either version 3 of the License, or
//    (at your option) any later version.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program.  If not, see <https://www.gnu.org/licenses/>.

const https = require("https");
const http = require("http");
const tls = require("tls");
const fs = require("fs");
const httpProxy = require('http-proxy');
const process = require('process');
const json5 = require('json5');
const version = 0.1;

var opt = require('node-getopt').create([
    ['r' , 'redirect'   , 'redirect HTTP from ARG to HTTPS.', null],
    ['t' , 'http=ARG'   , 'redirect HTTP from ARG to HTTPS.', 80],
    ['s' , 'secure=ARG'     , 'HTTPS Port.', 443],
    ['c' , 'certs=ARG'      , 'Certificates Directory', '/etc/letsencrypt/live'],
    ['p' , 'proxies=ARG'    , 'Proxies file', './proxies.json'],
    ['k' , 'keyfile=ARG'    , 'private key file name', 'privkey.pem'],
    ['C' , 'certfile=ARG'   , 'certifcate file', 'fullchain.pem'],
    ['P' , 'passphrase=ARG' , 'Passphrase for keys', null],
    ['h' , 'help'           , 'display this help'],
    ['v' , 'version'        , 'show version'],
    [''  , 'copyright'      , 'show copyright']
    
])              // create Getopt instance
    .bindHelp()     // bind option 'help' to default action
    .parseSystem(); // parse command line

function log(str) {
    let d = Date().replace(/\(.*$/, '');
    console.log(`${d} ${str}`);
}

function err(str) {
    let d = Date().replace(/\(.*$/, '');
    console.error(`${d} ${str}`);
}

process.on('exit', (code) => {
  log(`Exit: ${code}`);
});

const program = 'secure-proxy-redirector'
const copyright = program + ` Copyright (C) 2019  Rajesh Vaidheeswarran
    This program comes with ABSOLUTELY NO WARRANTY
    This is free software, and you are welcome to redistribute it
    under certain conditions.
`;

if (opt.options.version) console.log(`${copyright} Version v${version}`);

const proxies = json5.parse(fs.readFileSync(opt.options.proxies));
const hosts = Object.keys(proxies);

if (!fs.existsSync(opt.options.certs)) {
    console.log("ERROR: Need a valid certificate directory");
    opt.showHelp();
    process.exit(-1);
}

function read_creds(host) {
    let dir = opt.options.certs + '/' + host + '/';
    return { key: fs.readFileSync(dir + opt.options.keyfile), cert: fs.readFileSync(dir + opt.options.certfile) };
}

var certificates = {};
var proxy = httpProxy.createProxyServer();

const default_host = hosts[0];
hosts.forEach((host) => certificates[host] = read_creds(host));

const snicb = (servername, cb) => {
    if (certificates[servername]) {
        var passphrase = opt.options.passphrase;
	var ctx = tls.createSecureContext(Object.assign({passphrase}, certificates[servername]));
	// Compatibility with old versions of node
	if (cb) {
	    cb(null, ctx);
	} else {
	    return ctx;
	}
    }
};

// Create the https server on the specified port with the correct default certificates, etc.
// Proxy every request using SNI
https.createServer({
    key: certificates[default_host].key,
    cert: certificates[default_host].cert,
    passphrase: opt.options.passphrase,
    SNICallback: snicb
}, function(req, res) {
    try {
	log(`Proxy request for ${req.headers.host} => ${req.url}`);
	if (req.headers.host in proxies) {
	    log("Proxy to " + proxies[req.headers.host]);
	    proxy.web(req, res, { target: proxies[req.headers.host] });
	} else {
	    res.end("Hello, SSL World!");
	}
    } catch (e) {
	res.end("Sorry. Try calling us back later");
	error(`Redirect failure for ${req.url}`);
	error(e);
    }
}).listen(parseInt(opt.options.secure), function() {
    log(`SSL Proxy listening on port ${opt.options.secure}`);
});

// If a plain text redirection is opted for, start a HTTP server on the appropriate port and redirect to the https port to be proxied
if (opt.options.redirect) {
    http.createServer((req, res) => {
	try {
	    log(`Plain text request to ${req.headers.host} => ${req.url}`);
	    if (req.headers.host in proxies) {
		log(`Redirect to secure port ${req.headers.host}`);
		res.writeHead(302, {
		    'Location': "https://" + req.headers.host + req.url
		});
		res.end(`Redirecting to the secure port at ${req.headers.host}`);
	    } else {
		res.end("Hello, World!");
	    }
	} catch (e) {
	    res.end("Sorry. No one's home");
	    error(`Redirect failure for ${req.url}`);
	    error(e);
	}
    }).listen(parseInt(opt.options.http), function() {
	log(`HTTP redirector listening on port ${opt.options.http}`);
    });
}
