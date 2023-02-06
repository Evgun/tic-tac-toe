const express = require('express');
const path = require('path');
const http = require('http');
const socket = require('socket.io');

const PORT = process.env.PORT || 3002;
const app = express();
const server = http.createServer(app);
const io = socket(server, {
  cors: {
    origin: '*',
    methods: ['POST', 'GET'],
  },
});

const winLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];
const emptyField = [2, 2, 2, 2, 2, 2, 2, 2, 2];
const clientRooms = {};
const roomActivePlayers = new Map();
const roomFields = new Map();
const roomCheckType = new Map();

app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

io.on('connection', (client) => {
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);
  client.on('makeMove', handleMove);
  client.on('connection', handleConnection);
  client.on('disconnect', handleDisconnect);

  function handleMove(id) {
    let room = clientRooms[client.id];
    if (client.id === roomActivePlayers.get(clientRooms[client.id])) {
      let arr = roomFields.get(room);
      let check = roomCheckType.get(room);
      let users = io.sockets.adapter.rooms.get(room);
      if (arr[id] !== 0 && arr[id] !== 1) {
        arr[id] = check;
        roomCheckType.set(room, +!check);
        roomFields.set(room, arr);
        users = Array.from(users, (x) => {
          if (x !== client.id) {
            roomActivePlayers.set(room, x);
            return x + ' ⦿';
          }
          return x;
        });
        io.to(room).emit('setUsers', users);
        io.to(room).emit('setField', roomFields.get(room));
        checkWin(room);
      }
    }
  }

  function checkWin(room) {
    let arr = [...roomFields.get(room)];
    if (arr.indexOf(2) === -1) {
      io.to(room).emit('setField', emptyField);
      roomFields.set(room, [...emptyField]);
    }
    winLines.map((item) => {
      if (
        arr[item[0]] === arr[item[1]] &&
        arr[item[0]] === arr[item[2]] &&
        arr[item[0]] !== 2
      ) {
        io.to(room).emit('winner', arr[item[0]]);
        io.to(room).emit('setField', emptyField);
        roomFields.set(room, [...emptyField]);
      }
    });
  }

  function handleConnection() {
    console.log(`Client ${client.id} has connected`);
  }

  function handleNewGame() {
    let roomName = makeId(6);
    clientRooms[client.id] = roomName;

    client.emit('roomCode', roomName);
    client.join(roomName);
    client.number = 1;
  }

  function handleJoinGame(gameCode) {
    const room = io.sockets.adapter.rooms.get(gameCode);
    let numClients = 0;
    if (room) {
      numClients = room.size;
    }

    if (numClients === 0) {
      client.emit('error', 'Room does not exist');
      return;
    } else if (numClients > 1) {
      client.emit('error', 'Room is full');
      return;
    }

    clientRooms[client.id] = gameCode;

    client.join(gameCode);

    client.emit('roomCode', gameCode);
    let usrs = Array.from(io.sockets.adapter.rooms.get(gameCode), (x) => {
      if (x === client.id) {
        return x + ' ⦿';
      }
      return x;
    });
    roomActivePlayers.set(gameCode, client.id);
    roomFields.set(gameCode, [...emptyField]);
    roomCheckType.set(gameCode, 1);
    io.to(gameCode).emit('setUsers', usrs);
    io.to(gameCode).emit('setField', emptyField);
  }

  function handleDisconnect() {
    const roomId = clientRooms[client.id];
    delete clientRooms[client.id];
    console.log(`Client ${client.id} has disconnected`);
  }
});

function makeId(length) {
  let result = '';
  let characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let charLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charLength));
  }
  return result;
}
