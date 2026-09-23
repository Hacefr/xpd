const socket = io();

// 1. Start Solo Game (LOGiN button clicked)
function startSoloGame() {
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
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('rooms-modal').style.display = 'none';
  socket.emit('join-room', { roomId: roomName, name: "Agent_" + Math.floor(Math.random() * 99) });
}

function createCustomRoom() {
  const name = prompt("Enter Custom Workstation Room Name:", "My_Shift");
  if (name) {
    joinSpecificRoom(name);
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
