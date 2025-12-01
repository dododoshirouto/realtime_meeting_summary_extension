document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    // Load saved settings
    chrome.storage.local.get(['openaiApiKey', 'openaiModel'], (result) => {
        if (result.openaiApiKey) {
            apiKeyInput.value = result.openaiApiKey;
        }
        if (result.openaiModel) {
            modelSelect.value = result.openaiModel;
        }
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;

        if (!apiKey) {
            showStatus('APIキーを入力してください。', 'error');
            return;
        }

        chrome.storage.local.set({
            openaiApiKey: apiKey,
            openaiModel: model
        }, () => {
            showStatus('設定を保存しました。', 'success');
        });
    });

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 3000);
    }
});
