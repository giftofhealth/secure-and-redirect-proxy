# secure-and-redirect-proxy
A proxy server to redirect plaintext port for multiple back end servers and TLS front end for multiple backend servers

## Installation
Run ```npm install``` to install all the dependencies

## Configuration

A configuration file (default: ```proxies.json```) determines the front end to backend configuration
```
    // To be parsed with JSON5 parser if you want to comment clearly
    {
        // Front end server : backend
        'server1.mydomain.com' : 'https://mybackend1.local',
        'server2.mydomain.com' : 'https://mybackend2.local',
        'server3.mydomain.com' : 'https://external.host.com'
    }
```
### Command line options
Run ```node ./proxy.js -h``` to see the options.

### Network flow diagram

Once the certificates and keys are read for each of the front end
servers you are securely proxying, the incoming traffic on the secure
port and the plaintext port (if the plaintext redirection is turned
on), will be securely proxied to configured backend servers.
```

          +------------------------------------+
          |                                    |                     +-----------------+
 Port 443 |                                    +-------------------->+ mybackend1.local|
<-------->+      Proxy server driven by        |                     |                 |
          |      a proxies configuration       |                     +-----------------+
          |      file                          |
          |              +                     |                     +----------------+
          |              |                     +-------------------->+mybackend2.local|
Port 80   |              |                     |                     |                |
<-------->+              |                     |                     +----------------+  XXXXXXXXXX
          |              |                     |                                   XXXXXXX         XXXXX
          |              |                     |                                 XXX                   XXX
          |              |                     +-------------------------------> XX                      XX
          +--------------|---------------------+                               XXX                        X
                         v                                                     X XX     cloud             XX
          // To be parsed with JSON5 parser if you want to comment clearly  XXXX                           X
          {                                                                 X                             XX
              // Front end server : backend                                 X                            XX
              'server1.mydomain.com' : 'https://mybackend1.local',          XXXX                        XX
              'server2.mydomain.com' : 'https://mybackend2.local',             XX      XXXX          XXX
              'server3.mydomain.com' : 'https://external.host.com'               XXXXXX   XX+XXXXXXXX
          }                                                                                 |
                                                                                            |
                                                                                            |
                                                                                            |
                                                                                            |
                                                                                            v
                                                                                     +------+--------+
                                                                                     | external.     |
                                                                                     | host.com      |
                                                                                     |               |
                                                                                     |               |
                                                                                     +---------------+
```
