/**
 * Popup Logic
 * Handles mode switching and analytics navigation.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const db = window.UltraStorage;
    const settings = await db.getSettings();

    const masterToggle = document.getElementById('master-toggle');
    const statusText = document.getElementById('status-text');
    const modeSelector = document.querySelector('.mode-selector');

    // Initialize UI from settings
    updateActiveUI(settings.mode);
    masterToggle.checked = settings.enabled !== false;
    updateEnabledUI(masterToggle.checked);

    // Master Toggle Handler
    masterToggle.onchange = async () => {
        const isEnabled = masterToggle.checked;
        settings.enabled = isEnabled;
        await db.setSettings(settings);
        updateEnabledUI(isEnabled);
    };

    // Mode Selector Handlers
    document.querySelectorAll('.mode-option').forEach(option => {
        option.onclick = async () => {
            if (!masterToggle.checked) return; // Ignore if disabled

            const mode = option.getAttribute('data-mode');
            settings.mode = mode;
            await db.setSettings(settings);
            updateActiveUI(mode);
        };
    });

    const statsBtn = document.querySelector('.stats-btn');
    if (statsBtn) {
        statsBtn.onclick = () => {
            chrome.runtime.sendMessage({ action: 'openAnalytics' });
        };
    }

    function updateEnabledUI(enabled) {
        statusText.textContent = enabled ? 'Active' : 'Disabled';
        statusText.style.color = enabled ? 'var(--accent)' : 'var(--text-dim)';
        modeSelector.style.opacity = enabled ? '1' : '0.4';
        modeSelector.style.pointerEvents = enabled ? 'all' : 'none';

        // Visual indicator on toggle container
        const container = document.querySelector('.master-toggle-container');
        if (enabled) {
            container.style.borderColor = 'rgba(0, 242, 254, 0.3)';
            container.style.background = 'rgba(0, 242, 254, 0.05)';
        } else {
            container.style.borderColor = 'var(--border)';
            container.style.background = 'var(--surface)';
        }
    }
});

function updateActiveUI(mode) {
    document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-mode') === mode);
    });
}
