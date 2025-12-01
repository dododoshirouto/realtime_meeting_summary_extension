console.log('Realtime Meeting Summary: Content script loaded');

let captionBuffer = [];
let lastSummaryTime = 0;
const SUMMARY_INTERVAL = 30000; // 30 seconds
const MIN_CHARS_FOR_SUMMARY = 100;

function createSummaryPanel() {
  if (document.getElementById('meeting-summary-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'meeting-summary-panel';
  panel.innerHTML = `
    <div class="summary-header">
      <span>Meeting Summary</span>
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
    // Convert newlines to <br> for simple formatting
    summaryDiv.innerHTML = summary.replace(/\n/g, '<br>');
  }
}

async function triggerSummary() {
  const now = Date.now();
  if (now - lastSummaryTime < SUMMARY_INTERVAL) return;

  const textToSummarize = captionBuffer.map(c => `${c.speaker}: ${c.text}`).join('\n');

  if (textToSummarize.length < MIN_CHARS_FOR_SUMMARY) {
    console.log('Not enough content to summarize yet.');
    return;
  }

  console.log('Triggering summary generation...');
  lastSummaryTime = now;

  // Send to background
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'generateSummary',
      text: textToSummarize
    });

    if (response.success) {
      updateSummaryUI(response.summary);
      // Optional: Clear buffer or keep it for context? 
      // For "latest summary", we might want to keep some context or just clear.
      // Let's clear for now to avoid token limits, but in a real app we'd want a rolling window.
      captionBuffer = [];
    } else {
      console.error('Summary failed:', response.error);
      const summaryDiv = document.querySelector('#realtime-summary .content');
      if (summaryDiv) summaryDiv.innerHTML += `<br><span style="color:red; font-size:10px;">Error: ${response.error}</span>`;
    }
  } catch (err) {
    console.error('Message sending failed:', err);
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
  setInterval(triggerSummary, 5000); // Check every 5s if we need to summarize (interval check is inside function)

  // Initialize Caption Observer
  if (window.CaptionObserver) {
    const observer = new window.CaptionObserver((captionData) => {
      // Buffer for AI
      // Avoid duplicates in buffer if possible, but for now simple push
      // We might want to check if the last item has the same ID to update it instead of push
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
