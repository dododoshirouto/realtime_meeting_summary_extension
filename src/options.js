document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const modelSelect = document.getElementById('model');
    const maxTokensInput = document.getElementById('maxTokens');
    const intervalInput = document.getElementById('interval');
    const historyCountInput = document.getElementById('historyCount');
    const autoCaptionInput = document.getElementById('autoCaption');
    const systemPromptInput = document.getElementById('systemPrompt');
    const saveButton = document.getElementById('save');
    const status = document.getElementById('status');
    const totalCostDisplay = document.getElementById('totalCostDisplay');
    const resetCostButton = document.getElementById('resetCost');

    const providerModeSelect = document.getElementById('providerMode');
    const cloudSection = document.getElementById('cloudSection');
    const llamaSection = document.getElementById('llamaSection');
    const llamaHostInput = document.getElementById('llamaHost');
    const llamaPortInput = document.getElementById('llamaPort');
    const llamaModelSelect = document.getElementById('llamaModel');
    const llamaModelStatus = document.getElementById('llamaModelStatus');
    const fetchLlamaModelsButton = document.getElementById('fetchLlamaModels');

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
        apiProvider: 'openai', // 'openai', 'gemini', or 'llama'
        openaiModel: 'gpt-4o-mini',
        llamaHost: '127.0.0.1',
        llamaPort: 8080,
        llamaModel: '',
        maxTokens: 5000, // Default
        summaryInterval: 30,
        historyCount: 5,
        autoCaption: true, // Default to true
        totalCost: 0,
        systemPrompt: DEFAULT_PROMPT
    }, (result) => {
        apiKeyInput.value = result.openaiApiKey;
        // We don't set modelSelect.value here immediately because updateProviderUI will rebuild options
        // We pass the saved model to updateProviderUI to restore it
        maxTokensInput.value = result.maxTokens;
        intervalInput.value = result.summaryInterval;
        historyCountInput.value = result.historyCount;
        autoCaptionInput.checked = result.autoCaption;
        systemPromptInput.value = result.systemPrompt;

        llamaHostInput.value = result.llamaHost;
        llamaPortInput.value = result.llamaPort;

        if (result.apiProvider === 'llama') {
            providerModeSelect.value = 'llama';
            if (result.llamaModel) {
                const option = document.createElement('option');
                option.value = result.llamaModel;
                option.textContent = result.llamaModel;
                llamaModelSelect.appendChild(option);
                llamaModelSelect.value = result.llamaModel;
            }
            updateProviderModeUI('llama');
        } else {
            providerModeSelect.value = 'cloud';
            updateProviderModeUI('cloud');
            updateProviderUI(result.apiProvider, result.openaiModel);
        }

        if (totalCostDisplay) {
            totalCostDisplay.textContent = `$${(result.totalCost || 0).toFixed(4)}`;
        }
    });

    // Real-time detection
    apiKeyInput.addEventListener('input', () => {
        const apiKey = apiKeyInput.value.trim();
        const provider = detectProvider(apiKey);
        // Pass current selection to try and maintain it if possible, or let it reset
        updateProviderUI(provider, modelSelect.value);
    });

    providerModeSelect.addEventListener('change', () => {
        updateProviderModeUI(providerModeSelect.value);
    });

    fetchLlamaModelsButton.addEventListener('click', async () => {
        const host = llamaHostInput.value.trim() || '127.0.0.1';
        const port = llamaPortInput.value.trim() || '8080';

        llamaModelStatus.textContent = '取得中...';
        llamaModelStatus.style.color = '#666';

        try {
            const response = await fetch(`http://${host}:${port}/v1/models`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            const models = data.data || [];

            llamaModelSelect.innerHTML = '';
            models.forEach(m => {
                const option = document.createElement('option');
                option.value = m.id;
                option.textContent = m.id;
                llamaModelSelect.appendChild(option);
            });

            llamaModelStatus.textContent = `✅ ${models.length}件のモデルを取得しました`;
            llamaModelStatus.style.color = '#188038';
        } catch (e) {
            llamaModelStatus.textContent = `⚠️ 取得失敗: ${e.message}`;
            llamaModelStatus.style.color = '#d93025';
        }
    });

    // Save settings
    saveButton.addEventListener('click', () => {
        const maxTokens = parseInt(maxTokensInput.value, 10);
        const interval = parseInt(intervalInput.value, 10);
        const historyCount = parseInt(historyCountInput.value, 10);
        const autoCaption = autoCaptionInput.checked;
        const systemPrompt = systemPromptInput.value;

        if (providerModeSelect.value === 'llama') {
            const llamaHost = llamaHostInput.value.trim() || '127.0.0.1';
            const llamaPort = parseInt(llamaPortInput.value, 10) || 8080;
            const llamaModel = llamaModelSelect.value;

            if (!llamaModel) {
                showStatus('llama.cpp のモデルを取得・選択してください。', 'error');
                return;
            }

            chrome.storage.local.set({
                apiProvider: 'llama',
                llamaHost: llamaHost,
                llamaPort: llamaPort,
                llamaModel: llamaModel,
                maxTokens: maxTokens,
                summaryInterval: interval,
                historyCount: historyCount,
                autoCaption: autoCaption,
                systemPrompt: systemPrompt
            }, () => {
                showStatus('設定を保存しました。(llama.cpp)', 'success');
            });
            return;
        }

        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;

        if (!apiKey) {
            showStatus('APIキーを入力してください。', 'error');
            return;
        }

        const provider = detectProvider(apiKey);

        chrome.storage.local.set({
            openaiApiKey: apiKey,
            apiProvider: provider,
            openaiModel: model,
            maxTokens: maxTokens,
            summaryInterval: interval,
            historyCount: historyCount,
            autoCaption: autoCaption,
            systemPrompt: systemPrompt
        }, () => {
            updateProviderUI(provider, model);
            showStatus(`設定を保存しました。(${provider === 'gemini' ? 'Gemini' : 'OpenAI'} detected)`, 'success');
        });
    });

    function updateProviderModeUI(mode) {
        if (mode === 'llama') {
            cloudSection.style.display = 'none';
            llamaSection.style.display = 'block';
        } else {
            cloudSection.style.display = 'block';
            llamaSection.style.display = 'none';
        }
    }

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
                { value: 'gemini-3-pro', text: 'gemini-3-pro' },
                { value: 'gemini-3.5-flash', text: 'gemini-3.5-flash' },
                { value: 'gemini-3.1-pro', text: 'gemini-3.1-pro' }
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
                { value: 'gpt-3.5-turbo', text: 'gpt-3.5-turbo' },
                { value: 'gpt-5.5', text: 'gpt-5.5' },
                { value: 'gpt-5.4-mini', text: 'gpt-5.4-mini' }
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

    if (resetCostButton) {
        resetCostButton.addEventListener('click', () => {
            if (confirm('累計コストをリセットしますか？')) {
                chrome.storage.local.set({ totalCost: 0 }, () => {
                    if (totalCostDisplay) totalCostDisplay.textContent = '$0.0000';
                    showStatus('コストをリセットしました。', 'success');
                });
            }
        });
    }
});
