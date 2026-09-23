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

const clockDisplay = document.getElementById('clock');
const clockoutBtn = document.getElementById('clockout-btn');
const shiftStatus = document.getElementById('shift-status-text');

// 1 Hour in-game = ~20 seconds real time
setInterval(() => {
  currentHour++;
  if (currentHour === 12) isPM = false; // Midnight
  if (currentHour > 12) currentHour = 1;

  // Reached 1:00 AM? Unlock Overtime & Clock-Out!
  if (currentHour === 1 && !isPM) {
    isOvertime = true;
    clockoutBtn.disabled = false;
    clockoutBtn.style.background = '#27d927';
    shiftStatus.innerText = "Shift complete! You are in OVERTIME ($20/hr)!";
  }

  if (isOvertime) {
    teamBank += 20; // +$20 Overtime Pay
    document.getElementById('team-bank').innerText = teamBank;
  }

  clockDisplay.innerText = `${currentHour}:00 ${isPM ? 'PM' : 'AM'}`;
}, 18000);

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

// Eliminate Player (Client-side fail)
function eliminatePlayer(reason) {
  playSynthBeep(120, 'sawtooth', 0.5);
  alert(`ELIMINATED: ${reason} - You are now spectating.`);
}

// Speaker Tray Toggle
function toggleVolumeSlider() {
  const p = document.getElementById('volume-popup');
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

// Auto-test: Trigger ERR after 5 seconds to test
setTimeout(() => {
  Threats.spawnERR();
}, 5000);
