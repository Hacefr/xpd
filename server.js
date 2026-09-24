const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerName = "Agent_" + socket.id.substring(0, 4);

  // Join or Create Room
  socket.on('join-room', ({ roomId, name }) => {
    if (currentRoom) socket.leave(currentRoom);

    currentRoom = roomId;
    playerName = name || playerName;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], bank: 0, shift: 1, inShift: false };
    }

    rooms[roomId].players.push({ id: socket.id, name: playerName });

    // Sync player list to the lobby
    io.to(roomId).emit('update-lobby', {
      roomId,
      players: rooms[roomId].players
    });

    console.log(`[+] ${playerName} joined room: ${roomId}`);
  });

  // Lobby Chat
  socket.on('send-lobby-chat', (text) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('receive-lobby-chat', { name: playerName, text });
  });

  // Start Shift for whole room
  socket.on('trigger-start-shift', () => {
    if (!currentRoom) return;
    rooms[currentRoom].inShift = true;
    io.to(currentRoom).emit('shift-started');
  });

  // Cursor sync
  socket.on('cursor-move', (coords) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('remote-cursor-move', {
      id: socket.id,
      name: playerName,
      x: coords.x,
      y: coords.y
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players = rooms[currentRoom].players.filter(p => p.id !== socket.id);
      io.to(currentRoom).emit('update-lobby', {
        roomId: currentRoom,
        players: rooms[currentRoom].players
      });
      socket.to(currentRoom).emit('player-left', { id: socket.id });
      if (rooms[currentRoom].players.length === 0) delete rooms[currentRoom];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server online on port ${PORT}`));
