// --- AUDIO SYNTHESIZER ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSynthBeep(freq, type = 'sine', duration = 0.1) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  g.gain.setValueAtTime(0.08, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
  osc.connect(g); g.connect(audioCtx.destination);
  osc.start(); osc.stop(audioCtx.currentTime + duration);
}

// --- GAME STATE ---
let currentShift = 1;
let currentHour = 7;
let isPM = true;
let isOvertime = false;
let overtimeHours = 0;
let teamBank = 0;
let cpuUsage = 15;
let isGameOver = false;
let inShift = false;

let hasWindowsDefender = false;
let currentShields = 0;
window.hasTrackerUpgrade = false;

let clockInterval = null;
let threatInterval = null;
let cpuInterval = null;

let activeCurses = {
  brokenScript: false,
  scramble: false,
  medium: false,
  voided: false
};

const clockDisplay = document.getElementById('clock');
const clockoutBtn = document.getElementById('clockout-btn');
const shiftStatus = document.getElementById('shift-status-text');
const cpuFill = document.getElementById('cpu-fill');
const cpuText = document.getElementById('cpu-text');
const teamBankElem = document.getElementById('team-bank');

// START SHIFT (Synchronized)
function startShift() {
  inShift = true;
  currentHour = 7;
  isPM = true;
  isOvertime = false;
  overtimeHours = 0;
  clockoutBtn.disabled = true;
  clockoutBtn.style.background = '#ece9d8';
  shiftStatus.innerText = `Shift ${currentShift} in progress (7 PM - 1 AM)`;
  clockDisplay.innerText = "7:00 PM";
  cpuUsage = 15;

  if (hasWindowsDefender) {
    currentShields = 1;
  }
  updateShieldUI();

  // Clock
  clearInterval(clockInterval);
  clockInterval = setInterval(() => {
    if (!inShift || isGameOver) return;
    currentHour++;
    if (currentHour === 12) isPM = false;
    if (currentHour > 12) currentHour = 1;

    if (currentHour === 1 && !isPM) {
      isOvertime = true;
      clockoutBtn.disabled = false;
      clockoutBtn.style.background = '#27d927';
      shiftStatus.innerText = `Shift ${currentShift} complete! OVERTIME (+$20/hr)!`;
    }

    if (isOvertime) {
      overtimeHours++;
      teamBank += 20;
      teamBankElem.innerText = teamBank;
    }

    clockDisplay.innerText = `${currentHour}:00 ${isPM ? 'PM' : 'AM'}`;
  }, 12000);

  // Threats Escalation
  clearInterval(threatInterval);

  if (currentShift >= 2) Threats.startLoserar(activeCurses.scramble);
  if (currentShift >= 3) Threats.startQuiet(activeCurses.medium);

  threatInterval = setInterval(() => {
    if (!inShift || isGameOver) return;

    if (currentShift >= 4 && Math.random() < 0.4) {
      Threats.triggerAllSeeingEye(activeCurses.voided);
    } else {
      Threats.spawnERR(activeCurses.brokenScript);
    }
  }, 11000);
}

// CPU TICK
clearInterval(cpuInterval);
cpuInterval = setInterval(() => {
  if (!inShift || isGameOver) return;
  cpuUsage = Math.min(100, cpuUsage + 0.15);
  cpuFill.style.width = cpuUsage + '%';
  cpuText.innerText = Math.floor(cpuUsage) + '%';

  if (cpuUsage >= 100) {
    // Notify server of hardware blowout
    socket.emit('hardware-failure', "CPU usage reached 100%. Hardware overheated.");
  }
}, 300);

// SHIELD & ELIMINATION
function updateShieldUI() {
  let badge = document.getElementById('shield-status-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.id = 'shield-status-badge';
    badge.style.fontSize = '11px';
    badge.style.fontWeight = 'bold';
    badge.style.color = '#66ff66';
    document.querySelector('.taskbar-tray').prepend(badge);
  }
  badge.innerText = currentShields > 0 ? "🛡️ SHIELD: READY" : (hasWindowsDefender ? "🛡️ SHIELD: BROKEN" : "");
}

