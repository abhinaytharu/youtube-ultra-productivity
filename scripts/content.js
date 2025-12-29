/**
 * YouTube Ultra Productivity - Content Script
 * Version 3.1.0 - Defensive UI Architecture
 */

(function () {
  /**
   * ABSOLUTE KEYBOARD RULE: 
   * Global interception in the capture phase to neutralize ALL YouTube shortcuts.
   * Runs immediately at document_start.
   */
  const keyboardInterceptor = (e) => {
    const isTextInput = (el) => {
      if (!el) return false;
      return (
        ['INPUT', 'TEXTAREA'].includes(el.tagName) ||
        el.isContentEditable ||
        el.getAttribute('role') === 'textbox' ||
        el.closest('[contenteditable="true"]') ||
        (el.shadowRoot && el.shadowRoot.activeElement && isTextInput(el.shadowRoot.activeElement))
      );
    };

    const target = document.activeElement;
    const isTyping = isTextInput(target);

    // 1. Always allow modifier keys themselves
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    // 2. Always allow essential system/browser shortcuts (Ctrl+C, V, X, A, R, T, W, etc.)
    const isCmdOrCtrl = e.metaKey || e.ctrlKey;
    if (isCmdOrCtrl) return;

    // 3. Typing Context
    if (isTyping) {
      const allowedInTyping = [
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
        'Home', 'End', 'PageUp', 'PageDown',
        'Backspace', 'Delete', 'Enter', 'Tab', 'Escape'
      ];

      // Allow character input and navigation keys
      if (e.key.length === 1 || allowedInTyping.includes(e.key)) {
        // CRITICAL: Stop propagation to prevent 'i', 'f', etc. from triggering YT shortcuts
        // even when typing. But do NOT preventDefault so the text actually appears.
        e.stopImmediatePropagation();
        return;
      }
    }

    // 4. BLOCK EVERYTHING ELSE (YouTube shortcuts: i, f, k, j, l, space, numbers, etc.)
    e.preventDefault();
    e.stopImmediatePropagation();
  };

  window.addEventListener('keydown', keyboardInterceptor, true);
  window.addEventListener('keyup', keyboardInterceptor, true);
  window.addEventListener('keypress', keyboardInterceptor, true);

  const STORAGE_KEYS = {
    SETTINGS: 'ultra_settings'
  };


  class UltraProductivity {
    constructor() {
      this.isEnabled = true;
      this.currentMode = 'monk';
      this.activeVideoId = null;
      this.sidePanelOpen = false;
      this.activeTab = 'notes';
      this.db = window.UltraStorage;

      // UI References (inside Shadow DOM)
      this.shadowHost = null;
      this.shadowRoot = null;

      this.init();
    }

    async init() {
      await this.loadSettings();
      this.setupShadowDOM();
      this.setupObservers();
      this.handleNavigation();
      this.setupNavigationGuard();

      console.log("Ultra Productivity 3.2: Intent Engine Active");
    }


    setupNavigationGuard() {
      // In Monk Mode, we prevent clicking any "distraction" links
      document.addEventListener('click', (e) => {
        if (this.currentMode === 'monk' && this.isEnabled) {
          const anchor = e.target.closest('a');
          if (anchor) {
            const url = new URL(anchor.href, window.location.origin);
            const isWatch = url.pathname === '/watch';
            const isSearch = url.pathname === '/results';
            const isHome = url.pathname === '/' || url.pathname === '/feed/';

            // Only allow watch, search, or home (to see queue)
            if (!isWatch && !isSearch && !isHome) {
              e.preventDefault();
              console.log("Ultra Monk: Blocked distraction link.");
            }
          }
        }
      }, true);
    }


    async loadSettings() {
      const data = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS]);
      const settings = data[STORAGE_KEYS.SETTINGS] || { mode: 'monk', enabled: true };
      this.currentMode = settings.mode;
      this.isEnabled = settings.enabled;
      this.applyGlobalState();
    }

    applyGlobalState() {
      document.documentElement.setAttribute('data-ultra-mode', this.currentMode);
      document.documentElement.setAttribute('data-ultra-lock', (this.isEnabled && this.currentMode !== 'casual') ? 'on' : 'off');
    }

    setupShadowDOM() {
      if (document.getElementById('ultra-shadow-host')) return;
      this.shadowHost = document.createElement('div');
      this.shadowHost.id = 'ultra-shadow-host';
      this.shadowHost.style.cssText = 'position:static;z-index:2147483647;';
      this.shadowRoot = this.shadowHost.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = this.getShadowStyles();
      this.shadowRoot.appendChild(style);
      document.body.appendChild(this.shadowHost);
      this.injectUI();
    }

    setupObservers() {
      let lastUrl = location.href;
      const observer = new MutationObserver(() => {
        if (location.href !== lastUrl) {
          const oldUrl = lastUrl;
          lastUrl = location.href;
          this.onUrlChange(oldUrl, lastUrl);
        }
        this.ensureLayout();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    ensureLayout() {
      if (!this.shadowRoot.getElementById('ultra-side-panel')) this.injectUI();
      this.syncLayout();
      this.injectNavbarButtons();
      if (this.activeVideoId && !document.getElementById('ultra-open-panel-btn')) {
        this.injectWatchPageTools();
      }
    }

    injectNavbarButtons() {
      const mastheadEnd = document.querySelector('ytd-masthead #end #buttons');
      if (!mastheadEnd || document.getElementById('ultra-navbar-controls')) return;

      const controls = document.createElement('div');
      controls.id = 'ultra-navbar-controls';

      const btnQueue = document.createElement('button');
      btnQueue.className = 'ultra-nav-btn';
      btnQueue.textContent = 'Intent Queue';
      btnQueue.onclick = () => {
        chrome.runtime.sendMessage({ action: 'openAnalytics' });
      };

      const btnMode = document.createElement('button');
      btnMode.id = 'ultra-nav-mode-btn';
      btnMode.className = `ultra-nav-btn mode-${this.currentMode}`;
      btnMode.textContent = `Mode: ${this.currentMode.toUpperCase()}`;
      btnMode.onclick = () => this.cycleMode();

      const btnToggle = document.createElement('button');
      btnToggle.className = 'ultra-nav-btn';
      btnToggle.textContent = 'Learning Panel';
      btnToggle.onclick = () => this.togglePanel();

      controls.appendChild(btnQueue);
      controls.appendChild(btnMode);
      controls.appendChild(btnToggle);

      mastheadEnd.parentNode.insertBefore(controls, mastheadEnd);
    }

    async cycleMode() {
      const modes = ['casual', 'study', 'monk'];
      let idx = modes.indexOf(this.currentMode);
      this.currentMode = modes[(idx + 1) % modes.length];

      await chrome.storage.local.set({
        ultra_settings: { mode: this.currentMode, enabled: true }
      });

      this.applyGlobalState();
      const btn = document.getElementById('ultra-nav-mode-btn');
      if (btn) {
        btn.textContent = `Mode: ${this.currentMode.toUpperCase()}`;
        btn.className = `ultra-nav-btn mode-${this.currentMode}`;
      }

      const pill = this.shadowRoot.getElementById('ultra-status-pill');
      if (pill) pill.innerHTML = `<span class="status-dot"></span> Ultra: ${this.currentMode.toUpperCase()}`;
    }

    syncLayout() {
      const masthead = document.querySelector('ytd-masthead');
      const sidePanel = this.shadowRoot.getElementById('ultra-side-panel');
      if (sidePanel) {
        const mh = masthead ? masthead.offsetHeight : 56;
        sidePanel.style.top = `${mh}px`;
        sidePanel.style.height = `calc(100vh - ${mh}px)`;
      }
    }

    async onUrlChange(oldUrl, newUrl) {
      const oldVideoId = new URLSearchParams(new URL(oldUrl).search).get('v');
      const newVideoId = new URLSearchParams(new URL(newUrl).search).get('v');
      if (oldVideoId && oldVideoId !== newVideoId) {
        await this.checkExitReflection(oldVideoId);
      }
      this.activeVideoId = newVideoId;
      this.handleNavigation();
    }

    handleNavigation() {
      const videoId = new URLSearchParams(window.location.search).get('v');
      this.activeVideoId = videoId;
      if (videoId) {
        this.initLearningSuite();
      } else if (window.location.pathname === '/' || window.location.pathname === '/feed/') {
        this.initDashboard();
      }
    }

    injectUI() {
      this.shadowRoot.innerHTML = `
        <style>${this.getShadowStyles()}</style>
        <div id="ultra-status-pill"><span class="status-dot"></span> Ultra: ${this.currentMode.toUpperCase()}</div>
        <div id="ultra-side-panel">
            <div class="ultra-tabs">
                <div class="ultra-tab active" data-tab="notes">Notes</div>
                <div class="ultra-tab" data-tab="sketch">Sketch</div>
                <div class="ultra-tab" data-tab="session">Session</div>
            </div>
            <div class="ultra-content">
                <div class="ultra-panel-section active" id="ultra-section-notes">
                    <textarea id="ultra-notes-editor" placeholder="Deep notes..."></textarea>
                    <div class="btn-group">
                        <button class="ultra-btn-outline" id="ultra-capture-ts">Timestamp</button>
                        <button class="ultra-btn" id="ultra-save-note">Save</button>
                    </div>
                </div>
                <div class="ultra-panel-section" id="ultra-section-sketch">
                    <div id="ultra-sketchpad-container"><canvas id="ultra-canvas"></canvas></div>
                    <div class="btn-group">
                        <button class="ultra-btn-outline" id="ultra-clear-canvas">Clear</button>
                        <button class="ultra-btn" id="ultra-save-sketch">Save</button>
                    </div>
                </div>
                <div class="ultra-panel-section" id="ultra-section-session">
                    <div id="ultra-session-info">
                        <h3>Watch Progress</h3>
                        <div class="progress-bar-outer"><div id="ultra-prog-inner"></div></div>
                        <p id="ultra-prog-text">0%</p>
                        <button class="ultra-btn full" id="ultra-mark-complete">Mark as Mastered</button>
                    </div>
                </div>
            </div>
        </div>
        <div id="ultra-exit-modal">
            <div class="ultra-modal-box">
                <h3>Reflect & Commit</h3>
                <textarea id="ultra-exit-reason" placeholder="Why are you pausing this session?"></textarea>
                <button class="ultra-btn full" id="ultra-confirm-exit">Save Intention</button>
            </div>
        </div>
      `;
      this.setupUIEvents();
    }

    setupUIEvents() {
      this.shadowRoot.getElementById('ultra-status-pill').onclick = () => this.togglePanel();
      const tabs = this.shadowRoot.querySelectorAll('.ultra-tab');
      tabs.forEach(tab => tab.onclick = () => this.switchTab(tab.getAttribute('data-tab')));

      this.shadowRoot.getElementById('ultra-save-note').onclick = async () => {
        const text = this.shadowRoot.getElementById('ultra-notes-editor').value;
        await this.db.setVideoData(this.activeVideoId, { notes: text });
        const btn = this.shadowRoot.getElementById('ultra-save-note');
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = 'Save', 2000);
      };

      this.shadowRoot.getElementById('ultra-mark-complete').onclick = async () => {
        await this.db.setVideoData(this.activeVideoId, { status: 'completed', progress: 100 });
        alert("Session Mastered! Archive updated.");
        location.href = '/';
      };

      const canvas = this.shadowRoot.getElementById('ultra-canvas');
      if (canvas) this.initCanvas(canvas);
      this.shadowRoot.getElementById('ultra-clear-canvas').onclick = () => this.ctx.clearRect(0, 0, canvas.width, canvas.height);
      this.shadowRoot.getElementById('ultra-save-sketch').onclick = async () => {
        await this.db.setVideoData(this.activeVideoId, { sketch: canvas.toDataURL() });
        const btn = this.shadowRoot.getElementById('ultra-save-sketch');
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = 'Save', 2000);
      };

      this.shadowRoot.getElementById('ultra-capture-ts').onclick = () => this.captureTimestamp();
    }

    switchTab(tabId) {
      this.shadowRoot.querySelectorAll('.ultra-tab').forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tabId));
      this.shadowRoot.querySelectorAll('.ultra-panel-section').forEach(s => s.classList.toggle('active', s.id === `ultra-section-${tabId}`));
      if (tabId === 'sketch') this.resizeCanvas();
    }

    togglePanel() {
      this.sidePanelOpen = !this.sidePanelOpen;
      this.shadowRoot.getElementById('ultra-side-panel').classList.toggle('open', this.sidePanelOpen);
      document.body.classList.toggle('ultra-panel-open', this.sidePanelOpen);
    }

    captureTimestamp() {
      const video = document.querySelector('video');
      if (!video) return;
      const timeStr = this.formatTime(Math.floor(video.currentTime));
      const editor = this.shadowRoot.getElementById('ultra-notes-editor');
      if (!editor) return;
      const pos = editor.selectionStart;
      const text = editor.value;
      editor.value = text.slice(0, pos) + `[${timeStr}] ` + text.slice(pos);
      editor.focus();
      editor.setSelectionRange(pos + timeStr.length + 3, pos + timeStr.length + 3);
    }

    formatTime(sec) {
      const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
      return [h, m, s].map(v => v < 10 ? "0" + v : v).filter((v, i) => v !== "00" || i > 0).join(":");
    }

    async checkExitReflection(videoId) {
      if (this.currentMode === 'monk' || this.currentMode === 'study') {
        const data = await this.db.getVideoProgress(videoId);
        if (data.status !== 'completed' && (data.progress || 0) < 90) {
          this.showExitModal(videoId);
        }
      }
    }

    showExitModal(videoId) {
      const modal = this.shadowRoot.getElementById('ultra-exit-modal');
      modal.style.display = 'flex';
      this.shadowRoot.getElementById('ultra-confirm-exit').onclick = async () => {
        const reason = this.shadowRoot.getElementById('ultra-exit-reason').value;
        if (!reason.trim()) return alert("Intention required.");
        await this.db.setVideoData(videoId, { exitReason: reason });
        modal.style.display = 'none';
      };
    }

    async initCanvas(canvas) {
      this.ctx = canvas.getContext('2d');
      this.isDrawing = false;
      this.lastSketchData = null; // Cache last saved sketch to prevent clearing on resize if not needed

      canvas.onmousedown = (e) => {
        this.isDrawing = true;
        this.ctx.beginPath();
        this.ctx.moveTo(e.offsetX, e.offsetY);
      };
      canvas.onmousemove = (e) => {
        if (!this.isDrawing) return;
        this.ctx.lineTo(e.offsetX, e.offsetY);
        this.ctx.stroke();
      };
      canvas.onmouseup = () => {
        this.isDrawing = false;
        this.autoSaveSketch();
      };
      await this.resizeCanvas();
    }

    async autoSaveSketch() {
      const canvas = this.shadowRoot.getElementById('ultra-canvas');
      if (canvas) {
        const dataUrl = canvas.toDataURL();
        this.lastSketchData = dataUrl;
        await this.db.setVideoData(this.activeVideoId, { sketch: dataUrl });
      }
    }

    async resizeCanvas() {
      const container = this.shadowRoot.getElementById('ultra-sketchpad-container');
      const canvas = this.shadowRoot.getElementById('ultra-canvas');
      if (!container || !canvas || !this.ctx) return;

      // Before resizing (which clears canvas), save current data if drawing
      const currentData = canvas.toDataURL();

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      this.ctx.strokeStyle = '#000';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';

      // Restore data if it existed
      if (currentData && currentData !== 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR42mMAAQAABQABognBWAAAAABJRU5ErkJggg==') {
        const img = new Image();
        img.onload = () => this.ctx.drawImage(img, 0, 0);
        img.src = currentData;
      } else if (this.lastSketchData) {
        const img = new Image();
        img.onload = () => this.ctx.drawImage(img, 0, 0);
        img.src = this.lastSketchData;
      }
    }

    async initDashboard() {
      let dash = document.getElementById('ultra-monk-dashboard');
      if (!dash) {
        dash = document.createElement('div');
        dash.id = 'ultra-monk-dashboard';
        const host = document.querySelector('ytd-browse[page-subtype="home"]');
        if (host) host.prepend(dash);
      }
      const allVideos = await this.db.getAllVideos();
      const unfinished = allVideos.filter(v => v.status !== 'completed' && (v.progress || 0) > 0);
      dash.innerHTML = `
        <div class="dash-container">
            <h1>Intent Queue</h1>
            <p style="color:#aaa;margin-bottom:30px;">Finish what you started.</p>
            <div class="dash-grid">
                ${unfinished.map(v => `
                    <div class="dash-card" onclick="location.href='/watch?v=${v.videoId}'">
                        <span class="id">${v.channel || 'Video'}</span>
                        <div class="title-stub">${v.title || 'Incomplete Session'}</div>
                        <span class="prog">${v.progress}%</span>
                        <p>Intention: ${v.exitReason || 'Resuming...'}</p>
                    </div>
                `).join('')}
                ${unfinished.length === 0 ? '<p>Queue is clear. Find a new subject to master.</p>' : ''}
            </div>
        </div>
      `;
    }

    injectWatchPageTools() {
      const host = document.querySelector('#title h1') || document.querySelector('ytd-watch-metadata #title');
      if (!host || document.getElementById('ultra-open-panel-btn')) return;
      const btn = document.createElement('button');
      btn.id = 'ultra-open-panel-btn'; btn.textContent = 'Learn Panel';
      btn.onclick = () => this.togglePanel();
      host.parentElement.appendChild(btn);
    }

    async initLearningSuite() {
      const data = await this.db.getVideoProgress(this.activeVideoId);
      const editor = this.shadowRoot.getElementById('ultra-notes-editor');
      if (editor) editor.value = data.notes || '';

      // Attempt to capture video title/channel for the DB
      setTimeout(() => {
        const title = document.querySelector('h1.ytd-watch-metadata')?.innerText;
        const channel = document.querySelector('ytd-channel-name #text')?.innerText;
        if (title || channel) this.db.setVideoData(this.activeVideoId, { title, channel });
      }, 2000);

      if (data.sketch) {
        this.lastSketchData = data.sketch;
        const img = new Image();
        img.onload = () => {
          // Only draw if we haven't already drawn (e.g. from resize)
          this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
          this.ctx.drawImage(img, 0, 0);
        };
        img.src = data.sketch;
      } else {
        this.lastSketchData = null;
        if (this.ctx) this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      }

      if (this.progInt) clearInterval(this.progInt);
      this.progInt = setInterval(() => {
        const v = document.querySelector('video');
        if (v) {
          this.updateFocusIndicator(); // Update indicator on every tick if playing
          if (!v.paused) {
            const p = Math.floor((v.currentTime / v.duration) * 100);

            // Increment time spent (approx 2s per interval)
            this.db.getVideoProgress(this.activeVideoId).then(data => {
              const timeSpent = (data.timeSpent || 0) + 2;
              this.db.setVideoData(this.activeVideoId, {
                progress: p,
                timeSpent,
                lastTime: Math.floor(v.currentTime)
              });
            });

            this.shadowRoot.getElementById('ultra-prog-inner').style.width = p + '%';
            this.shadowRoot.getElementById('ultra-prog-text').textContent = p + '%';
          }
        }
      }, 2000);
    }

    getShadowStyles() {
      return `
        :host { --ultra-bg: #0f0f0f; --ultra-surface: #1e1e1e; --ultra-accent: #ffffff; --ultra-border: #333; --ultra-text: #fff; --ultra-panel-width: 420px; }
        #ultra-status-pill { position: fixed; bottom: 24px; left: 24px; background: var(--ultra-surface); border: 1px solid var(--ultra-border); padding: 8px 16px; border-radius: 99px; color: var(--ultra-text); font-size: 13px; font-weight: 600; cursor: pointer; z-index: 2147483647; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); }
        .status-dot { width: 8px; height: 8px; background: #00ff00; border-radius: 50%; box-shadow: 0 0 10px #00ff00; }
        #ultra-side-panel { position: fixed; right: calc(-1 * var(--ultra-panel-width)); top: 56px; width: var(--ultra-panel-width); height: calc(100vh - 56px); background: var(--ultra-surface); border-left: 1px solid var(--ultra-border); z-index: 2147483646; transition: right 0.3s ease; display: flex; flex-direction: column; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
        #ultra-side-panel.open { right: 0; }
        .ultra-tabs { display: flex; background: #000; border-bottom: 1px solid var(--ultra-border); }
        .ultra-tab { padding: 12px 20px; color: #777; cursor: pointer; font-size: 14px; flex: 1; text-align: center; }
        .ultra-tab.active { color: #fff; font-weight: bold; border-bottom: 2px solid #fff; }
        .ultra-content { flex: 1; overflow-y: auto; padding: 20px; color: #fff; }
        .ultra-panel-section { display: none; }
        .ultra-panel-section.active { display: block; }
        #ultra-notes-editor { width: 100%; height: 250px; background: #000; border: 1px solid var(--ultra-border); border-radius: 6px; color: #fff; padding: 12px; font-family: monospace; resize: none; margin-bottom: 15px; }
        .btn-group { display: flex; justify-content: space-between; align-items: center; }
        .hint { font-size: 11px; color: #555; }
        .ultra-btn { background: #fff; color: #000; border: none; padding: 8px 16px; border-radius: 4px; font-weight: 600; cursor: pointer; }
        .ultra-btn.full { width: 100%; margin-top: 15px; }
        .ultra-btn-outline { background: transparent; color: #fff; border: 1px solid var(--ultra-border); padding: 7px 15px; border-radius: 4px; cursor: pointer; }
        #ultra-sketchpad-container { width: 100%; height: 350px; background: #fff; border-radius: 6px; margin-bottom: 15px; }
        #ultra-exit-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.9); z-index: 2147483647; display: none; justify-content: center; align-items: center; }
        .ultra-modal-box { background: var(--ultra-surface); padding: 30px; border-radius: 12px; width: 380px; border: 1px solid var(--ultra-border); text-align: center; color: #fff; }
        #ultra-exit-reason { width: 100%; height: 100px; background: #000; border: 1px solid var(--ultra-border); color: #fff; padding: 12px; border-radius: 6px; margin-top: 20px; }
        .progress-bar-outer { width: 100%; height: 8px; background: #333; border-radius: 4px; overflow: hidden; margin: 15px 0 5px; }
        #ultra-prog-inner { height: 100%; background: #3ea6ff; width: 0%; transition: width 0.3s; }
        #ultra-prog-text { font-size: 11px; color: #aaa; text-align: right; }
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window._ultra = new UltraProductivity());
  } else {
    window._ultra = new UltraProductivity();
  }
})();
