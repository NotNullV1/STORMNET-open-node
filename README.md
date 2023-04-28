# StormNet Open Node

STORMNET Open Node is a server application that allows encrypted messages to be redirected to all connected clients. This application is designed to enhance security by ensuring that messages are encrypted and cannot be intercepted by unauthorized persons.

To use STORMNET Open Node, you need to manually create SSL certificate files, namely `key.pem` and `cert.pem`, in the `cert/` folder.

You can change the port number using the `-p` or `--port` flag.

To run STORMNET Open Node, execute the following commands:
```
npm build
node dist/main.js -p 1234
```

We recommend using bun over node as it is much faster.

Thank you for running STORMNET Open Node!