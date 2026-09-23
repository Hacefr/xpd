const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// Serve static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Active rooms storage
const rooms = {};

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerName = "Agent_" + socket.id.substring(0, 4);

  // 1. Join / Create Room
  socket.on('join-room', ({ roomId, name }) => {
    if (currentRoom) socket.leave(currentRoom);

    currentRoom = roomId;
    playerName = name || playerName;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { players: [], bank: 0, shift: 1 };
    }

    rooms[roomId].players.push({ id: socket.id, name: playerName });

    // Notify room of new player
    io.to(roomId).emit('player-joined', {
      id: socket.id,
      name: playerName,
      players: rooms[roomId].players
    });

    console.log(`[+] ${playerName} joined room: ${roomId}`);
  });

  // 2. Sync Cursor Movement (Normalized percentages: 0.0 to 1.0)
  socket.on('cursor-move', (coords) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('remote-cursor-move', {
      id: socket.id,
      name: playerName,
      x: coords.x,
      y: coords.y
    });
  });

  // 3. Sync Server Threats (Loserar files, QUIET! volume, WannaCry)
  socket.on('sync-server-threat', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('receive-server-threat', data);
  });

  // 4. Dead Chat messages (Blind to living players)
  socket.on('send-dead-chat', (msg) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('receive-dead-chat', { name: playerName, text: msg });
  });

  // 5. Disconnect handling
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players = rooms[currentRoom].players.filter(p => p.id !== socket.id);
      socket.to(currentRoom).emit('player-left', { id: socket.id });
      if (rooms[currentRoom].players.length === 0) delete rooms[currentRoom];
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`XP Defender server online on port ${PORT}`));
