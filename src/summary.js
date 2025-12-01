document.addEventListener('DOMContentLoaded', () => {
    const summaryContent = document.getElementById('summary-content');
    const statusText = document.getElementById('status-text');
    const instructionInput = document.getElementById('instruction-input');
    const sendBtn = document.getElementById('send-instruction-btn');

    // Load initial state
    chrome.storage.local.get(['meetingSummary'], (result) => {
        if (result.meetingSummary) {
            summaryContent.innerText = result.meetingSummary;
            statusText.innerText = 'Loaded.';
        }
    });

    // Listen for changes in storage (from content script)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.meetingSummary) {
                summaryContent.innerText = changes.meetingSummary.newValue;
                statusText.innerText = 'Updated from meeting.';
                highlightUpdate();

                // If we were waiting for an update, clear the instruction input
                if (instructionInput.value && sendBtn.disabled) {
                    instructionInput.value = '';
                    sendBtn.disabled = false;
                    sendBtn.textContent = '次回更新時に反映';
                }
            }
        }
    });

    // Handle Instruction Sending
    sendBtn.addEventListener('click', () => {
        const instruction = instructionInput.value.trim();
        if (!instruction) return;

        // Save to storage
        chrome.storage.local.set({ pendingInstruction: instruction }, () => {
            statusText.innerText = 'Instruction queued. Waiting for next update...';
            sendBtn.disabled = true;
            sendBtn.textContent = '送信済み (更新待ち)';
        });
    });

    function highlightUpdate() {
        summaryContent.style.backgroundColor = '#e8f5e9';
        setTimeout(() => {
            summaryContent.style.backgroundColor = 'transparent';
        }, 500);
    }
});
