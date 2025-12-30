/**
 * Analytics Dashboard Logic
 * Production-quality learning system tracking.
 */

class AnalyticsManager {
    constructor() {
        this.currentSection = 'history';
        this.db = window.UltraStorage;
        this.init();
    }

    async init() {
        try {
            await this.loadData();
        } catch (e) {
            console.error("Dashboard data load failed", e);
        }
        this.setupNavigation();
        this.setupListeners();
    }


    async loadData() {
        let videos = await this.db.getAllVideos();
        if (!Array.isArray(videos)) videos = [];

        const mastered = videos.filter(v => v.status === 'completed').length;
        const totalMasteryEl = document.getElementById('total-mastery');
        if (totalMasteryEl) totalMasteryEl.textContent = `${mastered} Sessions Mastered`;

        this.renderHistory(videos);
        this.renderGlobalNotes(videos);
        this.renderMaterials(videos);
        this.renderInsights(videos);
        this.populateVideoSelector(videos);
    }

    renderHistory(videos) {
        const list = document.getElementById('history-list');
        list.innerHTML = '';

        if (videos.length === 0) {
            list.innerHTML = `
                <div class="card" style="text-align:center; padding: 60px;">
                    <p style="color:var(--text-secondary);">No learning sessions recorded yet. Start watching a video to build your history.</p>
                </div>
            `;
            return;
        }

        videos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        videos.forEach(v => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const isMastered = v.status === 'completed' || (v.progress || 0) >= 90;

            item.innerHTML = `
                <div class="item-main">
                    <div class="item-status">
                        <span class="dot ${isMastered ? 'dot-green' : 'dot-red'}"></span>
                    </div>
                    <div class="item-info">
                        <span class="title" data-id="${v.videoId}">${v.title || 'Unknown Video'}</span>
                        <span class="channel">${v.channel || 'Unknown Channel'}</span>
                    </div>
                    <div class="item-meta">
                        ${this.formatSeconds(v.timeSpent || 0)}
                    </div>
                    <div class="item-meta">
                        ${v.progress || 0}% Complete
                    </div>
                    <div class="item-actions">
                        <button class="btn-icon expand-btn">Expand</button>
                        <button class="btn-icon resume-btn" data-id="${v.videoId}" data-time="${v.lastTime || 0}">Resume</button>
                        <button class="btn-icon edit-btn" data-id="${v.videoId}">Edit</button>
                        <button class="btn-icon btn-danger delete-btn" data-id="${v.videoId}">Remove</button>
                    </div>
                </div>
                <div class="item-details">
                    <div class="details-grid">
                        <div class="detail-section">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                                <h4>Session Notes</h4>
                                <button class="btn-icon copy-note-btn" data-id="${v.videoId}">Copy Text</button>
                            </div>
                            <div class="notes-preview">${v.notes || 'No notes taken.'}</div>
                        </div>
                        <div class="detail-section">
                            <h4>Visual Sketch</h4>
                            <div class="sketch-preview">
                                ${v.sketch ? `<img src="${v.sketch}" alt="Sketch">` : '<p style="color:#555; font-size:12px; padding:20px;">No sketch available.</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Expand Logic
            const expandBtn = item.querySelector('.expand-btn');
            const details = item.querySelector('.item-details');
            expandBtn.onclick = () => {
                const isExpanded = details.classList.contains('expanded');
                details.classList.toggle('expanded');
                expandBtn.textContent = isExpanded ? 'Expand' : 'Collapse';
            };

            // Resume Logic
            item.querySelector('.resume-btn').onclick = () => {
                const time = item.querySelector('.resume-btn').dataset.time;
                window.open(`https://www.youtube.com/watch?v=${v.videoId}&t=${time}`, '_blank');
            };

            // Copy Logic
            item.querySelector('.copy-note-btn').onclick = () => {
                navigator.clipboard.writeText(v.notes || '');
                const btn = item.querySelector('.copy-note-btn');
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy Text', 2000);
            };

            // Title click to open
            item.querySelector('.title').onclick = () => {
                window.open(`https://www.youtube.com/watch?v=${v.videoId}`, '_blank');
            };

            // Edit Logic
            item.querySelector('.edit-btn').onclick = () => {
                this.showEditModal(v);
            };

            // Delete Logic (Always available now)
            item.querySelector('.delete-btn').onclick = async () => {
                if (confirm('Permanently remove this learning session from history?')) {
                    await this.db.deleteVideo(v.videoId);
                    this.loadData();
                }
            };

            list.appendChild(item);
        });
    }

    renderGlobalNotes(videos) {
        const container = document.getElementById('global-notes-list');
        container.innerHTML = '';

        const videosWithNotes = videos.filter(v => v.notes && typeof v.notes === 'string' && v.notes.trim() !== '');

        if (videosWithNotes.length === 0) {
            container.innerHTML = '<p style="color:#555; grid-column:1/-1; text-align:center; padding:40px;">No notes found in any session.</p>';
            return;
        }

        videosWithNotes.forEach(v => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                    <div>
                        <h4 style="font-size:14px; margin-bottom:4px;">${v.title}</h4>
                        <p style="font-size:11px; color:var(--text-secondary);">${v.channel}</p>
                    </div>
                    <button class="btn-icon btn-danger delete-note-btn" data-id="${v.videoId}">Delete Note</button>
                </div>
                <div class="notes-preview" style="background:#0a0a0a; border:none; height:150px; overflow-y:auto; padding:10px; font-size:13px; border-radius:8px;">${v.notes}</div>
            `;

            card.querySelector('.delete-note-btn').onclick = async () => {
                if (confirm('Are you sure you want to delete ONLY the notes for this session?')) {
                    await this.db.setVideoData(v.videoId, { notes: "" });
                    this.loadData();
                }
            };

            container.appendChild(card);
        });
    }

    async renderMaterials(videos) {
        const container = document.getElementById('materials-list');
        container.innerHTML = '';

        const pdfs = await this.db.getAllPDFs();
        const videoIds = Object.keys(pdfs);

        if (videoIds.length === 0) {
            container.innerHTML = '<p style="color:#555; grid-column:1/-1; text-align:center; padding:40px;">No course materials linked yet.</p>';
            return;
        }

        videoIds.forEach(id => {
            const v = videos.find(vid => vid.videoId === id) || { title: 'Unknown Video', channel: 'Unknown Channel' };
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                    <div>
                        <h4 style="font-size:14px; margin-bottom:4px;">${v.title}</h4>
                        <p style="font-size:11px; color:var(--text-secondary);">${v.channel}</p>
                    </div>
                    <button class="btn-icon btn-danger delete-pdf-btn" data-id="${id}">Remove PDF</button>
                </div>
                <div class="stat-pill" style="justify-content:center; cursor:pointer; background:rgba(255,255,255,0.05);" onclick="window.open('${pdfs[id]}')">
                    Open Linked PDF
                </div>
            `;

            card.querySelector('.delete-pdf-btn').onclick = async () => {
                if (confirm('Are you sure you want to remove this PDF link?')) {
                    const allPdfs = await this.db.get(this.db.KEYS.PDFS, {});
                    delete allPdfs[id];
                    await this.db.set(this.db.KEYS.PDFS, allPdfs);
                    this.loadData();
                }
            };

            container.appendChild(card);
        });
    }

    populateVideoSelector(videos) {
        const selector = document.getElementById('video-selector');
        const currentVal = selector.value;
        selector.innerHTML = '<option value="">Select a video to bind...</option>';

        videos.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.videoId;
            const safeTitle = (v.title || 'Untitled Video').substring(0, 50);
            opt.textContent = `${safeTitle}... (${v.channel || 'Unknown'})`;
            selector.appendChild(opt);
        });
        selector.value = currentVal;
    }

    renderInsights(videos) {
        this.renderChannelGraph(videos);
        this.renderNoteDensityGraph(videos);
    }

    renderChannelGraph(videos) {
        const container = document.getElementById('channel-graph');
        if (videos.length === 0) { container.innerHTML = 'No data'; return; }

        const channelStats = videos.reduce((acc, v) => {
            acc[v.channel || 'Unknown'] = (acc[v.channel || 'Unknown'] || 0) + (v.timeSpent || 0);
            return acc;
        }, {});

        const sorted = Object.entries(channelStats).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxVal = Math.max(...sorted.map(s => s[1]), 1);

        let html = '<div style="display:flex; flex-direction:column; gap:12px; padding-top:10px;">';
        sorted.forEach(([name, val]) => {
            const width = (val / maxVal) * 100;
            html += `
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:100px; font-size:11px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${name}</div>
                    <div style="flex:1; background:rgba(255,255,255,0.05); height:12px; border-radius:6px; overflow:hidden;">
                        <div style="width:${width}%; background:var(--accent-gradient); height:100%; box-shadow: 0 0 10px rgba(79, 172, 254, 0.3);"></div>
                    </div>
                    <div style="width:60px; font-size:11px; color:#fff;">${this.formatSeconds(val)}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    renderNoteDensityGraph(videos) {
        const container = document.getElementById('note-density-graph');
        if (videos.length === 0) { container.innerHTML = 'No data'; return; }

        const noteDensity = videos
            .map(v => ({
                title: v.title,
                count: (v.notes || "").length
            }))
            .filter(v => v.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        if (noteDensity.length === 0) { container.innerHTML = 'No notes taken yet.'; return; }

        const maxVal = Math.max(...noteDensity.map(d => d.count), 1);

        let html = '<div style="display:flex; align-items:flex-end; gap:20px; height:100%; padding-top:30px;">';
        noteDensity.forEach(d => {
            const height = (d.count / maxVal) * 150;
            html += `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:12px;">
                    <div style="width:32px; height:${height}px; background:var(--accent-gradient); border-radius:6px 6px 0 0; position:relative; box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);">
                        <span style="position:absolute; top:-22px; font-size:10px; color:var(--accent-color); font-weight:700; width:100%; text-align:center;">${d.count}</span>
                    </div>
                    <div style="font-size:10px; color:var(--text-secondary); width:60px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.title}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    }

    showEditModal(video) {
        const modal = document.getElementById('detail-modal');
        const title = document.getElementById('modal-title');
        const body = document.getElementById('modal-body');

        title.textContent = `Edit Session: ${video.title || 'Untitled'}`;
        body.innerHTML = `
            <div class="edit-form" style="display:flex; flex-direction:column; gap:20px;">
                <div class="form-group">
                    <label style="display:block; margin-bottom:10px; font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-secondary);">Learning Status</label>
                    <div style="display:flex; gap:10px;">
                        <button class="btn ${video.status === 'completed' ? 'btn-active' : 'btn-secondary'} status-toggle" data-status="completed" style="flex:1;">Mastered</button>
                        <button class="btn ${video.status !== 'completed' ? 'btn-active' : 'btn-secondary'} status-toggle" data-status="in-progress" style="flex:1;">In-Progress</button>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display:block; margin-bottom:10px; font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-secondary);">Progress Control (${video.progress || 0}%)</label>
                    <input type="range" id="edit-progress" min="0" max="100" value="${video.progress || 0}" style="width:100%; accent-color:var(--accent-color);">
                </div>

                <div class="form-group">
                    <label style="display:block; margin-bottom:10px; font-weight:700; font-size:12px; text-transform:uppercase; color:var(--text-secondary);">Session Notes</label>
                    <textarea id="edit-notes" style="width:100%; height:200px; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); border-radius:12px; color:#fff; padding:15px; font-family:inherit; resize:vertical;">${video.notes || ''}</textarea>
                </div>

                <button id="save-edit-btn" class="btn" style="background:var(--accent-gradient); color:#000; font-weight:800; padding:15px; margin-top:10px;">Save Changes</button>
            </div>
        `;

        modal.style.display = 'block';

        let selectedStatus = video.status;
        const statusBtns = body.querySelectorAll('.status-toggle');
        statusBtns.forEach(btn => {
            btn.onclick = () => {
                selectedStatus = btn.dataset.status;
                statusBtns.forEach(b => {
                    b.classList.remove('btn-active');
                    b.classList.add('btn-secondary');
                });
                btn.classList.add('btn-active');
                btn.classList.remove('btn-secondary');
            };
        });

        body.querySelector('#save-edit-btn').onclick = async () => {
            const progress = parseInt(body.querySelector('#edit-progress').value);
            const notes = body.querySelector('#edit-notes').value;

            await this.db.setVideoData(video.videoId, {
                status: selectedStatus,
                progress: progress,
                notes: notes
            });

            modal.style.display = 'none';
            this.loadData();
        };
    }

    formatSeconds(sec) {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.onclick = () => {
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                const sectionId = item.dataset.section;
                document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
                document.getElementById(`section-${sectionId}`).classList.add('active');
            };
        });
    }

    setupListeners() {
        document.getElementById('refresh-btn').onclick = () => this.loadData();

        document.getElementById('cleanup-btn').onclick = async () => {
            const videos = await this.db.getAllVideos();
            const toRemove = videos.filter(v => (v.progress || 0) > 90);

            if (toRemove.length === 0) {
                alert("No videos found with over 90% progress.");
                return;
            }

            if (confirm(`Remove ${toRemove.length} video(s) that are over 90% watched?`)) {
                for (const v of toRemove) {
                    await this.db.deleteVideo(v.videoId);
                }
                alert("Cleanup complete.");
                this.loadData();
            }
        };

        // Data Management
        document.getElementById('export-btn').onclick = () => this.db.exportData();

        document.getElementById('import-btn').onclick = () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const success = await this.db.importData(event.target.result);
                    if (success) {
                        alert("Data imported successfully!");
                        this.loadData();
                    } else {
                        alert("Import failed. Check file format.");
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        };

        const modal = document.getElementById('detail-modal');
        document.querySelector('.close-btn').onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

        // PDF Upload Logic
        const uploadTrigger = document.getElementById('upload-trigger-btn');
        const fileInput = document.getElementById('pdf-upload');
        const saveBtn = document.getElementById('save-resource-btn');
        const videoSelector = document.getElementById('video-selector');
        const preview = document.getElementById('upload-preview');
        const fileName = document.getElementById('selected-file-name');

        uploadTrigger.onclick = () => fileInput.click();

        fileInput.onchange = (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                if (file.type !== 'application/pdf') {
                    alert('Please select a valid PDF file.');
                    return;
                }
                fileName.textContent = `Selected: ${file.name}`;
                preview.style.display = 'block';
            }
        };

        saveBtn.onclick = async () => {
            const videoId = videoSelector.value;
            if (!videoId) {
                alert('Please select a video session to bind this PDF to.');
                return;
            }

            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = event.target.result;
                await this.db.setPDF(videoId, base64);
                alert('PDF linked successfully!');
                preview.style.display = 'none';
                fileInput.value = '';
                this.loadData();
            };
            reader.readAsDataURL(file);
        };
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsManager();
});
