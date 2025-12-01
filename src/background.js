// Background service worker
console.log('Background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
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

        // Get API key from storage
        const result = await chrome.storage.local.get(['openaiApiKey']);
        const apiKey = result.openaiApiKey;

        if (!apiKey) {
            throw new Error('API Key is not set. Please check options.');
        }

        let systemPrompt = "";
        let userContent = "";

        if (currentSummary && currentSummary.length > 0) {
            // Update Mode
            systemPrompt = `
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
            systemPrompt = `
あなたは会議の書記です。
提供された会議の字幕テキストから、議事録を作成してください。
以下の制約を守ってください：
1. 簡潔な箇条書きで出力すること。
2. 重要な決定事項やネクストアクションがあれば強調すること。
`;
            userContent = text;
        }

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
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
        const summary = data.choices[0].message.content;

        return { success: true, summary };

    } catch (error) {
        console.error('Summary generation error:', error);
        return { success: false, error: error.message };
    }
}
