console.log('Realtime Meeting Summary: Content script loaded');

function createSummaryPanel() {
  if (document.getElementById('meeting-summary-panel')) return;

  const panel = document.createElement('div');
  panel.id = 'meeting-summary-panel';
  panel.innerHTML = `
    <div class="summary-header">
      <span>Meeting Summary</span>
      <button id="summary-toggle-btn">_</button>
    </div>
    <div class="summary-content" id="summary-content">
      <p class="placeholder">待機中...</p>
    </div>
  `;

  document.body.appendChild(panel);

  const toggleBtn = panel.querySelector('#summary-toggle-btn');
  const content = panel.querySelector('#summary-content');

  toggleBtn.addEventListener('click', () => {
    if (content.style.display === 'none') {
      content.style.display = 'block';
      toggleBtn.textContent = '_';
    } else {
      content.style.display = 'none';
      toggleBtn.textContent = '□';
    }
  });
}

// Wait for the meeting UI to load
setTimeout(() => {
  createSummaryPanel();

  // Auto-enable captions check
  const checkCaptionsStatus = () => {
    const captionBtn = document.querySelector('button[aria-label*="字幕"], button[aria-label*="Captions"]');
    const contentDiv = document.getElementById('summary-content');

    if (captionBtn && contentDiv) {
      const isPressed = captionBtn.getAttribute('aria-pressed') === 'true';
      const placeholder = contentDiv.querySelector('.placeholder');

      if (!isPressed) {
        if (placeholder) {
          placeholder.textContent = '字幕を開いてください (Shift+C)';
          placeholder.style.color = '#d93025'; // Red alert color
        }
      } else {
        if (placeholder && placeholder.textContent.includes('字幕を開いてください')) {
          placeholder.textContent = '待機中...';
          placeholder.style.color = '#5f6368';
        }
      }
    }
  };

  setInterval(checkCaptionsStatus, 2000);

  // Initialize Caption Observer
  if (window.CaptionObserver) {
    const observer = new window.CaptionObserver((captionData) => {
      console.log('Caption received:', captionData);

      const contentDiv = document.getElementById('summary-content');
      if (contentDiv) {
        // Remove placeholder if it exists
        const placeholder = contentDiv.querySelector('.placeholder');
        if (placeholder) placeholder.remove();

        // Try to find existing line for this caption ID
        let p = contentDiv.querySelector(`p[data-caption-id="${captionData.id}"]`);

        if (p) {
          // Update existing line
          p.innerHTML = `<strong>${captionData.speaker || 'Unknown'}:</strong> ${captionData.text}`;
        } else {
          // Create new line
          p = document.createElement('p');
          p.setAttribute('data-caption-id', captionData.id);
          p.style.borderBottom = '1px solid #eee';
          p.style.padding = '4px 0';
          p.style.margin = '0';
          p.innerHTML = `<strong>${captionData.speaker || 'Unknown'}:</strong> ${captionData.text}`;
          contentDiv.appendChild(p);
          contentDiv.scrollTop = contentDiv.scrollHeight;
        }
      }
    });
    observer.start();
  } else {
    console.error('CaptionObserver not found');
  }
}, 3000);
