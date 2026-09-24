const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// Active rooms storage: { roomId: { name, players: [], inShift: false, shift: 1, bank: 0 } }
const rooms = {};

// Helper: Broadcast live room list to everyone browsing the lobby
function broadcastRoomList() {
  const roomList = Object.keys(rooms).map(id => ({
    id,
    name: rooms[id].name || id,
    playerCount: rooms[id].players.length,
    inShift: rooms[id].inShift,
    shift: rooms[id].shift || 1
  }));
  io.emit('room-list-update', roomList);
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerName = "Agent_" + socket.id.substring(0, 4);

  // 1. Client requests live room list
  socket.on('request-rooms', () => {
    broadcastRoomList();
  });

  // 2. Join or Create Room
  socket.on('join-room', ({ roomId, name }) => {
    if (currentRoom) {
      socket.leave(currentRoom);
      if (rooms[currentRoom]) {
        rooms[currentRoom].players = rooms[currentRoom].players.filter(p => p.id !== socket.id);
        if (rooms[currentRoom].players.length === 0) {
          delete rooms[currentRoom];
        }
      }
    }

    currentRoom = roomId;
    playerName = name || playerName;
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        name: roomId,
        players: [],
        bank: 0,
        shift: 1,
        inShift: false
      };
    }

    rooms[roomId].players.push({ id: socket.id, name: playerName });

    // Tell the room members about the new player
    io.to(roomId).emit('update-lobby', {
      roomId,
      players: rooms[roomId].players
    });

    // Notify all players browsing rooms that player count / room updated!
    broadcastRoomList();
    console.log(`[+] ${playerName} joined room: ${roomId} (${rooms[roomId].players.length} players)`);
  });

  // 3. Lobby Chat
  socket.on('send-lobby-chat', (text) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('receive-lobby-chat', { name: playerName, text });
  });

  // 4. Start Shift for Room
  socket.on('trigger-start-shift', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    rooms[currentRoom].inShift = true;
    io.to(currentRoom).emit('shift-started');
    broadcastRoomList();
  });

  // 5. Cursor Movement Relay
  socket.on('cursor-move', (coords) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('remote-cursor-move', {
      id: socket.id,
      name: playerName,
      x: coords.x,
      y: coords.y
    });
  });

  // 6. Disconnect handling
  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players = rooms[currentRoom].players.filter(p => p.id !== socket.id);

      io.to(currentRoom).emit('update-lobby', {
        roomId: currentRoom,
        players: rooms[currentRoom].players
      });

      socket.to(currentRoom).emit('player-left', { id: socket.id });

      if (rooms[currentRoom].players.length === 0) {
        delete rooms[currentRoom];
      }
      broadcastRoomList();
    }
    console.log(`[-] Player disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`XP Defender online on port ${PORT}`));
