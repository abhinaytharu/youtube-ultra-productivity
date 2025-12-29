const STORAGE_KEY = 'ultra_settings';

document.addEventListener('DOMContentLoaded', async () => {
    const data = await chrome.storage.local.get([STORAGE_KEY]);
    const settings = data[STORAGE_KEY] || { mode: 'monk', enabled: true };

    updateActiveUI(settings.mode);

    document.querySelectorAll('.mode-option').forEach(option => {
        option.onclick = async () => {
            const mode = option.getAttribute('data-mode');
            settings.mode = mode;
            await chrome.storage.local.set({ [STORAGE_KEY]: settings });
            updateActiveUI(mode);

            // Notify content script if needed, or just let them reload/auto-detect
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                if (tabs[0]) {
                    chrome.tabs.reload(tabs[0].id);
                }
            });
        };
    });
});

function updateActiveUI(mode) {
    document.querySelectorAll('.mode-option').forEach(opt => {
        opt.classList.toggle('active', opt.getAttribute('data-mode') === mode);
    });
}
