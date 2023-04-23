const version = "0.0.3";

const fs = require('fs');
const crypto = require('crypto');

const server = require('https').createServer({
  key: fs.readFileSync("./cert/key.pem"),
  cert: fs.readFileSync("./cert/cert.pem")
});

var clients = [];
var receivedMessages = [];

function sha256(input) {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}

const io = require('socket.io')(server);
io.on('connection', client => {
  console.log("Connected")
  clients.push(client)
  function processMessage(message) {
    message.from = client.id;

    if(message.pow==undefined||message.keyPow==undefined||message.hash==undefined||message.keyHash==undefined||message.messageId==undefined) {
      console.log("missing data")
      client.disconnect();
      return;
    }
    
    if(!message.hash.startsWith("0000")) {
      console.log("invalid message pow")
      client.disconnect();
      return;
    }
    if(!message.keyHash.startsWith("000000")) {
      console.log("invalid key pow")
      client.disconnect();
      return;
    }

    var toVerify = {
      messageId: message.messageId,
      encryptedMessage: message.encryptedMessage,
      encryptedKey: message.encryptedKey,
      publicKey: message.publicKey
    }

    if(sha256(JSON.stringify(toVerify)+message.pow)!=message.hash) {
      console.log("invalid hash")
      client.disconnect();
      return;
    }
    if(sha256(message.publicKey.toString()+message.keyPow)!=message.keyHash) {
      console.log("invalid key hash")
      client.disconnect();
      return;
    }

    
    if(receivedMessages.includes(message.messageId)) return;
    receivedMessages.push(message.messageId)
    clients.forEach(c=>{
      if(message.from==c.id) return;
      c.emit("redirectEncryptedMessage", message);
    })
  }

  client.on('redirectedEncryptedMessage', (message)=>{
    console.log(message);
    processMessage(message);
  });
  client.on('getStormnetVersion', () => client.emit("stormnetVersion", version));
  client.on('disconnect', () => {
    console.log("disconnected")
  });
});
server.listen(25852);
console.log("opened")