function eliminatePlayer(reason) {
  if (currentShields > 0) {
    currentShields--;
    updateShieldUI();
    playSynthBeep(950, 'triangle', 0.4);

    const alertBox = document.createElement('div');
    alertBox.style.position = 'fixed';
    alertBox.style.top = '60px';
    alertBox.style.left = '50%';
    alertBox.style.transform = 'translateX(-50%)';
    alertBox.style.background = '#00aa00';
    alertBox.style.color = '#fff';
    alertBox.style.padding = '10px 20px';
    alertBox.style.border = '2px solid #fff';
    alertBox.style.fontWeight = 'bold';
    alertBox.style.zIndex = '999999';
    alertBox.innerText = `🛡️ THREAT BLOCKED BY WINDOWS DEFENDER! (${reason})`;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 3000);
    return;
  }

  // Tell server we were eliminated!
  socket.emit('player-eliminated', reason);
}

// CONTACTS
function openContactsApp() {
  const win = document.getElementById('contacts-window');
  win.style.display = 'block';
  makeWindowDraggable(win);
}
function closeContactsApp() {
  document.getElementById('contacts-window').style.display = 'none';
}

// CLOCK OUT -> Tell server to lock in safety and spectate!
function clockOutShift() {
  closeContactsApp();
  socket.emit('player-clock-out');
}

// INTERMISSION UI & MAJORITY VOTING
function showIntermissionUI(shift, bank, draftCards, saveNote) {
  document.getElementById('intermission-title').innerText = `SHIFT ${shift} CLEARED!`;
  document.getElementById('intermission-summary').innerHTML = `
    ${saveNote ? `<p style="color:#27d927; font-weight:bold; margin-bottom:6px;">${saveNote}</p>` : ''}
    Total Team Bank: $${bank}
  `;

  const container = document.getElementById('draft-container');
  container.innerHTML = '';

  draftCards.forEach((card, index) => {
    const el = document.createElement('div');
    el.className = `draft-card ${card.type === 'upgrade' ? 'card-upgrade' : 'card-curse'}`;
    el.id = 'draft-card-' + index;
    el.innerHTML = `
      <div>
        <span class="card-badge ${card.type === 'upgrade' ? 'badge-up' : 'badge-down'}">${card.type.toUpperCase()}</span>
        <h4>${card.title}</h4>
        <p>${card.desc}</p>
      </div>
      <div>
        <div id="vote-count-${index}" style="font-size:11px; font-weight:bold; color:#0055ea; margin-bottom:4px;">Votes: 0</div>
        <button class="xp-dialog-btn" style="width:100%; font-weight:bold;" onclick="voteForDraftCard(${index})">VOTE</button>
      </div>
    `;
    container.appendChild(el);
  });

  document.getElementById('intermission-modal').style.display = 'flex';
}

function voteForDraftCard(cardIndex) {
  playSynthBeep(500, 'sine', 0.1);
  socket.emit('cast-draft-vote', cardIndex);
}

function updateVoteBadges(votes) {
  for (let i = 0; i < 3; i++) {
    const elem = document.getElementById('vote-count-' + i);
    if (elem) elem.innerText = `Votes: ${votes[i] || 0}`;
  }
}

function applyUpgradeEffect(card) {
  if (card.id === 'defender') hasWindowsDefender = true;
  if (card.id === 'tracker') window.hasTrackerUpgrade = true;
  if (card.id === 'err_curse') activeCurses.brokenScript = true;
  if (card.id === 'loserar_curse') activeCurses.scramble = true;
  if (card.id === 'quiet_curse') activeCurses.medium = true;
}

// BSOD
function triggerBSOD(reason = "A fatal exception has occurred.") {
  isGameOver = true;
  inShift = false;
  clearInterval(clockInterval);
  clearInterval(threatInterval);
  Threats.resetAll();
  playSynthBeep(80, 'sawtooth', 0.8);
  document.getElementById('bsod-reason').innerText = reason;
  document.getElementById('bsod').style.display = 'block';
}

function toggleVolumeSlider() {
  const p = document.getElementById('volume-popup');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}
