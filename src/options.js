document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const intervalInput = document.getElementById('interval');
    const historyCountInput = document.getElementById('historyCount');
    const systemPromptInput = document.getElementById('systemPrompt');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');

    // Default Prompt
    const DEFAULT_PROMPT = `あなたは会議の書記です。
「現在の議事録」と「追加の会話（字幕）」が提供されます。
これらを統合し、情報を更新した**新しい議事録**を作成してください。

ルール:
1. **情報の維持**: 過去の決定事項や重要ポイントは削除せず維持してください。
2. **統合**: 新しい会話の内容を適切な箇所に追記、または既存の項目を更新してください。
3. **形式**: 簡潔な箇条書き。
4. **文脈**: 追加の会話には、文脈を繋ぐために前回の会話の一部が含まれている場合があります。重複しないようにうまく処理してください。`;

    // Load saved settings
    chrome.storage.local.get({
        openaiApiKey: '',
        openaiModel: 'gpt-4o-mini',
        summaryInterval: 30,
        historyCount: 5,
        systemPrompt: DEFAULT_PROMPT
    }, (result) => {
        apiKeyInput.value = result.openaiApiKey;
        modelSelect.value = result.openaiModel;
        intervalInput.value = result.summaryInterval;
        historyCountInput.value = result.historyCount;
        systemPromptInput.value = result.systemPrompt;
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;
        const interval = parseInt(intervalInput.value, 10);
        const historyCount = parseInt(historyCountInput.value, 10);
        const systemPrompt = systemPromptInput.value;

        if (!apiKey) {
            showStatus('APIキーを入力してください。', 'error');
            return;
        }

        chrome.storage.local.set({
            openaiApiKey: apiKey,
            openaiModel: model,
            summaryInterval: interval,
            historyCount: historyCount,
            systemPrompt: systemPrompt
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
