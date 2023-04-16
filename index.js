const version = "0.0.2"

const fs = require('fs');

const server = require('https').createServer({
  key: fs.readFileSync("./cert/key.pem"),
  cert: fs.readFileSync("./cert/cert.pem")
});

var clients = [];
var receivedMessages = [];

const io = require('socket.io')(server);
io.on('connection', client => {
  console.log("Connected")
  clients.push(client)
  function processMessage(message) {
    message.from = client.id;
    console.log(message)
    if(message.messageId==undefined) return;
    if(receivedMessages.includes(message.messageId)) return;
    receivedMessages.push(message.messageId)
    clients.forEach(c=>{
      if(message.from==c.id) return;
      c.emit("redirectEncryptedMessage", message);
    })
  }

  client.on('redirectedEncryptedMessage', processMessage);
  client.on('getVersion', () => client.emit("version", version));
  client.on('disconnect', () => {
    console.log("disconnected")
  });
});
server.listen(25852);
console.log("opened")