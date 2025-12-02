// Background service worker
try {
    importScripts('cost_constants.js');
} catch (e) {
    console.error('Failed to import cost_constants.js:', e);
}

console.log('Background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
    // Initialize total cost if not exists
    chrome.storage.local.get(['totalCost'], (result) => {
        if (result.totalCost === undefined) {
            chrome.storage.local.set({ totalCost: 0 });
        }
    });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateSummary') {
        handleSummaryRequest(request)
            .then(sendResponse)
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
});

async function handleSummaryRequest(request) {
    try {
        const { text, currentSummary, model } = request;

        // Get API key and Prompt from storage
        const result = await chrome.storage.local.get(['openaiApiKey', 'systemPrompt', 'apiProvider', 'openaiModel']);
        const apiKey = result.openaiApiKey;
        const customPrompt = result.systemPrompt;
        const apiProvider = result.apiProvider || 'openai'; // Default to openai
        const storedModel = result.openaiModel;

        if (!apiKey) {
            throw new Error('API Key is not set. Please check options.');
        }

        let systemPrompt = "";
        let userContent = "";

        if (currentSummary && currentSummary.length > 0) {
            // Update Mode
            systemPrompt = customPrompt || `
あなたは会議の書記です。
「現在の議事録」と「追加の会話（字幕）」が提供されます。
これらを統合し、情報を更新した**新しい議事録**を作成してください。

ルール:
1. **情報の維持**: 過去の決定事項や重要ポイントは削除せず維持してください。
2. **統合**: 新しい会話の内容を適切な箇所に追記、または既存の項目を更新してください。
3. **形式**: 簡潔な箇条書き。
4. **文脈**: 追加の会話には、文脈を繋ぐために前回の会話の一部が含まれている場合があります。重複しないようにうまく処理してください。
`;
            userContent = `
【現在の議事録】
${currentSummary}

【追加の会話】
${text}
`;
        } else {
            // Create Mode (First time)
            systemPrompt = customPrompt || `
あなたは会議の書記です。
提供された会議の字幕テキストから、議事録を作成してください。
以下の制約を守ってください：
1. 簡潔な箇条書きで出力すること。
2. 重要な決定事項やネクストアクションがあれば強調すること。
`;
            if (customPrompt) {
                userContent = `
【現在の議事録】
(なし)

【追加の会話】
${text}
`;
            } else {
                userContent = text;
            }
        }

        let summary = "";
        let costInfo = null;

        if (apiProvider === 'gemini') {
            // --- Gemini API Request ---
            // Use the selected model or default to flash
            const geminiModel = model || storedModel || 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: systemPrompt + "\n\n" + userContent }
                        ]
                    }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Gemini API request failed');
            }

            const data = await response.json();
            if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts.length > 0) {
                summary = data.candidates[0].content.parts[0].text;

                // Calculate Cost
                if (data.usageMetadata) {
                    const inputTokens = data.usageMetadata.promptTokenCount || 0;
                    const outputTokens = data.usageMetadata.candidatesTokenCount || 0;
                    costInfo = await updateCost(geminiModel, inputTokens, outputTokens);
                }
            } else {
                throw new Error('Gemini API returned an unexpected response format.');
            }

        } else {
            // --- OpenAI API Request ---
            const targetModel = model || 'gpt-4o-mini';
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: targetModel,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent }
                    ],
                    max_tokens: 1000
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'API request failed');
            }

            const data = await response.json();
            summary = data.choices[0].message.content;

            // Calculate Cost
            if (data.usage) {
                const inputTokens = data.usage.prompt_tokens || 0;
                const outputTokens = data.usage.completion_tokens || 0;
                costInfo = await updateCost(targetModel, inputTokens, outputTokens);
            }
        }

        return { success: true, summary, costInfo };

    } catch (error) {
        console.error('Summary generation error:', error);
        return { success: false, error: error.message };
    }
}

async function updateCost(modelName, inputTokens, outputTokens) {
    try {
        const costs = self.MODEL_COSTS || {};
        const rate = costs[modelName] || { input: 0, output: 0 }; // Default to 0 if unknown

        // Cost calculation (Rate is per 1M tokens)
        const inputCost = (inputTokens / 1000000) * rate.input;
        const outputCost = (outputTokens / 1000000) * rate.output;
        const currentCost = inputCost + outputCost;

        // Update Storage
        const result = await chrome.storage.local.get(['totalCost', 'sessionCost']);
        const newTotalCost = (result.totalCost || 0) + currentCost;
        const newSessionCost = (result.sessionCost || 0) + currentCost;

        await chrome.storage.local.set({
            totalCost: newTotalCost,
            sessionCost: newSessionCost
        });

        console.log(`Cost updated: +$${currentCost.toFixed(6)} (Total: $${newTotalCost.toFixed(6)})`);

        return {
            currentCost: currentCost,
            totalCost: newTotalCost,
            sessionCost: newSessionCost
        };
    } catch (e) {
        console.error('Error calculating cost:', e);
        return null;
    }
}
