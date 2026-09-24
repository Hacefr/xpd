const socket = io();
window.isSoloMode = false;

// 1. START SOLO GAME (LOGiN)
function startSoloGame() {
  window.isSoloMode = true;
  document.getElementById('main-menu').style.display = 'none';
  
  // Show Desktop & Taskbar
  document.getElementById('desktop-icons').style.display = 'flex';
  document.getElementById('taskbar').style.display = 'flex';

  // Start Shift 1 immediately
  startShift();
}

// 2. OPEN / CLOSE ROOMS MODAL (Asks server for live room list!)
function openRoomsLobby() {
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('rooms-modal').style.display = 'flex';

  // Request fresh live room list from server
  socket.emit('request-rooms');
}

function closeRoomsLobby() {
  document.getElementById('rooms-modal').style.display = 'none';
  document.getElementById('main-menu').style.display = 'flex';
}

// 3. REAL-TIME DYNAMIC ROOM LIST RENDERER
socket.on('room-list-update', (roomList) => {
  const container = document.getElementById('dynamic-room-list');
  if (!container) return;

  container.innerHTML = '';

  if (roomList.length === 0) {
    container.innerHTML = `
      <div style="padding: 18px; text-align: center; color: #666; font-size: 11px;">
        No active workstations found.<br>Type a name below to host the first room!
      </div>
    `;
    return;
  }

  roomList.forEach(room => {
    const row = document.createElement('div');
    row.className = 'room-row';
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span>🖥️ <b>${room.name}</b></span>
        <span style="font-size: 10px; color: ${room.inShift ? '#b81414' : '#006600'};">
          (${room.inShift ? 'Shift in Progress' : 'In Lobby'})
        </span>
      </div>
      <div>
        <span style="color: #333; margin-right: 8px;">[${room.playerCount}/4 Agents]</span>
        <span style="color: #006600; font-weight: bold;">[JOIN]</span>
      </div>
    `;
    row.onclick = () => joinSpecificRoom(room.id);
    container.appendChild(row);
  });
});

// 4. JOIN SPECIFIC ROOM -> ENTERS MSN WAITING LOBBY
function joinSpecificRoom(roomName) {
  window.isSoloMode = false;
  const playerName = document.getElementById('player-name-input').value.trim() || "Agent_XP";
  
  document.getElementById('rooms-modal').style.display = 'none';
  document.getElementById('multiplayer-lobby').style.display = 'flex';
  document.getElementById('lobby-titlebar').innerText = `💬 MSN Messenger - [${roomName}]`;

  socket.emit('join-room', { roomId: roomName, name: playerName });
}

function submitCustomRoom() {
  const customName = document.getElementById('custom-room-input').value.trim();
  if (customName) {
    joinSpecificRoom(customName);
    document.getElementById('custom-room-input').value = '';
  }
}

// 5. LOBBY SYNC & CHAT
socket.on('update-lobby', (data) => {
  const list = document.getElementById('lobby-player-list');
  if (!list) return;
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
  if (!box) return;
  const msg = document.createElement('p');
  msg.innerHTML = `<b>${data.name}:</b> ${data.text}`;
  box.appendChild(msg);
  box.scrollTop = box.scrollHeight;
});

// 6. START SHIFT FOR MULTIPLAYER
function triggerStartShift() {
  socket.emit('trigger-start-shift');
}

socket.on('shift-started', () => {
  document.getElementById('multiplayer-lobby').style.display = 'none';
  document.getElementById('desktop-icons').style.display = 'flex';
  document.getElementById('taskbar').style.display = 'flex';

  startShift();
});

// 7. CURSOR SYNC
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
