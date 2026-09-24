const socket = io();
window.isSoloMode = false;

// 1. START SOLO GAME (LOGiN)
function startSoloGame() {
  window.isSoloMode = true;
  document.getElementById('main-menu').style.display = 'none';
  
  // Show Desktop & Taskbar!
  document.getElementById('desktop-icons').style.display = 'flex';
  document.getElementById('taskbar').style.display = 'flex';

  // UNFREEZE: Start Shift 1 immediately!
  startShift();
}

// 2. OPEN / CLOSE ROOMS MODAL
function openRoomsLobby() {
  document.getElementById('rooms-modal').style.display = 'flex';
}
function closeRoomsLobby() {
  document.getElementById('rooms-modal').style.display = 'none';
}

// 3. JOIN MULTIPLAYER ROOM -> ENTERS MSN WAITING LOBBY!
function joinSpecificRoom(roomName) {
  window.isSoloMode = false;
  const playerName = document.getElementById('player-name-input').value.trim() || "Agent_XP";
  
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('rooms-modal').style.display = 'none';

  // Open the MSN Waiting Room!
  document.getElementById('multiplayer-lobby').style.display = 'flex';
  document.getElementById('lobby-titlebar').innerText = `💬 MSN Messenger - [${roomName}]`;

  socket.emit('join-room', { roomId: roomName, name: playerName });
}

function submitCustomRoom() {
  const customName = document.getElementById('custom-room-input').value.trim();
  if (customName) joinSpecificRoom(customName);
}

// 4. LOBBY SYNC & CHAT
socket.on('update-lobby', (data) => {
  const list = document.getElementById('lobby-player-list');
  list.innerHTML = '';
  data.players.forEach(p => {
    const row = document.createElement('div');
    row.innerText = `🟢 ${p.name}`;
    list.appendChild(row);
  });
});

function sendLobbyChat() {
  const input = document.getElementById('lobby-chat-input');
  const text = input.value.trim();
  if (text) {
    socket.emit('send-lobby-chat', text);
    input.value = '';
  }
}

socket.on('receive-lobby-chat', (data) => {
  const box = document.getElementById('lobby-chat-box');
  const msg = document.createElement('p');
  msg.innerHTML = `<b>${data.name}:</b> ${data.text}`;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
});

// 5. START SHIFT FOR MULTIPLAYER
function triggerStartShift() {
  socket.emit('trigger-start-shift');
}

socket.on('shift-started', () => {
  // Close lobby, show desktop, and start shift!
  document.getElementById('multiplayer-lobby').style.display = 'none';
  document.getElementById('desktop-icons').style.display = 'flex';
  document.getElementById('taskbar').style.display = 'flex';

  startShift();
});

// Cursor Sync
window.addEventListener('mousemove', (e) => {
  const normX = e.clientX / window.innerWidth;
  const normY = e.clientY / window.innerHeight;
  socket.emit('cursor-move', { x: normX, y: normY });
});

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
