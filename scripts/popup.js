/**
 * Popup Logic
 * Handles mode switching and analytics navigation.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const db = window.UltraStorage;
    const settings = await db.getSettings();

    updateActiveUI(settings.mode);

    document.querySelectorAll('.mode-option').forEach(option => {
        option.onclick = async () => {
            const mode = option.getAttribute('data-mode');
            settings.mode = mode;
            await db.setSettings(settings);
            updateActiveUI(mode);

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        };
    });

    const statsBtn = document.querySelector('.stats-btn');
    if (statsBtn) {
        statsBtn.onclick = () => {
            chrome.runtime.sendMessage({ action: 'openAnalytics' });
        };
    }
});

function updateActiveUI(mode) {
    document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-mode') === mode);
    });
}
