// assets/js/analytics.js

function trackEvent(eventData) {
  const payload = {
    sessionId: getSessionId(),
    timestamp: new Date().toISOString(),
    ...eventData
  };
  console.log('[Analytics] Sending event:', payload);
  fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(err => console.error('Analytics error:', err));
}

function getSessionId() {
  if (!localStorage.sessionId) {
    // Fallback UUID generator if crypto.randomUUID is not supported
    const uuid = (typeof crypto?.randomUUID === 'function')
      ? crypto.randomUUID()
      : 'xxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

    localStorage.sessionId = uuid;
  }
  return localStorage.sessionId;
}

// Page view
trackEvent({
  type: 'page_view',
  url: window.location.pathname
});

// Click tracking
document.addEventListener('click', e => {
  trackEvent({
    type: 'click',
    tag: e.target.tagName,
    id: e.target.id || null,
    classes: e.target.className || '',
    x: e.clientX,
    y: e.clientY,
    url: window.location.pathname
  });
});

// Scroll depth + time tracking
let maxScrollDepth = 0;
let startTime = performance.now();

window.addEventListener('scroll', () => {
  const currentDepth = Math.round((window.scrollY + window.innerHeight) / document.body.scrollHeight * 100);
  if (currentDepth > maxScrollDepth) {
    maxScrollDepth = currentDepth;
  }
});

window.addEventListener('beforeunload', () => {
  const durationMs = Math.round(performance.now() - startTime);
  trackEvent({
    type: 'page_leave',
    durationMs,
    scrollDepth: maxScrollDepth,
    url: window.location.pathname
  });
});
