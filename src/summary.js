document.addEventListener('DOMContentLoaded', () => {
    const summaryContent = document.getElementById('summary-content');
    const statusText = document.getElementById('status-text');
    const costDisplay = document.getElementById('cost-display');
    const instructionInput = document.getElementById('instruction-input');
    const sendBtn = document.getElementById('send-instruction-btn');

    // Listen for changes in storage (from content script)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.meetingSummary) {
                const rawText = changes.meetingSummary.newValue;
                summaryContent.innerHTML = parseMarkdown(rawText);
                statusText.innerText = 'Updated from meeting.';
                highlightUpdate();

                // If we were waiting for an update, clear the instruction input
                if (instructionInput.value && sendBtn.disabled) {
                    instructionInput.value = '';
                    sendBtn.disabled = false;
                    sendBtn.textContent = '次回更新時に反映';
                }
            }
            if (changes.sessionCost) {
                updateCost(changes.sessionCost.newValue);
            }
        }
    });

    // Initial load with markdown parsing
    chrome.storage.local.get(['meetingSummary', 'sessionCost'], (result) => {
        if (result.meetingSummary) {
            summaryContent.innerHTML = parseMarkdown(result.meetingSummary);
            statusText.innerText = 'Loaded.';
        }
        if (result.sessionCost !== undefined) {
            updateCost(result.sessionCost);
        }
    });

    function updateCost(cost) {
        if (costDisplay) {
            costDisplay.textContent = `$${(cost || 0).toFixed(4)}`;
        }
    }

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

    // Simple Markdown Parser
    function parseMarkdown(text) {
        if (!text) return '';

        // Normalize newlines: Replace 3+ newlines with 2 (max 1 empty line)
        text = text.replace(/\n{3,}/g, '\n\n');

        // Escape HTML to prevent XSS (basic)
        let html = text.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

        // Bold
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

        // Italic
        html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

        // Unordered Lists
        // Simple block replacement for lists.
        const lines = html.split('\n');
        let inList = false;
        let processedLines = lines.map(line => {
            if (line.match(/^[-•] /)) {
                const content = line.replace(/^[-•] /, '');
                if (!inList) {
                    inList = true;
                    return '<ul><li>' + content + '</li>';
                } else {
                    return '<li>' + content + '</li>';
                }
            } else {
                if (inList) {
                    inList = false;
                    return '</ul>' + line + '<br>'; // End list and add break
                }
                return line + '<br>';
            }
        });

        if (inList) processedLines.push('</ul>'); // Close list if ended on one

        return processedLines.join('');
    }
});
