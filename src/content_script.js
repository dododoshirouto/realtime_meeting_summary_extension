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

// Wait for the meeting UI to load (simple timeout for now, can be improved with MutationObserver later)
setTimeout(createSummaryPanel, 3000);

