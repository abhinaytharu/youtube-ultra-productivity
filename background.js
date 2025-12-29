// YouTube Ultra Productivity - Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
    console.log("YouTube Ultra Productivity Installed. Ready for deep work.");
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openAnalytics') {
        chrome.tabs.create({ url: chrome.runtime.getURL('analytics.html') });
    }
});
