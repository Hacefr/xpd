// --- XP DEFENDER THREATS & CURSES SYSTEM ---
const Threats = {
  loserarFiles: 0,
  loserarInterval: null,
  loserarTuneInterval: null,
  quietActive: false,

  // ==========================================
  // 1. ERR (Client-Sided QTE)
  // ==========================================
  spawnERR(curseBrokenScript = false) {
    if (document.getElementById('err-window')) return; // Only 1 ERR at a time

    const targetNumber = Math.floor(Math.random() * 5) + 3; // 3 to 7
    let currentCount = 0;
    
    const win = document.createElement('div');
    win.id = 'err-window';
    win.className = 'window';
    win.style.width = '240px';
    win.style.left = (window.innerWidth / 2 - 120) + 'px';
    win.style.top = (window.innerHeight / 2 - 100) + 'px';
    win.style.zIndex = 6000;
    win.innerHTML = `
      <div class="window-titlebar" style="background:#cc0000;">
        <span>⚠️ Critical Exception</span>
        <!-- No [X] close button! -->
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

    const interval = setInterval(() => {
      currentCount++;
      if (!curseBrokenScript) {
        const counterElem = document.getElementById('err-counter');
        if (counterElem) counterElem.innerText = currentCount;
      }
      playSynthBeep(350 + (currentCount * 60), 'sine', 0.08);

      // Missed it completely
      if (currentCount > targetNumber + 1) {
        clearInterval(interval);
        win.remove();
        eliminatePlayer("Missed ERR timing window!");
      }
    }, 1000);

    win.querySelector('#err-close-btn').onclick = () => {
      clearInterval(interval);
      win.remove();
      // Exact hit
      if (currentCount === targetNumber) {
        playSynthBeep(850, 'triangle', 0.2); // Success!
      } else {
        eliminatePlayer("Clicked ERR too early or too late!");
      }
    };
  },

  // ==========================================
  // 2. LOSERAR (Server-Sided Folder Files)
  // ==========================================
  startLoserar(scramble = false) {
    if (this.loserarInterval) return;
    this.loserarFiles = 0;

    // Generates a file every 7 seconds
    this.loserarInterval = setInterval(() => {
      if (!inShift || isGameOver) return;
      this.loserarFiles++;
      this.updateLoserarFolderView();

      // If 3 or more files accumulate -> PANIC TUNE PLAYS!
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

          // Failed to delete files in time -> WIPE!
          if (tuneNote >= 16) { // ~8 seconds of tune
            clearInterval(this.loserarTuneInterval);
            this.loserarTuneInterval = null;
            triggerBSOD("Loserar files corrupted System32. Files were not deleted!");
          }
        }, 500);
      }
    }, 7000);
  },

  stopLoserar() {
    clearInterval(this.loserarInterval);
    clearInterval(this.loserarTuneInterval);
    this.loserarInterval = null;
    this.loserarTuneInterval = null;
    this.loserarFiles = 0;
  },

  updateLoserarFolderView() {
    const list = document.getElementById('loserar-file-list');
    if (!list) return;
    list.innerHTML = '';
    for (let i = 0; i < this.loserarFiles; i++) {
      const file = document.createElement('div');
      file.className = 'rar-file';
      file.innerHTML = `📦 infected_archive_${i + 1}.rar <button class="xp-dialog-btn" style="padding:2px 6px; font-size:10px; margin-left:10px;" onclick="Threats.deleteFile(${i})">Delete</button>`;
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
  },

  // ==========================================
  // 3. QUIET! (Server-Sided Volume Creep)
  // ==========================================
  startQuiet(curseMedium = false) {
    if (this.quietActive) return;
    this.quietActive = true;

    const slider = document.getElementById('volume-slider');
    const interval = setInterval(() => {
      if (!inShift || isGameOver) {
        clearInterval(interval);
        this.quietActive = false;
        return;
      }

      // Automatically creeps volume upwards!
      let val = parseInt(slider.value) + 2;
      slider.value = Math.min(100, val);

      // Warning beep when volume is high
      if (val > 80) playSynthBeep(val * 10, 'sine', 0.05);

      // Hit 100%? Explodes PC!
      if (val >= 100) {
        clearInterval(interval);
        triggerBSOD("QUIET! blew out speakers at 100% volume. System bricked!");
      }

      // Curse: MEDIUM (Don't let it drop below 40% either!)
      if (curseMedium && val < 40) {
        clearInterval(interval);
        triggerBSOD("QUIET! Curse [MEDIUM] triggered: Volume dropped below 40%!");
      }
    }, 400);
  },

  // ==========================================
  // 4. ALLSEEINGEYE.EXE (Client-Sided Freeze)
  // ==========================================
  triggerAllSeeingEye(curseVoided = false) {
    if (document.getElementById('eye-warning-banner')) return;

    const desktop = document.getElementById('desktop');
    let armed = false;

    // Visual Banner Warning
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

    setTimeout(() => {
      armed = true;
      banner.style.background = '#ff0000';
      banner.style.color = '#fff';
      banner.innerText = '🔴 STOP MOVING YOUR CURSOR NOW!';
      desktop.style.filter = curseVoided ? 'invert(1)' : 'hue-rotate(140deg) saturate(5)';
      playSynthBeep(200, 'sawtooth', 0.6);

      // Check mouse movement
      const freezeChecker = () => {
        if (armed) {
          window.removeEventListener('mousemove', freezeChecker);
          desktop.style.filter = 'none';
          banner.remove();
          eliminatePlayer("Moved mouse during ALLSEEINGEYE!");
        }
      };
      window.addEventListener('mousemove', freezeChecker);

      // Safe stage after 2.5 seconds
      setTimeout(() => {
        armed = false;
        window.removeEventListener('mousemove', freezeChecker);
        desktop.style.filter = 'none';
        if (banner) banner.remove();
        playSynthBeep(700, 'triangle', 0.2); // Safe!
      }, 2500);

    }, 1500);
  }
};

// Open Loserar Folder UI
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
  }
  Threats.updateLoserarFolderView();
}
