// --- XP DEFENDER THREATS & CURSES SYSTEM ---

// Universal Window Dragging Utility
function makeWindowDraggable(win) {
  const titlebar = win.querySelector('.window-titlebar');
  if (!titlebar) return;

  titlebar.style.cursor = 'move';
  let isDragging = false;
  let startX = 0, startY = 0;

  titlebar.onmousedown = (e) => {
    isDragging = true;
    startX = e.clientX - win.offsetLeft;
    startY = e.clientY - win.offsetTop;
    win.style.zIndex = ++window.highestZIndex;
  };

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const maxX = window.innerWidth - win.offsetWidth;
    const maxY = window.innerHeight - win.offsetHeight - 40; // Avoid taskbar
    win.style.left = Math.max(0, Math.min(maxX, e.clientX - startX)) + 'px';
    win.style.top = Math.max(0, Math.min(maxY, e.clientY - startY)) + 'px';
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });
}

window.highestZIndex = 5000;

const Threats = {
  loserarFiles: 0,
  loserarInterval: null,
  loserarTuneInterval: null,
  quietInterval: null,
  quietActive: false,
  errInterval: null,
  eyeTimeout1: null,
  eyeTimeout2: null,
  eyeFreezeChecker: null,

  // MASTER RESET
  resetAll() {
    clearInterval(this.errInterval);
    const errWin = document.getElementById('err-window');
    if (errWin) errWin.remove();

    clearInterval(this.loserarInterval);
    clearInterval(this.loserarTuneInterval);
    this.loserarInterval = null;
    this.loserarTuneInterval = null;
    this.loserarFiles = 0;
    this.updateLoserarFolderView();
    this.removeScrambleFiles();

    clearInterval(this.quietInterval);
    this.quietActive = false;
    const slider = document.getElementById('volume-slider');
    if (slider) slider.value = 20;

    clearTimeout(this.eyeTimeout1);
    clearTimeout(this.eyeTimeout2);
    if (this.eyeFreezeChecker) {
      window.removeEventListener('mousemove', this.eyeFreezeChecker);
      this.eyeFreezeChecker = null;
    }
    const banner = document.getElementById('eye-warning-banner');
    if (banner) banner.remove();
    const desktop = document.getElementById('desktop');
    if (desktop) desktop.style.filter = 'none';

    const container = document.getElementById('windows-container');
    if (container) container.innerHTML = '';
  },

  // ==========================================
  // 1. ERR (Client-Sided QTE - Draggable!)
  // ==========================================
  spawnERR(curseBrokenScript = false) {
    if (!inShift || isGameOver || document.getElementById('err-window')) return;

    const targetNumber = Math.floor(Math.random() * 5) + 3;
    let currentCount = 0;
    
    const win = document.createElement('div');
    win.id = 'err-window';
    win.className = 'window';
    win.style.width = '240px';
    win.style.left = (window.innerWidth / 2 - 120) + 'px';
    win.style.top = (window.innerHeight / 2 - 100) + 'px';
    win.style.zIndex = ++window.highestZIndex;
    win.innerHTML = `
      <div class="window-titlebar" style="background:#cc0000;">
        <span>⚠️ Critical Exception</span>
      </div>
      <div style="padding:15px; text-align:center; background:#fff;">
        <p style="font-size:12px; margin-bottom:8px;">Target: <b>[ ${targetNumber} ]</b></p>
        <div id="err-counter" style="font-size:26px; font-weight:bold; margin-bottom:12px; color:#d00;">
          ${curseBrokenScript ? '???' : '0'}
        </div>
        <button id="err-close-btn" class="xp-dialog-btn" style="padding:6px 20px; font-weight:bold;">Close</button>
      </div>
    `;

    document.getElementById('windows-container').appendChild(win);
    makeWindowDraggable(win); // DRAGGABLE!

    clearInterval(this.errInterval);
    this.errInterval = setInterval(() => {
      if (!inShift || isGameOver) {
        clearInterval(this.errInterval);
        win.remove();
        return;
      }

      currentCount++;
      if (!curseBrokenScript) {
        const counterElem = document.getElementById('err-counter');
        if (counterElem) counterElem.innerText = currentCount;
      }
      playSynthBeep(350 + (currentCount * 60), 'sine', 0.08);

      if (currentCount > targetNumber + 1) {
        clearInterval(this.errInterval);
        win.remove();
        eliminatePlayer("Missed ERR timing window!");
      }
    }, 1000);

    win.querySelector('#err-close-btn').onclick = () => {
      clearInterval(this.errInterval);
      win.remove();
      if (currentCount === targetNumber) {
        playSynthBeep(850, 'triangle', 0.2);
      } else {
        eliminatePlayer("Clicked ERR too early or too late!");
      }
    };
  },

  // ==========================================
  // 2. LOSERAR (Folder Files + 40+ Scramble Curse!)
  // ==========================================
  startLoserar(scramble = false) {
    if (!inShift || isGameOver || this.loserarInterval) return;
    this.loserarFiles = 0;

    // SCRAMBLE CURSE: Floods 45+ decoy files across the entire desktop!
    if (scramble) {
      this.spawnScrambleFiles();
    }

    this.loserarInterval = setInterval(() => {
      if (!inShift || isGameOver) {
        this.stopLoserar();
        return;
      }

      this.loserarFiles++;
      this.updateLoserarFolderView();

      // If scramble is on, drop infected files on the desktop too!
      if (scramble) {
        this.dropScrambleRealFile(this.loserarFiles);
      }

      if (this.loserarFiles >= 3 && !this.loserarTuneInterval) {
        let tuneNote = 0;
        const notes = [440, 554, 659, 880];
        this.loserarTuneInterval = setInterval(() => {
          if (!inShift || isGameOver || this.loserarFiles < 3) {
            clearInterval(this.loserarTuneInterval);
            this.loserarTuneInterval = null;
            return;
          }
          playSynthBeep(notes[tuneNote % notes.length], 'square', 0.15);
          tuneNote++;

          if (tuneNote >= 16) {
            clearInterval(this.loserarTuneInterval);
            this.loserarTuneInterval = null;
            triggerBSOD("Loserar files corrupted System32. Files were not deleted!");
          }
        }, 500);
      }
    }, 7000);
  },

  // 40+ Decoy Files Spawner
  spawnScrambleFiles() {
    this.removeScrambleFiles();
    const decoys = ['my_song.mp3', 'taxes_2004.doc', 'family_photo.bmp', 'passwords.txt', 'notes.ini', 'receipt.pdf', 'setup.exe', 'cookie.tmp'];
    
    for (let i = 0; i < 45; i++) {
      const file = document.createElement('div');
      file.className = 'scramble-file decoy-file';
      file.style.left = (Math.random() * (window.innerWidth - 120) + 20) + 'px';
      file.style.top = (Math.random() * (window.innerHeight - 140) + 20) + 'px';
      file.innerHTML = `📄 <span style="font-size:10px; color:white; text-shadow:1px 1px 2px #000;">${decoys[Math.floor(Math.random() * decoys.length)]}</span>`;
      
      // Decoys can be clicked to clear
      file.onclick = () => file.remove();
      document.getElementById('desktop').appendChild(file);
    }
  },

  dropScrambleRealFile(id) {
    const file = document.createElement('div');
    file.className = 'scramble-file real-rar-file';
    file.id = 'scramble-real-' + id;
    file.style.left = (Math.random() * (window.innerWidth - 120) + 20) + 'px';
    file.style.top = (Math.random() * (window.innerHeight - 140) + 20) + 'px';
    file.style.zIndex = 40;
    
    // Tracker Upgrade Synergy: highlights the real files!
    const isTracked = window.hasTrackerUpgrade;
    file.innerHTML = `
      <div style="font-size:26px; ${isTracked ? 'filter: drop-shadow(0 0 8px red);' : ''}">📦</div>
      <span style="font-size:10px; font-weight:bold; color:#ffdd44; text-shadow:1px 1px 2px #000;">infected_${id}.rar</span>
    `;

    file.onclick = () => {
      file.remove();
      this.deleteFile(0);
    };

    document.getElementById('desktop').appendChild(file);
  },

  removeScrambleFiles() {
    document.querySelectorAll('.scramble-file').forEach(el => el.remove());
  },

  stopLoserar() {
    clearInterval(this.loserarInterval);
    clearInterval(this.loserarTuneInterval);
    this.loserarInterval = null;
    this.loserarTuneInterval = null;
    this.loserarFiles = 0;
    this.removeScrambleFiles();
  },

  updateLoserarFolderView() {
    const list = document.getElementById('loserar-file-list');
    if (!list) return;
    list.innerHTML = '';
    for (let i = 0; i < this.loserarFiles; i++) {
      const file = document.createElement('div');
      file.className = 'rar-file';
      file.style.padding = '4px';
      file.innerHTML = `📦 infected_archive_${i + 1}.rar <button class="xp-dialog-btn" style="padding:2px 6px; font-size:10px; margin-left:8px;" onclick="Threats.deleteFile(${i})">Delete</button>`;
      list.appendChild(file);
    }
  },

  deleteFile(index) {
    this.loserarFiles = Math.max(0, this.loserarFiles - 1);
    playSynthBeep(250, 'triangle', 0.08);
    this.updateLoserarFolderView();
  },

  deleteAllFiles() {
    this.loserarFiles = 0;
    playSynthBeep(200, 'sawtooth', 0.2);
    this.updateLoserarFolderView();
    this.removeScrambleFiles();
  },

  // ==========================================
  // 3. QUIET! (Server-Sided Volume Creep)
  // ==========================================
  startQuiet(curseMedium = false) {
    if (!inShift || isGameOver || this.quietActive) return;
    this.quietActive = true;

    const slider = document.getElementById('volume-slider');
    clearInterval(this.quietInterval);

    this.quietInterval = setInterval(() => {
      if (!inShift || isGameOver) {
        clearInterval(this.quietInterval);
        this.quietActive = false;
        return;
      }

      let val = parseInt(slider.value) + 2;
      slider.value = Math.min(100, val);

      if (val > 80) playSynthBeep(val * 10, 'sine', 0.05);

      if (val >= 100) {
        clearInterval(this.quietInterval);
        triggerBSOD("QUIET! blew out speakers at 100% volume. System bricked!");
      }

      if (curseMedium && val < 40) {
        clearInterval(this.quietInterval);
        triggerBSOD("QUIET! Curse [MEDIUM] triggered: Volume dropped below 40%!");
      }
    }, 400);
  },

  // ==========================================
  // 4. ALLSEEINGEYE.EXE (Client-Sided Freeze)
  // ==========================================
  triggerAllSeeingEye(curseVoided = false) {
    if (!inShift || isGameOver || document.getElementById('eye-warning-banner')) return;

    const desktop = document.getElementById('desktop');
    let armed = false;

    const banner = document.createElement('div');
    banner.id = 'eye-warning-banner';
    banner.style.position = 'fixed';
    banner.style.top = '10px';
    banner.style.left = '50%';
    banner.style.transform = 'translateX(-50%)';
    banner.style.padding = '8px 24px';
    banner.style.background = curseVoided ? '#8b008b' : '#ffcc00';
    banner.style.color = '#000';
    banner.style.fontWeight = 'bold';
    banner.style.border = '2px solid #000';
    banner.style.zIndex = '99999';
    banner.innerText = curseVoided ? '👁️ VOIDED: STOP WHEN FLASHES WHITE!' : '👁️ ALLSEEINGEYE: PREPARE TO FREEZE!';
    document.body.appendChild(banner);

    desktop.style.filter = curseVoided ? 'hue-rotate(270deg)' : 'sepia(1) saturate(3)';
    playSynthBeep(300, 'sawtooth', 0.3);

    this.eyeTimeout1 = setTimeout(() => {
      if (!inShift || isGameOver) {
        if (banner) banner.remove();
        desktop.style.filter = 'none';
        return;
      }

      armed = true;
      banner.style.background = '#ff0000';
      banner.style.color = '#fff';
      banner.innerText = '🔴 STOP MOVING YOUR CURSOR NOW!';
      desktop.style.filter = curseVoided ? 'invert(1)' : 'hue-rotate(140deg) saturate(5)';
      playSynthBeep(200, 'sawtooth', 0.6);

      this.eyeFreezeChecker = () => {
        if (armed && inShift && !isGameOver) {
          window.removeEventListener('mousemove', this.eyeFreezeChecker);
          desktop.style.filter = 'none';
          banner.remove();
          eliminatePlayer("Moved mouse during ALLSEEINGEYE!");
        }
      };
      window.addEventListener('mousemove', this.eyeFreezeChecker);

      this.eyeTimeout2 = setTimeout(() => {
        armed = false;
        if (this.eyeFreezeChecker) {
          window.removeEventListener('mousemove', this.eyeFreezeChecker);
          this.eyeFreezeChecker = null;
        }
        desktop.style.filter = 'none';
        if (banner) banner.remove();
        playSynthBeep(700, 'triangle', 0.2);
      }, 2500);

    }, 1500);
  }
};

// Open Loserar Folder UI (Draggable!)
function openLoserarFolder() {
  let win = document.getElementById('loserar-window');
  if (!win) {
    win = document.createElement('div');
    win.id = 'loserar-window';
    win.className = 'window';
    win.style.width = '340px';
    win.style.left = '100px';
    win.style.top = '80px';
    win.innerHTML = `
      <div class="window-titlebar">
        <span>📁 Loserar_Temp - File Explorer</span>
        <div class="close-x" onclick="document.getElementById('loserar-window').remove()">✕</div>
      </div>
      <div class="window-body" style="padding: 12px; background: #fff;">
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <span style="font-size:11px; font-weight:bold;">Active Files:</span>
          <button class="xp-dialog-btn" onclick="Threats.deleteAllFiles()">Delete All</button>
        </div>
        <div id="loserar-file-list" style="height:120px; overflow-y:auto; border:1px solid #7f9db9; padding:6px; font-size:11px;"></div>
      </div>
    `;
    document.getElementById('windows-container').appendChild(win);
    makeWindowDraggable(win); // DRAGGABLE!
  }
  Threats.updateLoserarFolderView();
}
