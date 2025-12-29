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
        await this.loadData();
        this.setupNavigation();
        this.setupListeners();
    }


    async loadData() {
        const videos = await this.db.getAllVideos();
        this.renderHistory(videos);
        this.renderGlobalNotes(videos);
        this.renderInsights(videos);
    }

    renderHistory(videos) {
        const list = document.getElementById('history-list');
        list.innerHTML = '';

        videos.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

        videos.forEach(v => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const isCompleted = v.status === 'completed';

            item.innerHTML = `
                <div class="item-main">
                    <div class="item-status">
                        <span class="dot ${isCompleted ? 'dot-green' : 'dot-red'}"></span>
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
                        ${isCompleted ? `<button class="btn-icon btn-danger delete-btn" data-id="${v.videoId}">Remove</button>` : ''}
                    </div>
                </div>
                <div class="item-details">
                    <div class="details-grid">
                        <div class="detail-section">
                            <h4>Session Notes</h4>
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

            // Delete Logic (only for completed)
            const deleteBtn = item.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (confirm('Permanently remove this completed session from history?')) {
                        await this.db.deleteVideo(v.videoId);
                        this.loadData();
                    }
                };
            }

            // Title click to open
            item.querySelector('.title').onclick = () => {
                window.open(`https://www.youtube.com/watch?v=${v.videoId}`, '_blank');
            };

            list.appendChild(item);
        });
    }

    renderGlobalNotes(videos) {
        const container = document.getElementById('global-notes-list');
        container.innerHTML = '';

        const videosWithNotes = videos.filter(v => v.notes && v.notes.trim() !== '');

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
                <div class="notes-preview" style="background:#0a0a0a; border:none; height:150px;">${v.notes}</div>
            `;

            card.querySelector('.delete-note-btn').onclick = async () => {
                if (confirm('Are you sure you want to delete ONLY the notes for this session? This action is irreversible.')) {
                    await this.db.setVideoData(v.videoId, { notes: "" });
                    this.loadData();
                }
            };

            container.appendChild(card);
        });
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
                    <div style="flex:1; background:#222; height:14px; border-radius:7px; overflow:hidden;">
                        <div style="width:${width}%; background:var(--accent-color); height:100%;"></div>
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
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <div style="width:30px; height:${height}px; background:#fff; border-radius:4px 4px 0 0; position:relative;">
                        <span style="position:absolute; top:-20px; font-size:10px; color:#fff; width:100%; text-align:center;">${d.count}</span>
                    </div>
                    <div style="font-size:10px; color:var(--text-secondary); width:60px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.title}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
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
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AnalyticsManager();
});
