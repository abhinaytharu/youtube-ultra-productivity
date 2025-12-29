/**
 * Ultra Storage Manager
 * Handles local JSON-based persistence across all extension contexts.
 */

window.UltraStorage = {
    KEYS: {
        HISTORY: 'ultra_history',
        SETTINGS: 'ultra_settings',
        SKETCHES: 'ultra_sketches'
    },

    // --- Base Operations ---
    async get(key, defaultValue = []) {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] || defaultValue);
            });
        });
    },

    async set(key, value) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, resolve);
        });
    },

    // --- High Level API ---
    async getVideoProgress(videoId) {
        const history = await this.get(this.KEYS.HISTORY, []);
        return history.find(v => v.videoId === videoId) || { videoId, notes: '', progress: 0, status: 'in-progress' };
    },

    async setVideoData(videoId, updates) {
        const history = await this.get(this.KEYS.HISTORY, []);
        const index = history.findIndex(v => v.videoId === videoId);

        if (index !== -1) {
            history[index] = { ...history[index], ...updates, updatedAt: Date.now() };
        } else {
            history.push({ videoId, notes: '', status: 'in-progress', ...updates, updatedAt: Date.now() });
        }

        await this.set(this.KEYS.HISTORY, history);
    },

    async getAllVideos() {
        return await this.get(this.KEYS.HISTORY, []);
    },

    async deleteVideo(videoId) {
        let history = await this.get(this.KEYS.HISTORY, []);
        history = history.filter(v => v.videoId !== videoId);
        await this.set(this.KEYS.HISTORY, history);

        // Also cleanup sketches
        const sketches = await this.get(this.KEYS.SKETCHES, {});
        delete sketches[videoId];
        await this.set(this.KEYS.SKETCHES, sketches);
    },

    // --- Settings ---
    async getSettings() {
        return await this.get(this.KEYS.SETTINGS, { mode: 'monk', enabled: true });
    },

    async setSettings(settings) {
        await this.set(this.KEYS.SETTINGS, settings);
    },

    // --- Data Management (Export/Import) ---
    async exportData() {
        const data = await new Promise(resolve => chrome.storage.local.get(null, resolve));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ultra_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    async importData(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            await new Promise(resolve => chrome.storage.local.clear(() => {
                chrome.storage.local.set(data, resolve);
            }));
            return true;
        } catch (e) {
            console.error("Import failed", e);
            return false;
        }
    }
};
