const socket = io();
window.isSoloMode = false;

// 1. Start Solo Game (LOGiN clicked)
function startSoloGame() {
  window.isSoloMode = true; // Sets mode to solo -> deaths trigger BSOD immediately!
  document.getElementById('main-menu').style.display = 'none';
  const soloRoomId = "Solo_" + Math.floor(Math.random() * 10000);
  socket.emit('join-room', { roomId: soloRoomId, name: "Solo_Agent" });
}

// 2. Open / Close Rooms Lobby
function openRoomsLobby() {
  document.getElementById('rooms-modal').style.display = 'flex';
}

function closeRoomsLobby() {
  document.getElementById('rooms-modal').style.display = 'none';
}

function joinSpecificRoom(roomName) {
  window.isSoloMode = false;
  const playerName = document.getElementById('player-name-input').value.trim() || "Agent_XP";
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('rooms-modal').style.display = 'none';
  socket.emit('join-room', { roomId: roomName, name: playerName });
}

// Host a Custom Room using the in-game input (No prompt!)
function submitCustomRoom() {
  const customName = document.getElementById('custom-room-input').value.trim();
  if (customName) {
    joinSpecificRoom(customName);
  }
}

// Broadcast local cursor
window.addEventListener('mousemove', (e) => {
  const normX = e.clientX / window.innerWidth;
  const normY = e.clientY / window.innerHeight;
  socket.emit('cursor-move', { x: normX, y: normY });
});

// Render remote teammate cursors
const cursorContainer = document.getElementById('remote-cursors');
socket.on('remote-cursor-move', (data) => {
  let c = document.getElementById('cursor-' + data.id);
  if (!c) {
    c = document.createElement('div');
    c.id = 'cursor-' + data.id;
    c.className = 'remote-cursor';
    c.innerHTML = `
      <div class="cursor-arrow"></div>
      <div class="cursor-tag">${data.name}</div>
    `;
    cursorContainer.appendChild(c);
  }
  const posX = data.x * window.innerWidth;
  const posY = data.y * window.innerHeight;
  c.style.transform = `translate(${posX}px, ${posY}px)`;
});

socket.on('player-left', (data) => {
  const c = document.getElementById('cursor-' + data.id);
  if (c) c.remove();
});
