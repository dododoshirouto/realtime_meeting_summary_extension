document.addEventListener('DOMContentLoaded', () => {
    const statusDiv = document.getElementById('status');
    const settingsBtn = document.getElementById('openSettings');

    settingsBtn.addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('src/options.html'));
        }
    });

    const summaryBtn = document.getElementById('openSummary');
    if (summaryBtn) {
        summaryBtn.addEventListener('click', () => {
            chrome.tabs.create({ url: chrome.runtime.getURL('src/summary.html') });
        });
    }

    // Check if we are in a Google Meet tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (currentTab && currentTab.url.includes('meet.google.com')) {
            statusDiv.textContent = 'Google Meetを検出しました';
            statusDiv.style.backgroundColor = '#e6f4ea';
            statusDiv.style.color = '#137333';
        } else {
            statusDiv.textContent = 'Google Meetで使用してください';
            statusDiv.style.backgroundColor = '#fce8e6';
            statusDiv.style.color = '#c5221f';
        }
    });
});
