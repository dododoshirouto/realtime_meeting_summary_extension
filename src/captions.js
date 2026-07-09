class CaptionObserver {
    constructor(onCaptionUpdate) {
        this.onCaptionUpdate = onCaptionUpdate;
        this.isObserving = false;
        this.captionTrack = null;
        this.entryTimers = new WeakMap(); // Map<entryEl, timerId>
        this.entryIds = new WeakMap(); // Map<entryEl, number>
        this.nextEntryId = 0;
    }

    start() {
        if (this.isObserving) return;

        console.log('CaptionObserver: Starting observation...');

        // Observer to find the caption container
        const bodyObserver = new MutationObserver(() => {
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

        // The container has aria-label="字幕" (or "Captions" in English), role="region".
        const candidate = document.querySelector('[aria-label="字幕"][role="region"]') ||
            document.querySelector('[aria-label="Captions"][role="region"]');

        if (candidate) {
            // Check if it's actually visible/active (height > 0)
            if (candidate.offsetHeight > 0 || candidate.scrollHeight > 0) {
                if (candidate !== this.captionTrack) {
                    console.log('CaptionObserver: Found caption track (aria-label)', candidate);
                    this.captionTrack = candidate;
                    this.observeTrack(candidate);

                    // Process any entries already present in the track
                    Array.from(candidate.children).forEach(entry => this.scheduleProcess(entry));
                }
            }
        }
    }

    observeTrack(track) {
        const trackObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType !== Node.ELEMENT_NODE) return;
                        const entry = this.resolveEntry(node, track);
                        if (entry) this.scheduleProcess(entry);
                    });
                } else if (mutation.type === 'characterData') {
                    const entry = this.resolveEntry(mutation.target, track);
                    if (entry) this.scheduleProcess(entry);
                }
            });
        });

        trackObserver.observe(track, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // Each caption "turn" (speaker avatar/name + text) is a direct child of the track.
    // Walk up from whatever node mutated until we reach that direct child.
    resolveEntry(node, track) {
        let el = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!el || el === track) return null;

        while (el.parentElement && el.parentElement !== track) {
            el = el.parentElement;
        }

        if (el.parentElement !== track) return null;
        return el;
    }

    scheduleProcess(entryEl) {
        if (!entryEl || entryEl.nodeType !== Node.ELEMENT_NODE) return;

        // Debounce: wait for the caption text to stabilize before reading it
        if (this.entryTimers.has(entryEl)) {
            clearTimeout(this.entryTimers.get(entryEl));
        }

        const timerId = setTimeout(() => {
            this.finalizeEntry(entryEl);
            this.entryTimers.delete(entryEl);
        }, 500);

        this.entryTimers.set(entryEl, timerId);
    }

    finalizeEntry(entryEl) {
        if (!entryEl || !document.body.contains(entryEl)) return;

        const data = this.extractEntryData(entryEl);
        if (!data || !data.text) return;

        // Filter out known UI noise
        if (data.text.includes('カメラはオン') || data.text.includes('マイクはオン') || data.text.includes('参加しました')) {
            return;
        }

        let entryId = this.entryIds.get(entryEl);
        if (entryId === undefined) {
            entryId = this.nextEntryId++;
            this.entryIds.set(entryEl, entryId);
        }

        this.onCaptionUpdate({
            id: entryId,
            text: data.text,
            speaker: data.speaker,
            timestamp: new Date().toISOString()
        });
    }

    // A caption entry is structured as:
    //   <div> (entry, direct child of the track)
    //     <div> (header: avatar <img> + <span>speaker name</span>)
    //     <div> (caption text)
    //   </div>
    // Both the header/text container classes are obfuscated and change between
    // Meet releases, so we rely on structural position rather than class names,
    // falling back to the avatar's alt text if no name span is found.
    extractEntryData(entryEl) {
        const childDivs = Array.from(entryEl.children).filter(c => c.tagName === 'DIV');
        if (childDivs.length === 0) return null;

        const headerEl = childDivs.length > 1 ? childDivs[0] : null;
        const textEl = childDivs[childDivs.length - 1];

        let speaker = 'Unknown';
        if (headerEl) {
            const nameSpan = headerEl.querySelector('span');
            if (nameSpan && nameSpan.textContent.trim()) {
                speaker = nameSpan.textContent.trim();
            } else {
                const img = headerEl.querySelector('img[alt]');
                if (img && img.alt.trim()) {
                    speaker = img.alt.trim();
                }
            }
        }

        const text = (textEl.textContent || '').trim();
        return { speaker, text };
    }
}

// Expose globally
window.CaptionObserver = CaptionObserver;
