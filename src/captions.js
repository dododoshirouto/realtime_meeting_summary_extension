class CaptionObserver {
    constructor(onCaptionUpdate) {
        this.onCaptionUpdate = onCaptionUpdate;
        this.observer = null;
        this.observedElements = new Set();
        this.isObserving = false;
        this.captionTrack = null;
        this.nodeTimers = new Map(); // Map<Node, TimerId>
        this.nodeIds = new WeakMap(); // Map<Node, number>
        this.nextNodeId = 0;
    }

    start() {
        if (this.isObserving) return;

        console.log('CaptionObserver: Starting observation...');

        // Observer to find the caption container
        const bodyObserver = new MutationObserver((mutations) => {
            this.findAndObserveCaptions();
        });

        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.isObserving = true;
        this.findAndObserveCaptions(); // Try immediately

        // Fallback: Periodic check
        setInterval(() => this.findAndObserveCaptions(), 2000);
    }

    findAndObserveCaptions() {
        if (this.captionTrack && document.body.contains(this.captionTrack)) {
            return; // Already observing
        }

        // User feedback: The container has aria-label="字幕" (or "Captions" in English)
        // Selector: [aria-label="字幕"], [aria-label="Captions"]
        // Also role="region"

        const candidate = document.querySelector('[aria-label="字幕"][role="region"]') ||
            document.querySelector('[aria-label="Captions"][role="region"]');

        if (candidate) {
            // Check if it's actually visible/active (height > 0)
            if (candidate.offsetHeight > 0 || candidate.scrollHeight > 0) {
                if (candidate !== this.captionTrack) {
                    console.log('CaptionObserver: Found caption track (aria-label)', candidate);
                    this.captionTrack = candidate;
                    this.observeTrack(candidate);
                }
            }
        }
    }

    observeTrack(track) {
        // Disconnect previous track observer if any (not implemented for simplicity, relying on GC/overwrite)

        const trackObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            this.processNode(node);
                        }
                    });
                } else if (mutation.type === 'characterData') {
                    this.processNode(mutation.target);
                }
            });
        });

        trackObserver.observe(track, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    processNode(node) {
        if (!node) return;

        // Clear existing timer for this node to debounce updates
        if (this.nodeTimers.has(node)) {
            clearTimeout(this.nodeTimers.get(node));
        }

        // Set a new timer to wait for stabilization
        // Reduced to 500ms to feel more responsive while still batching characters
        const timerId = setTimeout(() => {
            this.handleFinalizedNode(node);
            this.nodeTimers.delete(node);
        }, 500);

        this.nodeTimers.set(node, timerId);
    }

    handleFinalizedNode(node) {
        // The text is likely deep inside.
        const text = node.textContent;

        if (text && text.trim().length > 0) {
            // Filter out known UI noise
            if (text.includes('カメラはオン') || text.includes('マイクはオン') || text.includes('参加しました')) {
                return;
            }

            // Get or assign unique ID for this node
            let nodeId = this.nodeIds.get(node);
            if (nodeId === undefined) {
                nodeId = this.nextNodeId++;
                this.nodeIds.set(node, nodeId);
            }

            // Attempt to find speaker
            let speaker = 'Unknown';
            let parent = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

            // Traverse up to find the container
            for (let i = 0; i < 5; i++) {
                if (!parent || parent === document.body) break;

                // Strategy 1: Look for img with alt text (Avatar)
                let img = parent.querySelector('img');
                if (img && img.alt) {
                    speaker = img.alt;
                    break;
                }

                // Strategy 2: Look for specific speaker name class
                const nameEl = parent.querySelector('.zs7s8d, .TBMuR');
                if (nameEl && nameEl.textContent) {
                    speaker = nameEl.textContent;
                    break;
                }

                // Strategy 3: Check siblings
                let sibling = parent.previousElementSibling;
                while (sibling) {
                    img = sibling.querySelector('img') || (sibling.tagName === 'IMG' ? sibling : null);
                    if (img && img.alt) {
                        speaker = img.alt;
                        break;
                    }
                    sibling = sibling.previousElementSibling;
                }
                if (speaker !== 'Unknown') break;

                parent = parent.parentElement;
            }

            // Fallback for "You"
            // If speaker is unknown, check if the text container has a "self" indicator?
            // Often difficult. For now, we rely on the ID to keep the text consistent.

            // Send update
            this.onCaptionUpdate({
                id: nodeId, // Pass the unique ID
                text: text.trim(),
                speaker: speaker,
                timestamp: new Date().toISOString()
            });
        }
    }
}

// Expose globally
window.CaptionObserver = CaptionObserver;
