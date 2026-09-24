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
let inShift = false; // Strictly controls whether game is live!

let hasWindowsDefender = false;
let currentShields = 0;

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

// START SHIFT
function startShift() {
  inShift = true; // Game officially live!
  currentHour = 7;
  isPM = true;
  isOvertime = false;
  overtimeHours = 0;
  clockoutBtn.disabled = true;
  clockoutBtn.style.background = '#ece9d8';
  shiftStatus.innerText = `Shift ${currentShift} in progress (7 PM - 1 AM)`;
  clockDisplay.innerText = "7:00 PM";

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
      shiftStatus.innerText = `Shift ${currentShift} complete! OVERTIME ACTIVE (+$20/hr)!`;
    }

    if (isOvertime) {
      overtimeHours++;
      teamBank += 20;
      teamBankElem.innerText = teamBank;
    }

    clockDisplay.innerText = `${currentHour}:00 ${isPM ? 'PM' : 'AM'}`;
  }, 12000);

  // THREATS ESCALATION
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

// CPU TICK (Only ticks when in active shift!)
clearInterval(cpuInterval);
cpuInterval = setInterval(() => {
  if (!inShift || isGameOver) return;
  cpuUsage = Math.min(100, cpuUsage + 0.15);
  cpuFill.style.width = cpuUsage + '%';
  cpuText.innerText = Math.floor(cpuUsage) + '%';

  if (cpuUsage >= 100) {
    triggerBSOD("CPU usage reached 100%. Hardware overheated.");
  }
}, 300);

// SHIELD LOGIC
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

  if (window.isSoloMode) {
    triggerBSOD(reason);
  } else {
    playSynthBeep(120, 'sawtooth', 0.5);
    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.style.background = 'rgba(0,0,0,0.7)';
    overlay.innerHTML = `<h2 style="color:red;">ELIMINATED: ${reason}</h2><p style="color:white; margin-top:8px;">You are spectating your team.</p>`;
    document.getElementById('desktop').appendChild(overlay);
  }
}

// CONTACTS
function openContactsApp() { document.getElementById('contacts-window').style.display = 'block'; }
function closeContactsApp() { document.getElementById('contacts-window').style.display = 'none'; }

// CLOCK OUT -> COMPLETE SHUTDOWN OF THREATS FOR INTERMISSION
function clockOutShift() {
  inShift = false; // Strictly sets shift to OFF
  clearInterval(clockInterval);
  clearInterval(threatInterval);
  Threats.resetAll(); // Instantly freezes & purges every threat, sound, and popup!

  closeContactsApp();

  const basePay = 100;
  const otPay = overtimeHours * 20;
  teamBank += basePay;
  teamBankElem.innerText = teamBank;

  showIntermission(basePay, otPay);
}

// INTERMISSION DRAFT
const DRAFT_POOL = [
  { type: 'upgrade', title: '🛡️ Windows Defender', desc: 'Permanent safety shield against 1 fatal mistake every shift!', effect: () => { hasWindowsDefender = true; } },
  { type: 'upgrade', title: '💾 +512MB RAM', desc: 'Increases CPU headroom. CPU fills 20% slower.', effect: () => { cpuUsage = Math.max(5, cpuUsage - 20); } },
  { type: 'curse', title: '💀 ERR: Broken Script', desc: 'Numbers are invisible! Rely on audio clicks (+ $150 Cash).', effect: () => { activeCurses.brokenScript = true; teamBank += 150; } },
  { type: 'curse', title: '💀 Loserar: Scramble', desc: 'Files spread across folders & desktop (+ $120 Cash).', effect: () => { activeCurses.scramble = true; teamBank += 120; } },
  { type: 'curse', title: '💀 QUIET!: MEDIUM', desc: 'Volume cannot drop below 40% or reach 100% (+ $140 Cash).', effect: () => { activeCurses.medium = true; teamBank += 140; } }
];

function showIntermission(basePay, otPay) {
  document.getElementById('intermission-title').innerText = `SHIFT ${currentShift} CLEARED!`;
  document.getElementById('intermission-summary').innerText = `Base Pay: $${basePay} | Overtime: $${otPay} | Total Team Bank: $${teamBank}`;

  const shuffled = [...DRAFT_POOL].sort(() => 0.5 - Math.random());
  const choices = shuffled.slice(0, 3);

  const container = document.getElementById('draft-container');
  container.innerHTML = '';

  choices.forEach(card => {
    const el = document.createElement('div');
    el.className = `draft-card ${card.type === 'upgrade' ? 'card-upgrade' : 'card-curse'}`;
    el.innerHTML = `
      <div>
        <span class="card-badge ${card.type === 'upgrade' ? 'badge-up' : 'badge-down'}">${card.type.toUpperCase()}</span>
        <h4>${card.title}</h4>
        <p>${card.desc}</p>
      </div>
      <button class="xp-dialog-btn" style="width:100%; font-weight:bold;">SELECT</button>
    `;
    el.onclick = () => selectDraftCard(card);
    container.appendChild(el);
  });

  document.getElementById('intermission-modal').style.display = 'flex';
}

function selectDraftCard(card) {
  card.effect();
  teamBankElem.innerText = teamBank;
  document.getElementById('intermission-modal').style.display = 'none';

  currentShift++;
  cpuUsage = 15;
  startShift(); // Clean start for next shift
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
