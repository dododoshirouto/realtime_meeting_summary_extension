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
        const { text, model } = request;

        // Get API key from storage
        const result = await chrome.storage.local.get(['openaiApiKey']);
        const apiKey = result.openaiApiKey;

        if (!apiKey) {
            throw new Error('API Key is not set. Please check options.');
        }

        // Prepare prompt
        const systemPrompt = `
あなたは会議のプロフェッショナルな書記です。
提供された会議の字幕テキストから、最新の議論の要約を作成してください。
以下の制約を守ってください：
1. 簡潔な箇条書きで出力すること。
2. 重要な決定事項やネクストアクションがあれば強調すること。
3. 直近の話題を中心にまとめること。
`;

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
                    { role: 'user', content: text }
                ],
                max_tokens: 500
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
