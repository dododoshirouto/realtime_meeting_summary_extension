console.log('Realtime Meeting Summary: Content script loaded');

let captionBuffer = [];
let previousBuffer = [];
let currentSummary = "";
let lastSummaryTime = 0;
let isRequesting = false; // Flag to prevent overlapping requests

// Default Config
let config = {
  summaryInterval: 30, // seconds
  historyCount: 5
};

// Load config
chrome.storage.local.get(['summaryInterval', 'historyCount'], (result) => {
  if (result.summaryInterval) config.summaryInterval = result.summaryInterval;
  if (result.historyCount !== undefined) config.historyCount = result.historyCount;
  console.log('Config loaded:', config);
});

// Listen for config changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.summaryInterval) config.summaryInterval = changes.summaryInterval.newValue;
    if (changes.historyCount) config.historyCount = changes.historyCount.newValue;
    console.log('Config updated:', config);
  }
});

function createSummaryPanel() {
  if (document.getElementById('meeting-summary-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'meeting-summary-panel';
  panel.innerHTML = `
    <div class="summary-header">
      <span>Meeting Summary</span>
      <span id="loading-indicator" style="display:none;" class="loading-spinner"></span>
      <button id="summary-toggle-btn">_</button>
    </div>
    <div class="panel-body" id="panel-body">
      <div id="realtime-summary" class="summary-section">
        <div class="section-title">AI要約 (Real-time)</div>
        <div class="content">待機中...</div>
      </div>
      <div id="captions-log" class="log-section">
        <div class="section-title">字幕ログ</div>
        <div class="content">
          <p class="placeholder">字幕待機中...</p>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  const toggleBtn = panel.querySelector('#summary-toggle-btn');
  const body = panel.querySelector('#panel-body');

  toggleBtn.addEventListener('click', () => {
    if (body.style.display === 'none') {
      body.style.display = 'block';
      toggleBtn.textContent = '_';
    } else {
      body.style.display = 'none';
      toggleBtn.textContent = '□';
    }
  });
}

function updateSummaryUI(summary) {
  const summaryDiv = document.querySelector('#realtime-summary .content');
  if (summaryDiv) {
    summaryDiv.innerHTML = summary.replace(/\n/g, '<br>');
  }
  // Save to storage for separate tab view
  chrome.storage.local.set({ meetingSummary: summary });
}

function setLoading(isLoading) {
  const indicator = document.getElementById('loading-indicator');
  if (indicator) {
    indicator.style.display = isLoading ? 'inline-block' : 'none';
  }
}

function markCaptionsAsSent(captionIds) {
  const logContent = document.querySelector('#captions-log .content');
  if (!logContent) return;

  captionIds.forEach(id => {
    const p = logContent.querySelector(`p[data-caption-id="${id}"]`);
    if (p) {
      p.classList.add('sent-to-ai');
    }
  });
}

async function triggerSummary() {
  // Safe Interval Check:
  // 1. Check if enough time passed since last SUCCESSFUL summary start
  // 2. Check if a request is currently in progress (isRequesting)

  const now = Date.now();
  const intervalMs = config.summaryInterval * 1000;

  if (isRequesting) return; // Prevent overlap
  if (now - lastSummaryTime < intervalMs) return; // Wait for interval

  // Check for pending instructions
  const storage = await chrome.storage.local.get(['pendingInstruction']);
  let instructionText = "";
  if (storage.pendingInstruction) {
    console.log('Found pending instruction:', storage.pendingInstruction);
    instructionText = `\n\n【ユーザーからの追加指示】: ${storage.pendingInstruction}\nこの指示に従って要約を修正・更新してください。`;
  }

  // Sliding Window with Configurable History
  const contextCaptions = previousBuffer.slice(-config.historyCount);
  const newCaptions = captionBuffer;
  const MIN_CHARS_FOR_SUMMARY = 100;

  // Check if we have enough NEW content OR if there is an instruction
  const newContentLength = newCaptions.map(c => c.text).join('').length;

  if (newContentLength < MIN_CHARS_FOR_SUMMARY && !instructionText) {
    // console.log('Not enough new content.');
    return;
  }

  const textToSummarize = [...contextCaptions, ...newCaptions]
    .map(c => `${c.speaker}: ${c.text}`)
    .join('\n') + instructionText;

  console.log('Triggering summary generation...');
  console.log('Sending to AI:', textToSummarize); // Debug log
  isRequesting = true;
  setLoading(true);
  lastSummaryTime = Date.now(); // Update timer at START of request

  // Capture IDs for highlighting
  const sentCaptionIds = newCaptions.map(c => c.id);

  // Send to background
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateSummary',
      text: textToSummarize,
      currentSummary: currentSummary
    });

    if (response.success) {
      currentSummary = response.summary;
      updateSummaryUI(currentSummary);

      // Mark captions as sent (Debug feature)
      markCaptionsAsSent(sentCaptionIds);

      // Update buffers
      previousBuffer = [...captionBuffer];
      captionBuffer = [];

      // lastSummaryTime = Date.now(); // Removed: Timer is now updated at start

      // Clear pending instruction if it existed
      if (instructionText) {
        chrome.storage.local.remove(['pendingInstruction']);
      }
    } else {
      console.error('Summary failed:', response.error);
      const summaryDiv = document.querySelector('#realtime-summary .content');
      if (summaryDiv) summaryDiv.innerHTML += `<br><span style="color:red; font-size:10px;">Error: ${response.error}</span>`;
    }
  } catch (err) {
    console.error('Message sending failed:', err);
  } finally {
    isRequesting = false;
    setLoading(false);
  }
}

// Wait for the meeting UI to load
setTimeout(() => {
  createSummaryPanel();

  // Auto-enable captions check
  const checkCaptionsStatus = () => {
    const captionBtn = document.querySelector('button[aria-label*="字幕"], button[aria-label*="Captions"]');
    const logContent = document.querySelector('#captions-log .content');

    if (captionBtn && logContent) {
      const isPressed = captionBtn.getAttribute('aria-pressed') === 'true';
      const placeholder = logContent.querySelector('.placeholder');

      if (!isPressed) {
        if (placeholder) {
          placeholder.textContent = '字幕を開いてください (Shift+C)';
          placeholder.style.color = '#d93025';
        }
      } else {
        if (placeholder && placeholder.textContent.includes('字幕を開いてください')) {
          placeholder.textContent = '字幕待機中...';
          placeholder.style.color = '#5f6368';
        }
      }
    }
  };

  setInterval(checkCaptionsStatus, 2000);

  // Check trigger every 1s (but logic inside handles the interval)
  setInterval(triggerSummary, 1000);

  // Initialize Caption Observer
  if (window.CaptionObserver) {
    const observer = new window.CaptionObserver((captionData) => {
      const lastIdx = captionBuffer.findIndex(c => c.id === captionData.id);
      if (lastIdx !== -1) {
        captionBuffer[lastIdx] = captionData;
      } else {
        captionBuffer.push(captionData);
      }

      // Update UI (Log)
      const logContent = document.querySelector('#captions-log .content');
      if (logContent) {
        const placeholder = logContent.querySelector('.placeholder');
        if (placeholder) placeholder.remove();

        let p = logContent.querySelector(`p[data-caption-id="${captionData.id}"]`);
        if (p) {
          p.innerHTML = `<strong>${captionData.speaker || 'Unknown'}:</strong> ${captionData.text}`;
        } else {
          p = document.createElement('p');
          p.setAttribute('data-caption-id', captionData.id);
          p.style.borderBottom = '1px solid #eee';
          p.style.padding = '4px 0';
          p.style.margin = '0';
          p.innerHTML = `<strong>${captionData.speaker || 'Unknown'}:</strong> ${captionData.text}`;
          logContent.appendChild(p);
          logContent.scrollTop = logContent.scrollHeight;
        }
      }
    });
    observer.start();
  } else {
    console.error('CaptionObserver not found');
  }
}, 3000);
