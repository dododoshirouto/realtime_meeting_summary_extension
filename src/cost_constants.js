// Cost per 1M tokens (USD)
// Format: { input: number, output: number }
self.MODEL_COSTS = {
    // OpenAI (User provided)
    'gpt-5.5': { input: 1.25, output: 10.00 },
    'gpt-5.4-mini': { input: 0.25, output: 2.00 },
    'gpt-5.1': { input: 1.25, output: 10.00 },
    'gpt-5': { input: 1.25, output: 10.00 },
    'gpt-5-mini': { input: 0.25, output: 2.00 },
    'gpt-5-nano': { input: 0.05, output: 0.40 },
    'gpt-5.1-chat-latest': { input: 1.25, output: 10.00 },
    'gpt-5-chat-latest': { input: 1.25, output: 10.00 },
    'gpt-5.1-codex': { input: 1.25, output: 10.00 },
    'gpt-5-codex': { input: 1.25, output: 10.00 },
    'gpt-5-pro': { input: 15.00, output: 120.00 },
    'gpt-4.1': { input: 2.00, output: 8.00 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-4.1-nano': { input: 0.10, output: 0.40 },
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-realtime': { input: 4.00, output: 16.00 },
    'gpt-realtime-mini': { input: 0.60, output: 2.40 },
    'gpt-4o-realtime-preview': { input: 5.00, output: 20.00 },
    'gpt-4o-mini-realtime-preview': { input: 0.60, output: 2.40 },
    'gpt-audio': { input: 2.50, output: 10.00 },
    'gpt-audio-mini': { input: 0.60, output: 2.40 },
    'gpt-4o-audio-preview': { input: 2.50, output: 10.00 },
    'gpt-4o-mini-audio-preview': { input: 0.15, output: 0.60 },
    'o1': { input: 15.00, output: 60.00 },
    'o1-pro': { input: 150.00, output: 600.00 },
    'o3-pro': { input: 20.00, output: 80.00 },
    'o3': { input: 2.00, output: 8.00 },
    'o3-deep-research': { input: 10.00, output: 40.00 },
    'o4-mini': { input: 1.10, output: 4.40 },
    'o4-mini-deep-research': { input: 2.00, output: 8.00 },
    'o3-mini': { input: 1.10, output: 4.40 },
    'o1-mini': { input: 1.10, output: 4.40 },
    'gpt-5.1-codex-mini': { input: 0.25, output: 2.00 },
    'codex-mini-latest': { input: 1.50, output: 6.00 },
    'gpt-5-search-api': { input: 1.25, output: 10.00 },
    'gpt-4o-mini-search-preview': { input: 0.15, output: 0.60 },
    'gpt-4o-search-preview': { input: 2.50, output: 10.00 },
    'computer-use-preview': { input: 3.00, output: 12.00 },
    'gpt-image-1': { input: 5.00, output: 0 },
    'gpt-image-1-mini': { input: 2.00, output: 0.20 },

    // Legacy/Existing
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },

    // Gemini (Research & User Provided)
    'gemini-1.5-flash': { input: 0.075, output: 0.30 },
    'gemini-1.5-pro': { input: 3.50, output: 10.50 },
    'gemini-1.0-pro': { input: 0.50, output: 1.50 },

    // Gemini (User Provided - <= 200k context rates)
    'gemini-2.0-flash': { input: 0.10, output: 0.40 },
    'gemini-2.5-flash': { input: 0.30, output: 2.50 },
    'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
    'gemini-2.5-pro': { input: 1.25, output: 10.00 },
    'gemini-3-pro': { input: 2.00, output: 12.00 },
    'gemini-3.5-flash': { input: 0.30, output: 2.50 },
    'gemini-3.1-pro': { input: 2.00, output: 12.00 }
};
