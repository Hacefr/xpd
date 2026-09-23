// --- XP DEFENDER THREATS & CURSES SYSTEM ---
const Threats = {
  // 1. ERR (Client-Sided QTE)
  spawnERR(curseBrokenScript = false) {
    const targetNumber = Math.floor(Math.random() * 6) + 3; // Number between 3 and 8
    let currentCount = 0;
    
    const win = document.createElement('div');
    win.className = 'window';
    win.style.width = '240px';
    win.style.left = '40vw';
    win.style.top = '30vh';
    win.style.zIndex = 6000;
    win.innerHTML = `
      <div class="window-titlebar" style="background:#cc0000;">
        <span>⚠️ Critical Exception</span>
        <!-- No [X] close button! -->
      </div>
      <div style="padding:15px; text-align:center; background:#fff;">
        <p style="font-size:12px; margin-bottom:8px;">Target: <b>[ ${targetNumber} ]</b></p>
        <div id="err-counter" style="font-size:24px; font-weight:bold; margin-bottom:12px;">
          ${curseBrokenScript ? '???' : '0'}
        </div>
        <button id="err-close-btn" class="xp-btn" style="padding:6px 14px;">Close</button>
      </div>
    `;

    document.getElementById('windows-container').appendChild(win);

    const interval = setInterval(() => {
      currentCount++;
      if (!curseBrokenScript) {
        document.getElementById('err-counter').innerText = currentCount;
      }
      playSynthBeep(400 + (currentCount * 50), 'sine', 0.08);

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
      // Hit on exact count (with 1 i-frame buffer)
      if (Math.abs(currentCount - targetNumber) <= 0) {
        playSynthBeep(800, 'triangle', 0.2); // Success!
      } else {
        eliminatePlayer("Clicked ERR too early or too late!");
      }
    };
  },

  // 2. ALLSEEINGEYE.EXE (Client-Sided Freeze)
  triggerAllSeeingEye(curseVoided = false) {
    const desktop = document.getElementById('desktop');
    let armed = false;

    // Warning stage (Yellow or Purple)
    desktop.style.filter = curseVoided ? 'hue-rotate(270deg)' : 'sepia(1) saturate(3)';
    playSynthBeep(300, 'sawtooth', 0.3);

    setTimeout(() => {
      // Danger stage (Red or White flash)
      armed = true;
      desktop.style.filter = curseVoided ? 'invert(1)' : 'hue-rotate(140deg) saturate(5)';
      playSynthBeep(200, 'sawtooth', 0.6);

      // Check mouse movement
      const freezeChecker = () => {
        if (armed) {
          window.removeEventListener('mousemove', freezeChecker);
          desktop.style.filter = 'none';
          eliminatePlayer("Moved mouse during ALLSEEINGEYE!");
        }
      };
      window.addEventListener('mousemove', freezeChecker);

      // Safe stage after 2.5 seconds
      setTimeout(() => {
        armed = false;
        window.removeEventListener('mousemove', freezeChecker);
        desktop.style.filter = 'none';
      }, 2500);

    }, 1500);
  }
};
