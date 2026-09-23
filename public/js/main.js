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

// --- SHIFT CLOCK & OVERTIME SYSTEM ---
let currentHour = 7; // 7 PM
let isPM = true;
let isOvertime = false;
let teamBank = 0;
let cpuUsage = 15;
let isGameOver = false;

const clockDisplay = document.getElementById('clock');
const clockoutBtn = document.getElementById('clockout-btn');
const shiftStatus = document.getElementById('shift-status-text');
const cpuFill = document.getElementById('cpu-fill');
const cpuText = document.getElementById('cpu-text');

// 1 Hour in-game = ~20 seconds real time
setInterval(() => {
  if (isGameOver) return;
  currentHour++;
  if (currentHour === 12) isPM = false; // Midnight
  if (currentHour > 12) currentHour = 1;

  if (currentHour === 1 && !isPM) {
    isOvertime = true;
    clockoutBtn.disabled = false;
    clockoutBtn.style.background = '#27d927';
    shiftStatus.innerText = "Shift complete! You are in OVERTIME ($20/hr)!";
  }

  if (isOvertime) {
    teamBank += 20;
    document.getElementById('team-bank').innerText = teamBank;
  }

  clockDisplay.innerText = `${currentHour}:00 ${isPM ? 'PM' : 'AM'}`;
}, 18000);

// Passive CPU Tick & BSOD check
setInterval(() => {
  if (isGameOver) return;
  cpuUsage = Math.min(100, cpuUsage + 0.15);
  cpuFill.style.width = cpuUsage + '%';
  cpuText.innerText = Math.floor(cpuUsage) + '%';

  if (cpuUsage >= 100) {
    triggerBSOD("CPU usage exceeded 100%. Hardware overheated.");
  }
}, 300);

// Contacts App Logic
function openContactsApp() {
  document.getElementById('contacts-window').style.display = 'block';
}
function closeContactsApp() {
  document.getElementById('contacts-window').style.display = 'none';
}
function clockOutShift() {
  alert(`Shift ended! Cash banked: $${teamBank}. Loading intermission draft...`);
  location.reload();
}

// TRIGGER AUTHENTIC BSOD
function triggerBSOD(reason = "A fatal exception has occurred.") {
  isGameOver = true;
  playSynthBeep(80, 'sawtooth', 0.8);
  document.getElementById('bsod-reason').innerText = reason;
  document.getElementById('bsod').style.display = 'block';
}

// Eliminate Player logic (Solo vs Multiplayer)
function eliminatePlayer(reason) {
  // If Solo: Instant Game Over & BSOD!
  if (window.isSoloMode) {
    triggerBSOD(reason);
  } else {
    // If Multiplayer: Enter spectator
    playSynthBeep(120, 'sawtooth', 0.5);
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.innerHTML = `<h2 style="color:red;">ELIMINATED: ${reason}</h2><p style="color:white; margin-top:8px;">You are now spectating your team.</p>`;
    document.getElementById('desktop').appendChild(overlay);
  }
}

// Speaker Tray Toggle
function toggleVolumeSlider() {
  const p = document.getElementById('volume-popup');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

// Auto-test: Spawn ERR after 6 seconds
setTimeout(() => {
  if (!isGameOver) Threats.spawnERR();
}, 6000);
