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

    // CRITICAL: Respect master enable/disable toggle
    if (window._ultra && !window._ultra.isEnabled) return;

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
      this.setupActivityTracker();
      this.setupFullscreenListener();

      console.log("Ultra Productivity 3.2: Intent Engine Active");

      // Listen for settings changes from popup
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.ultra_settings) {
          const settings = changes.ultra_settings.newValue;
          if (settings) {
            this.currentMode = settings.mode;
            this.isEnabled = settings.enabled;
            this.applyGlobalState();
            this.handleNavigation(); // Refresh view
          }
        }
      });
    }


    setupFullscreenListener() {
      const handleFullscreen = () => {
        const isFullscreen = !!document.fullscreenElement;
        const pill = this.shadowRoot?.getElementById('ultra-status-pill');
        if (pill) {
          pill.setAttribute('data-fullscreen', isFullscreen);
        }
      };
      document.addEventListener('fullscreenchange', handleFullscreen);
      handleFullscreen();
    }

    setupActivityTracker() {
      let timeout;
      const resetTimer = () => {
        const pill = this.shadowRoot?.getElementById('ultra-status-pill');
        if (pill) {
          pill.classList.remove('idle');
          clearTimeout(timeout);
          // Only auto-hide if in a mode where focus is critical (Monk/Study)
          timeout = setTimeout(() => {
            pill.classList.add('idle');
          }, 3000);
        }
      };

      window.addEventListener('mousemove', resetTimer);
      window.addEventListener('keydown', resetTimer);
      window.addEventListener('mousedown', resetTimer);
      resetTimer(); // Init
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
      document.documentElement.setAttribute('data-ultra-mode', this.isEnabled ? this.currentMode : 'casual');
      document.documentElement.setAttribute('data-ultra-lock', (this.isEnabled && this.currentMode !== 'casual') ? 'on' : 'off');

      // Hide/Show Status Pill
      const pill = this.shadowRoot?.getElementById('ultra-status-pill');
      if (pill) {
        pill.style.display = this.isEnabled ? 'flex' : 'none';
      }

      // Hide/Show Dashboard (if exists)
      const dash = document.getElementById('ultra-monk-dashboard');
      if (dash) {
        if (this.isEnabled && this.currentMode !== 'casual') {
          dash.style.display = 'block';
        } else {
          dash.style.display = 'none';
        }
      }

      // Navbar Controls
      const controls = document.getElementById('ultra-navbar-controls');
      if (controls) {
        controls.style.display = this.isEnabled ? 'flex' : 'none';
      }

      // Watch Page Learn Panel Button
      const learnBtn = document.getElementById('ultra-open-panel-btn');
      if (learnBtn) {
        learnBtn.style.display = this.isEnabled ? 'inline-block' : 'none';
      }
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
      if (!this.isEnabled) return;
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
        window.location.href = '/';
      };

      const btnAnalytics = document.createElement('button');
      btnAnalytics.className = 'ultra-nav-btn';
      btnAnalytics.textContent = 'Analytics';
      btnAnalytics.onclick = () => {
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
      controls.appendChild(btnAnalytics);
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
      this.handleNavigation();
    }

    syncLayout() {
      const masthead = document.querySelector('ytd-masthead');
      const sidePanel = this.shadowRoot.getElementById('ultra-side-panel');
      const dash = document.getElementById('ultra-monk-dashboard');
      const mh = masthead ? masthead.offsetHeight : 56;

      if (sidePanel) {
        sidePanel.style.top = `${mh}px`;
        sidePanel.style.height = `calc(100vh - ${mh}px)`;
      }
      if (dash) {
        dash.style.top = `${mh}px`;
        dash.style.height = `calc(100vh - ${mh}px)`;
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
      if (!this.isEnabled) return;

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
        <div id="ultra-status-pill"><span class="status-dot"></span>${this.currentMode.toUpperCase()}</div>
        <div id="ultra-side-panel">
            <div class="ultra-tabs">
                <div class="ultra-tab active" data-tab="notes">Notes</div>
                <div class="ultra-tab" data-tab="sketch">Sketch</div>
                <div class="ultra-tab" data-tab="resources">Resources</div>
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
                <div class="ultra-panel-section" id="ultra-section-resources">
                    <div id="ultra-pdf-viewer">
                        <div id="ultra-pdf-empty" style="text-align:center; padding:40px 20px; color:#666;">
                            <p>No PDF linked to this session.</p>
                            <button class="ultra-btn-outline" id="ultra-go-analytics" style="margin-top:15px; font-size:12px;">Link PDF in Analytics</button>
                        </div>
                        <div id="ultra-pdf-active" style="display:none;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                                <span style="font-size:13px; font-weight:600;">Linked Resource</span>
                                <button class="ultra-btn-outline" id="ultra-pdf-popout" style="padding:4px 8px; font-size:11px;">Popout</button>
                            </div>
                            <iframe id="ultra-pdf-frame" style="width:100%; height:550px; border:1px solid #333; border-radius:8px; background:#fff;"></iframe>
                        </div>
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

      this.shadowRoot.getElementById('ultra-go-analytics').onclick = () => {
        chrome.runtime.sendMessage({ action: 'openAnalytics' });
      };

      this.shadowRoot.getElementById('ultra-pdf-popout').onclick = async () => {
        const data = await this.db.getPDF(this.activeVideoId);
        if (data) {
          const win = window.open();
          win.document.write(`<iframe src="${data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        }
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

    formatSeconds(sec) {
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}h ${m}m ${s}s`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
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
      if (this.currentMode === 'casual') {
        const dash = document.getElementById('ultra-monk-dashboard');
        if (dash) dash.remove();
        return;
      }
      let dash = document.getElementById('ultra-monk-dashboard');
      if (!dash) {
        dash = document.createElement('div');
        dash.id = 'ultra-monk-dashboard';
        // Try multiple potential hosts for SPA reliability
        const host = document.querySelector('ytd-browse[page-subtype="home"]') ||
          document.querySelector('ytd-browse') ||
          document.querySelector('#primary');
        if (host) host.prepend(dash);
      }
      window.scrollTo(0, 0);
      const allVideos = await this.db.getAllVideos();
      const unfinished = allVideos.filter(v => v.status !== 'completed' && (v.progress || 0) > 0);
      const mastered = allVideos.filter(v => v.status === 'completed').length;
      dash.innerHTML = `
        <div class="dash-container" style="max-width: 1200px; margin: 0 auto; padding: 40px 20px;">
            <header style="margin-bottom: 60px; animation: fadeIn 0.8s ease-out; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 40px;">
                <h1 style="background: var(--accent-gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 48px; font-weight: 800; letter-spacing: -2px; margin-bottom: 15px;">Intent Queue</h1>
                <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin-bottom: 25px;">Focus on mastery. One session at a time.</p>
                <div style="display: flex; gap: 16px;">
                    <div class="stat-pill" style="padding: 10px 20px; background: rgba(0, 242, 254, 0.05); border-color: rgba(0, 242, 254, 0.15);"><span class="dot dot-green"></span> <span style="font-weight: 700; color: #fff; margin-right: 4px;">${mastered}</span> Mastered</div>
                    <div class="stat-pill" style="padding: 10px 20px; background: rgba(247, 92, 126, 0.05); border-color: rgba(247, 92, 126, 0.15);"><span class="dot dot-red"></span> <span style="font-weight: 700; color: #fff; margin-right: 4px;">${unfinished.length}</span> Remaining</div>
                </div>
            </header>

            <div class="dash-grid">
                ${unfinished.map(v => v.videoId ? `
                    <div class="dash-card" onclick="location.href='/watch?v=${v.videoId}'">
                        <span class="id" style="font-size: 10px; opacity: 0.6; letter-spacing: 1px;">${v.channel || 'EDUCATIONAL'}</span>
                        <div class="title-stub" style="font-size: 20px; margin: 12px 0 20px; line-height: 1.4; height: 56px; overflow: hidden;">${v.title || 'In-Progress Learning'}</div>
                        
                        <div style="margin-top:auto;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px;">
                                <span style="color: var(--accent-color); font-weight: 600;">${v.progress || 0}% Complete</span>
                                <span style="color: rgba(255,255,255,0.4);">${this.formatSeconds(v.timeSpent || 0)} spent</span>
                            </div>
                            <div class="progress-bar-outer" style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${v.progress || 0}%; background: var(--accent-gradient); height: 100%; box-shadow: 0 0 10px rgba(0, 242, 254, 0.3);"></div>
                            </div>
                            ${v.exitReason ? `<p style="margin-top: 15px; font-size: 11px; color: rgba(255,255,255,0.4); font-style: italic; border-top: 1px solid rgba(255,255,255,0.03); padding-top: 10px;">Intention: ${v.exitReason}</p>` : ''}
                        </div>
                    </div>
                ` : '').join('')}
                ${unfinished.length === 0 ? `
                    <div style="grid-column: 1/-1; padding: 100px 40px; text-align: center; background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.05); border-radius: 20px;">
                        <h2 style="font-size: 24px; color: #fff; margin-bottom: 10px;">The Queue is Empty</h2>
                        <p style="color: #666; font-size: 14px;">Mastery is a slow process. Find a high-value subject and start your next session.</p>
                    </div>
                ` : ''}
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
      if (!this.activeVideoId) return;

      const data = await this.db.getVideoProgress(this.activeVideoId);
      const editor = this.shadowRoot.getElementById('ultra-notes-editor');
      if (editor) editor.value = data.notes || '';

      // Clear existing interval
      if (this.progInt) clearInterval(this.progInt);

      // Track time locally to reduce DB race conditions
      let localTimeSpent = data.timeSpent || 0;

      this.progInt = setInterval(async () => {
        const v = document.querySelector('video');
        if (v && v.duration && !v.paused && this.activeVideoId) {
          const p = Math.floor((v.currentTime / v.duration) * 100);
          localTimeSpent += 2;

          // Attempt to capture metadata if missing
          const title = document.querySelector('h1.ytd-watch-metadata')?.innerText;
          const channel = document.querySelector('ytd-channel-name #text')?.innerText;

          await this.db.setVideoData(this.activeVideoId, {
            progress: p,
            timeSpent: localTimeSpent,
            lastTime: Math.floor(v.currentTime),
            title: title || data.title,
            channel: channel || data.channel
          });

          const progInner = this.shadowRoot.getElementById('ultra-prog-inner');
          const progText = this.shadowRoot.getElementById('ultra-prog-text');
          if (progInner) progInner.style.width = p + '%';
          if (progText) progText.textContent = p + '%';
        }
      }, 2000);

      if (data.sketch) {
        this.lastSketchData = data.sketch;
        const img = new Image();
        img.onload = () => {
          this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
          this.ctx.drawImage(img, 0, 0);
        };
        img.src = data.sketch;
      } else {
        this.lastSketchData = null;
        if (this.ctx) this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
      }

      // Initialize PDF Resource
      this.db.getPDF(this.activeVideoId).then(pdfData => {
        const empty = this.shadowRoot.getElementById('ultra-pdf-empty');
        const active = this.shadowRoot.getElementById('ultra-pdf-active');
        const frame = this.shadowRoot.getElementById('ultra-pdf-frame');

        if (pdfData && active && frame) {
          if (empty) empty.style.display = 'none';
          active.style.display = 'block';
          frame.src = pdfData;
        } else if (empty && active) {
          empty.style.display = 'block';
          active.style.display = 'none';
        }
      });
    }

    getShadowStyles() {
      return `
        :host { 
          --ultra-bg: #050505; 
          --ultra-surface: rgba(15, 15, 20, 0.95); 
          --ultra-accent: #00f2fe; 
          --ultra-border: rgba(255, 255, 255, 0.08); 
          --ultra-text: #fff; 
          --ultra-panel-width: 440px; 
          --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        #ultra-status-pill { 
          position: fixed;
          right: clamp(125px, 12.81vw, 210px);
          bottom: clamp(4px, 0.78vh, 12px);
          background: rgba(15, 15, 20, 0.8); 
          border: 1px solid var(--ultra-border); 
          padding: 10px 20px; 
          border-radius: 30px; 
          color: var(--ultra-text); 
          font-size: 13px; 
          font-weight: 700; 
          cursor: pointer; 
          z-index: 2147483647; 
          display: none; /* HIDDEN IN STANDARD MODE */
          align-items: center; 
          gap: 10px; 
          backdrop-filter: blur(12px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 1;
          visibility: visible;
        }
        
        #ultra-status-pill[data-fullscreen="true"] {
          display: flex; /* ONLY VISIBLE IN FULLSCREEN */
        }

        #ultra-status-pill.idle { 
          opacity: 0; 
          visibility: hidden; 
          transform: translateY(10px) scale(0.95);
        }
        #ultra-status-pill:hover { transform: scale(1.05); border-color: rgba(255,255,255,0.2); opacity: 1 !important; visibility: visible !important; }

        .status-dot { 
          width: 10px; height: 10px; background: #00f2fe; border-radius: 50%; 
          box-shadow: 0 0 15px #00f2fe; 
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 8px rgba(0, 242, 254, 0.6); }
          50% { box-shadow: 0 0 20px rgba(0, 242, 254, 1); }
          100% { box-shadow: 0 0 8px rgba(0, 242, 254, 0.6); }
        }

        #ultra-side-panel { 
          position: fixed; right: calc(-1 * var(--ultra-panel-width) - 20px); top: 10px; 
          width: var(--ultra-panel-width); 
          height: calc(100vh - 40px); 
          background: var(--ultra-surface); 
          border: 1px solid var(--ultra-border); 
          border-radius: 24px;
          margin-right: 10px;
          z-index: 2147483646; 
          transition: right 0.5s cubic-bezier(0.4, 0, 0.2, 1); 
          display: flex; 
          flex-direction: column; 
          backdrop-filter: blur(20px);
          box-shadow: -20px 0 60px rgba(0,0,0,0.8); 
          overflow: hidden;
        }
        #ultra-side-panel.open { right: 0; }

        .ultra-tabs { 
          display: flex; 
          background: rgba(0,0,0,0.2); 
          padding: 8px;
          gap: 4px;
        }
        .ultra-tab { 
          padding: 10px; 
          color: rgba(255,255,255,0.4); 
          cursor: pointer; 
          font-size: 12px; 
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          flex: 1; 
          text-align: center; 
          border-radius: 12px;
          transition: all 0.3s;
        }
        .ultra-tab.active { 
          background: rgba(0, 242, 254, 0.1);
          color: var(--ultra-accent); 
          box-shadow: inset 0 0 10px rgba(0, 242, 254, 0.1);
          border: 1px solid rgba(0, 242, 254, 0.2);
        }

        .ultra-content { flex: 1; overflow-y: auto; padding: 28px; color: #fff; scrollbar-width: none; }
        .ultra-content::-webkit-scrollbar { display: none; }

        .ultra-panel-section { display: none; animation: fadeIn 0.3s ease-out; }
        .ultra-panel-section.active { display: block; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        #ultra-notes-editor { 
          width: 100%; height: 300px; 
          background: rgba(0,0,0,0.3); 
          border: 1px solid var(--ultra-border); 
          border-radius: 16px; 
          color: #fff; 
          padding: 20px; 
          font-family: inherit; 
          font-size: 15px;
          line-height: 1.6;
          resize: none; 
          margin-bottom: 20px; 
          outline: none;
          transition: border-color 0.3s;
        }
        #ultra-notes-editor:focus { border-color: rgba(255,255,255,0.2); }

        .btn-group { display: flex; gap: 12px; }
        .ultra-btn { 
          flex: 1;
          background: var(--accent-gradient); 
          color: #000; 
          border: none; 
          padding: 14px; 
          border-radius: 14px; 
          font-weight: 800; 
          font-size: 14px;
          cursor: pointer; 
          transition: all 0.3s;
        }
        .ultra-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0, 242, 254, 0.3); }
        .ultra-btn.full { width: 100%; margin-top: 20px; }
        
        .ultra-btn-outline { 
          flex: 1;
          background: rgba(255,255,255,0.03); 
          color: #fff; 
          border: 1px solid var(--ultra-border); 
          padding: 14px; 
          border-radius: 14px; 
          font-weight: 600;
          font-size: 14px;
          cursor: pointer; 
          transition: all 0.3s;
        }
        .ultra-btn-outline:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }

        #ultra-sketchpad-container { 
          width: 100%; height: 400px; 
          background: #fcfcfc; 
          border-radius: 20px; 
          margin-bottom: 20px; 
          box-shadow: inset 0 8px 32px rgba(0,0,0,0.1), 0 10px 30px rgba(0,0,0,0.3);
          overflow: hidden;
          background-image: radial-gradient(#ddd 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        #ultra-exit-modal { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.92); z-index: 2147483647; display: none; justify-content: center; align-items: center; backdrop-filter: blur(10px); }
        .ultra-modal-box { 
          background: #111; 
          padding: 50px; 
          border-radius: 30px; 
          width: 440px; 
          border: 1px solid var(--ultra-border); 
          text-align: center; 
          color: #fff; 
          box-shadow: 0 30px 60px rgba(0,0,0,0.8);
          animation: scaleIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
        
        #ultra-exit-reason { 
          width: 100%; height: 120px; 
          background: rgba(255,255,255,0.02); 
          border: 1px solid var(--ultra-border); 
          color: #fff; 
          padding: 16px; 
          border-radius: 16px; 
          margin: 30px 0; 
          resize: none;
          outline: none;
        }

        .progress-bar-outer { width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin: 25px 0 10px; }
        #ultra-prog-inner { height: 100%; background: var(--accent-gradient); width: 0%; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 0 10px rgba(0, 242, 254, 0.4); }
        #ultra-prog-text { font-size: 13px; font-weight: 700; color: var(--ultra-accent); text-align: right; }
      `;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window._ultra = new UltraProductivity());
  } else {
    window._ultra = new UltraProductivity();
  }
})();
