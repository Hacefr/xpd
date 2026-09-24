const socket = io();
window.isSoloMode = false;

// 1. START SOLO GAME
function startSoloGame() {
  window.isSoloMode = true;
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('desktop-icons').style.display = 'flex';
  document.getElementById('taskbar').style.display = 'flex';
  document.getElementById('agents-hud').style.display = 'flex';

  const soloId = "Solo_" + Math.floor(Math.random() * 10000);
  socket.emit('join-room', { roomId: soloId, name: "Solo_Agent" });
  socket.emit('trigger-start-shift');
}

// 2. ROOM BROWSER
function openRoomsLobby() {
  document.getElementById('main-menu').style.display = 'none';
  document.getElementById('rooms-modal').style.display = 'flex';
  socket.emit('request-rooms');
}

function closeRoomsLobby() {
  document.getElementById('rooms-modal').style.display = 'none';
  document.getElementById('main-menu').style.display = 'flex';
}

socket.on('room-list-update', (roomList) => {
  const container = document.getElementById('dynamic-room-list');
  if (!container) return;
  container.innerHTML = '';

  if (roomList.length === 0) {
    container.innerHTML = `<div style="padding:18px; text-align:center; color:#666; font-size:11px;">No active workstations found.<br>Host one below!</div>`;
    return;
  }

  roomList.forEach(room => {
    const row = document.createElement('div');
    row.className = 'room-row';
    row.innerHTML = `
      <div>
        <span>🖥️ <b>${room.name}</b></span>
        <span style="font-size:10px; color:${room.inShift ? '#b81414' : '#006600'};">(${room.inShift ? 'Shift Active' : 'In Lobby'})</span>
      </div>
      <div>
        <span style="margin-right:8px;">[${room.playerCount}/4 Agents]</span>
        <span style="color:#006600; font-weight:bold;">[JOIN]</span>
      </div>
    `;
    row.onclick = () => joinSpecificRoom(room.id);
    container.appendChild(row);
  });
});

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

// 3. LOBBY SYNC
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

function triggerStartShift() {
  socket.emit('trigger-start-shift');
}

// 4. SHIFT START SYNC
socket.on('shift-started', () => {
  document.getElementById('multiplayer-lobby').style.display = 'none';
  document.getElementById('desktop-icons').style.display = 'flex';
  document.getElementById('taskbar').style.display = 'flex';
  document.getElementById('agents-hud').style.display = 'flex';

  const safeOverlay = document.getElementById('spectator-overlay');
  if (safeOverlay) safeOverlay.remove();

  startShift();
});

// 5. LIVE AGENT HUD SYNC
socket.on('agent-status-update', (data) => {
  document.getElementById('hud-active-count').innerText = data.active;
  document.getElementById('hud-safe-count').innerText = data.safe;
  document.getElementById('hud-dead-count').innerText = data.dead;
});

// 6. SPECTATOR MODES
socket.on('enter-safe-spectator', () => {
  showSpectatorScreen("🛡️ CLOCKED OUT (SAFE)", "You secured the shift! Watching teammates greed in Overtime.", "#66ff66");
});

socket.on('enter-eliminated-spectator', (reason) => {
  showSpectatorScreen("💀 ELIMINATED", `Fatal mistake: ${reason}. Spectating remaining agents.`, "#ff4444");
});

function showSpectatorScreen(title, subtitle, color) {
  const prev = document.getElementById('spectator-overlay');
  if (prev) prev.remove();

  const el = document.createElement('div');
  el.id = 'spectator-overlay';
  el.className = 'menu-overlay';
  el.style.background = 'rgba(0, 0, 0, 0.65)';
  el.style.zIndex = '80000';
  el.innerHTML = `
    <h2 style="color:${color}; font-size:26px;">${title}</h2>
    <p style="color:white; margin-top:8px; font-size:12px;">${subtitle}</p>
  `;
  document.getElementById('desktop').appendChild(el);
}

// 7. INTERMISSION & VOTING SYNC
socket.on('shift-completed-intermission', (data) => {
  const safeOverlay = document.getElementById('spectator-overlay');
  if (safeOverlay) safeOverlay.remove();

  inShift = false;
  clearInterval(clockInterval);
  clearInterval(threatInterval);
  Threats.resetAll();

  showIntermissionUI(data.shift, data.bank, data.draftCards, data.saveNote);
});

socket.on('draft-votes-updated', (votes) => {
  updateVoteBadges(votes);
});

socket.on('draft-resolved-start-shift', (data) => {
  document.getElementById('intermission-modal').style.display = 'none';
  applyUpgradeEffect(data.winningCard);
  currentShift = data.nextShift;

  // Server automatically triggers start-shift next
  socket.emit('trigger-start-shift');
});

socket.on('team-bsod', (reason) => {
  triggerBSOD(reason);
});

// 8. CURSOR SYNC
window.addEventListener('mousemove', (e) => {
  if (!inShift) return;
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
    c.innerHTML = `<div class="cursor-arrow"></div><div class="cursor-tag">${data.name}</div>`;
    cursorContainer.appendChild(c);
  }
  c.style.transform = `translate(${data.x * window.innerWidth}px, ${data.y * window.innerHeight}px)`;
});

socket.on('player-left', (data) => {
  const c = document.getElementById('cursor-' + data.id);
  if (c) c.remove();
});
