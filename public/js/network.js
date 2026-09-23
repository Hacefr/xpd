const socket = io();

// Join default room on load
socket.on('connect', () => {
  const roomName = "Workstation_01";
  socket.emit('join-room', { roomId: roomName });
});

// Broadcast local cursor (0.0 to 1.0 percentages)
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
