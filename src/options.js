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
        apiProvider: 'openai', // 'openai' or 'gemini'
        openaiModel: 'gpt-4o-mini',
        summaryInterval: 30,
        historyCount: 5,
        systemPrompt: DEFAULT_PROMPT
    }, (result) => {
        apiKeyInput.value = result.openaiApiKey;
        // We don't set modelSelect.value here immediately because updateProviderUI will rebuild options
        // We pass the saved model to updateProviderUI to restore it
        intervalInput.value = result.summaryInterval;
        historyCountInput.value = result.historyCount;
        systemPromptInput.value = result.systemPrompt;

        updateProviderUI(result.apiProvider, result.openaiModel);
    });

    // Real-time detection
    apiKeyInput.addEventListener('input', () => {
        const apiKey = apiKeyInput.value.trim();
        const provider = detectProvider(apiKey);
        // Pass current selection to try and maintain it if possible, or let it reset
        updateProviderUI(provider, modelSelect.value);
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

        const provider = detectProvider(apiKey);

        chrome.storage.local.set({
            openaiApiKey: apiKey,
            apiProvider: provider,
            openaiModel: model,
            summaryInterval: interval,
            historyCount: historyCount,
            systemPrompt: systemPrompt
        }, () => {
            updateProviderUI(provider, model);
            showStatus(`設定を保存しました。(${provider === 'gemini' ? 'Gemini' : 'OpenAI'} detected)`, 'success');
        });
    });

    function detectProvider(apiKey) {
        if (apiKey.startsWith('AIza')) {
            return 'gemini';
        } else if (apiKey.startsWith('sk-')) {
            return 'openai';
        }
        return 'openai'; // Default
    }

    function updateProviderUI(provider, currentModel) {
        const statusSpan = document.getElementById('providerStatus');

        if (!statusSpan) return;

        modelSelect.innerHTML = ''; // Clear existing options

        if (provider === 'gemini') {
            statusSpan.textContent = '✅ Gemini Detected';
            statusSpan.style.color = '#188038';

            // Gemini Models
            const geminiModels = [
                { value: 'gemini-1.5-flash', text: 'gemini-1.5-flash (Recommended)' },
                { value: 'gemini-1.5-pro', text: 'gemini-1.5-pro' },
                { value: 'gemini-2.0-flash', text: 'gemini-2.0-flash' },
                { value: 'gemini-2.5-pro', text: 'gemini-2.5-pro' },
                { value: 'gemini-2.5-flash', text: 'gemini-2.5-flash' },
                { value: 'gemini-2.5-flash-lite', text: 'gemini-2.5-flash-lite' },
                { value: 'gemini-3-pro', text: 'gemini-3-pro' }
            ];

            geminiModels.forEach(m => {
                const option = document.createElement('option');
                option.value = m.value;
                option.textContent = m.text;
                modelSelect.appendChild(option);
            });

            modelSelect.disabled = false;

        } else {
            statusSpan.textContent = '✅ OpenAI Detected';
            statusSpan.style.color = '#1a73e8';

            // OpenAI Models
            const openaiModels = [
                { value: 'gpt-4o-mini', text: 'gpt-4o-mini (Recommended)' },
                { value: 'gpt-4o', text: 'gpt-4o' },
                { value: 'gpt-3.5-turbo', text: 'gpt-3.5-turbo' }
            ];

            openaiModels.forEach(m => {
                const option = document.createElement('option');
                option.value = m.value;
                option.textContent = m.text;
                modelSelect.appendChild(option);
            });

            modelSelect.disabled = false;
        }

        // Attempt to restore selection
        let hasOption = false;
        for (let i = 0; i < modelSelect.options.length; i++) {
            if (modelSelect.options[i].value === currentModel) {
                modelSelect.value = currentModel;
                hasOption = true;
                break;
            }
        }

        // If the current model is not available in the new list (e.g. switched provider), 
        // it defaults to the first option automatically (browser behavior), which is what we want (Recommended).
    }

    function showStatus(message, type) {
        status.textContent = message;
        status.className = `status ${type}`;
        setTimeout(() => {
            status.textContent = '';
            status.className = 'status';
        }, 3000);
    }
});
