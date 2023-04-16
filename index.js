const version = "0.0.2"

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
    console.log(message)
    if(message.pow==undefined||message.hash==undefined||message.messageId==undefined) {
      client.disconnect();
      return;
    }
    var toVerify = {
      messageId: message.messageId,
      encryptedMessage: message.encryptedMessage,
      encryptedKey: message.encryptedKey,
      publicKey: message.publicKey
    }
    if(sha256(JSON.stringify(toVerify)+message.pow)!=message.hash||!message.hash.startsWith("0000")) {
      // invalid proof of work
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

  client.on('redirectedEncryptedMessage', processMessage);
  client.on('getStormnetVersion', () => client.emit("stormnetVersion", version));
  client.on('disconnect', () => {
    console.log("disconnected")
  });
});
server.listen(25852);
console.log("opened")