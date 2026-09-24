const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// Active rooms storage
const rooms = {};

const DRAFT_POOL = [
  { id: 'defender', type: 'upgrade', title: '🛡️ Windows Defender', desc: 'Permanent safety shield against 1 fatal mistake every shift!' },
  { id: 'tracker', type: 'upgrade', title: '🎯 Tracker Tool', desc: 'Highlights real infected .rar files through the Scramble clutter!' },
  { id: 'ram', type: 'upgrade', title: '💾 +512MB RAM', desc: 'Increases CPU headroom. CPU fills 20% slower.' },
  { id: 'err_curse', type: 'curse', title: '💀 ERR: Broken Script', desc: 'Numbers are invisible! Rely on audio clicks (+ $150 Cash).' },
  { id: 'loserar_curse', type: 'curse', title: '💀 Loserar: Scramble', desc: 'Floods 32+ duplicate folders across the desktop (+ $120 Cash).' },
  { id: 'quiet_curse', type: 'curse', title: '💀 QUIET!: MEDIUM', desc: 'Volume cannot drop below 40% or reach 100% (+ $140 Cash).' }
];

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

function checkShiftCompletion(roomId) {
  const room = rooms[roomId];
  if (!room || !room.inShift) return;

  const total = room.players.length;
  const activeCount = room.players.filter(p => p.status === 'active').length;
  const safeCount = room.players.filter(p => p.status === 'clocked_out').length;
  const deadCount = room.players.filter(p => p.status === 'dead').length;

  // Broadcast live agent counts to the room
  io.to(roomId).emit('agent-status-update', { active: activeCount, safe: safeCount, dead: deadCount });

  // If no active players left on the shift:
  if (activeCount === 0) {
    room.inShift = false;

    // SAFE GREEDING CHECK: Did at least 1 person clock out?
    if (safeCount > 0) {
      // Pick 3 random draft choices on the server so everyone sees identical cards
      const shuffled = [...DRAFT_POOL].sort(() => 0.5 - Math.random());
      room.currentDraft = shuffled.slice(0, 3);
      room.draftVotes = { 0: 0, 1: 0, 2: 0 };
      room.playerVotes = {};

      io.to(roomId).emit('shift-completed-intermission', {
        shift: room.shift,
        bank: room.bank,
        draftCards: room.currentDraft,
        saveNote: deadCount > 0 ? "Shift saved by the Clocked-Out Anchor!" : ""
      });
    } else {
      // Everyone died and nobody clocked out -> Team Wipe BSOD!
      io.to(roomId).emit('team-bsod', "Entire team was eliminated. No agent clocked out.");
    }
    broadcastRoomList();
  }
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerName = "Agent_" + socket.id.substring(0, 4);

  socket.on('request-rooms', () => broadcastRoomList());

  socket.on('join-room', ({ roomId, name }) => {
    if (currentRoom && rooms[currentRoom]) {
      socket.leave(currentRoom);
      rooms[currentRoom].players = rooms[currentRoom].players.filter(p => p.id !== socket.id);
      if (rooms[currentRoom].players.length === 0) delete rooms[currentRoom];
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
        inShift: false,
        currentDraft: [],
        draftVotes: {},
        playerVotes: {}
      };
    }

    rooms[roomId].players.push({ id: socket.id, name: playerName, status: 'active' });

    io.to(roomId).emit('update-lobby', { roomId, players: rooms[roomId].players });
    broadcastRoomList();
  });

  socket.on('send-lobby-chat', (text) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit('receive-lobby-chat', { name: playerName, text });
  });

  socket.on('trigger-start-shift', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    room.inShift = true;
    room.players.forEach(p => p.status = 'active'); // Revive all players for new shift!

    io.to(currentRoom).emit('shift-started');
    io.to(currentRoom).emit('agent-status-update', { active: room.players.length, safe: 0, dead: 0 });
    broadcastRoomList();
  });

  // Player clocks out individually (Anchor / Safe Greeding)
  socket.on('player-clocked-out', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.status = 'clocked_out';
      socket.emit('enter-safe-spectator'); // Put THIS player into spectator mode!
      checkShiftCompletion(currentRoom);
    }
  });

  // Player eliminated by a threat
  socket.on('player-eliminated', (reason) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.status = 'dead';
      socket.emit('enter-eliminated-spectator', reason);
      checkShiftCompletion(currentRoom);
    }
  });

  // Hardware / Server Wipe (CPU or Volume 100%)
  socket.on('hardware-failure', (reason) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];
    const safeCount = room.players.filter(p => p.status === 'clocked_out').length;

    if (safeCount > 0) {
      // Safe Greed saves the room! Force complete shift!
      room.players.forEach(p => { if (p.status === 'active') p.status = 'dead'; });
      checkShiftCompletion(currentRoom);
    } else {
      io.to(currentRoom).emit('team-bsod', reason);
    }
  });

  // Draft Voting System (Majority Rules!)
  socket.on('cast-draft-vote', (cardIndex) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    const room = rooms[currentRoom];

    // Record or update vote
    const prevVote = room.playerVotes[socket.id];
    if (prevVote !== undefined) room.draftVotes[prevVote]--;

    room.playerVotes[socket.id] = cardIndex;
    room.draftVotes[cardIndex] = (room.draftVotes[cardIndex] || 0) + 1;

    // Broadcast updated vote counts to the room
    io.to(currentRoom).emit('draft-votes-updated', room.draftVotes);

    // Check for Majority
    const totalPlayers = room.players.length;
    const majorityNeeded = Math.floor(totalPlayers / 2) + 1;

    if (room.draftVotes[cardIndex] >= majorityNeeded) {
      const winningCard = room.currentDraft[cardIndex];
      room.shift++;

      io.to(currentRoom).emit('draft-resolved-start-shift', {
        winningCard,
        nextShift: room.shift
      });
    }
  });

  socket.on('cursor-move', (coords) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('remote-cursor-move', {
      id: socket.id,
      name: playerName,
      x: coords.x,
      y: coords.y
    });
  });

  socket.on('disconnect', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].players = rooms[currentRoom].players.filter(p => p.id !== socket.id);
      io.to(currentRoom).emit('update-lobby', { roomId: currentRoom, players: rooms[currentRoom].players });
      socket.to(currentRoom).emit('player-left', { id: socket.id });

      if (rooms[currentRoom].players.length === 0) {
        delete rooms[currentRoom];
      } else {
        checkShiftCompletion(currentRoom);
      }
      broadcastRoomList();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server online on port ${PORT}`));
