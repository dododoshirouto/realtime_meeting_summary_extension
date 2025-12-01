document.addEventListener('DOMContentLoaded', () => {
    const summaryContent = document.getElementById('summary-content');
    const statusText = document.getElementById('status-text');

    // Load initial state
    chrome.storage.local.get(['meetingSummary'], (result) => {
        if (result.meetingSummary) {
            summaryContent.innerText = result.meetingSummary;
            statusText.innerText = 'Loaded.';
        }
    });

    // Listen for changes in storage (from content script)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local' && changes.meetingSummary) {
            // Only update if not currently editing (simple check for focus)
            // For Phase 1, we might just overwrite or be careful.
            // Let's overwrite for now as per "Realtime" requirement, 
            // but in Phase 2 we need to handle conflicts.
            // If the user is typing, this might be annoying.
            // For now, let's check if the element has focus.
            if (document.activeElement !== summaryContent) {
                summaryContent.innerText = changes.meetingSummary.newValue;
                statusText.innerText = 'Updated from meeting.';
                highlightUpdate();
            } else {
                statusText.innerText = 'Update pending (you are editing)...';
            }
        }
    });

    // Phase 2: Save changes back to storage
    let debounceTimer;
    summaryContent.addEventListener('input', () => {
        statusText.innerText = 'Saving...';
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const newText = summaryContent.innerText;
            chrome.storage.local.set({ meetingSummary: newText }, () => {
                statusText.innerText = 'Saved.';
            });
        }, 1000); // 1 second debounce
    });

    function highlightUpdate() {
        summaryContent.style.backgroundColor = '#e8f5e9';
        setTimeout(() => {
            summaryContent.style.backgroundColor = 'transparent';
        }, 500);
    }
});
