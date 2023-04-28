const version: string = "0.0.3";

import * as fs from 'fs';
import * as crypto from 'crypto';
import * as https from 'https';
import * as ioModule from 'socket.io';
import * as commander from 'commander';

const serverOptions: https.ServerOptions = {
  key: fs.readFileSync("./cert/key.pem"),
  cert: fs.readFileSync("./cert/cert.pem")
};

const server: https.Server = https.createServer(serverOptions);

commander.program
    .option('-p, --port <port>', 'Specify the port to listen on', parseInt)
    .parse(process.argv);

const port = commander.program.getOptionValue("port") || 25852;

interface Message {
  pow: string;
  keyPow: string;
  hash: string;
  keyHash: string;
  messageId: string;
  from?: string;
  encryptedMessage: string;
  encryptedKey: string;
  publicKey: string;
}

const clients: Map<string, ioModule.Socket> = new Map();
const receivedMessages: Set<string> = new Set();

function sha256(input: string): string {
  const hash: crypto.Hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}

const io: ioModule.Server = new ioModule.Server(server);
io.on('connection', (client: ioModule.Socket) => {
  console.log(`Client ${client.id} connected`);
  clients.set(client.id, client);

  function processMessage(message: Message) {
    message.from = client.id;

    if(message.pow == undefined || message.keyPow == undefined || message.hash == undefined || message.keyHash == undefined || message.messageId == undefined) {
      console.log(`Client ${client.id} sent an incomplete message`);
      client.disconnect();
      return;
    }

    if(!message.hash.startsWith("0000")) {
      console.log(`Client ${client.id} sent a message with an invalid PoW`);
      client.disconnect();
      return;
    }
    if(!message.keyHash.startsWith("000000")) {
      console.log(`Client ${client.id} sent a message with an invalid key PoW`);
      client.disconnect();
      return;
    }

    const toVerify: object = {
      messageId: message.messageId,
      encryptedMessage: message.encryptedMessage,
      encryptedKey: message.encryptedKey,
      publicKey: message.publicKey
    }

    if(sha256(JSON.stringify(toVerify) + message.pow) !== message.hash) {
      console.log(`Client ${client.id} sent a message with an invalid hash`);
      client.disconnect();
      return;
    }
    if(sha256(message.publicKey.toString() + message.keyPow) !== message.keyHash) {
      console.log(`Client ${client.id} sent a message with an invalid key hash`);
      client.disconnect();
      return;
    }

    if(receivedMessages.has(message.messageId)) {
      console.log(`Client ${client.id} sent a duplicate message`);
      return;
    }
    receivedMessages.add(message.messageId);
    for(const [id, c] of clients) {
      if(message.from === id) continue;
      c.emit("redirectEncryptedMessage", message);
    }
    console.log(`Client ${client.id} sent a valid message`);
  }

  client.on('redirectedEncryptedMessage', (message: Message)=>{
    console.log(`Received redirected message from client ${client.id}`);
    console.log(`Message: ${JSON.stringify(message)}`);
    processMessage(message);
  });
  client.on('getStormnetVersion', () => {
    console.log(`Client ${client.id} requested Stormnet version`);
    client.emit("stormnetVersion", version);
  });
  client.on('disconnect', () => {
    console.log(`Client ${client.id} disconnected`);
    clients.delete(client.id);
  });
});

server.listen(port);
console.log(`Server started listening on port ${port}`);
