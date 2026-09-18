/* Focus4ward — lightweight GA4 event tracking.
   Loaded site-wide (defer). Fires a `book_call_click` event whenever a
   "Book a call" / "Faisons le point" CTA (any link to the contact page) is
   clicked, so we can see top-of-funnel intent alongside the `generate_lead`
   conversion fired on contact-form submit.
   GA4 uses sendBeacon transport, so the event survives the navigation. */

/* First-touch traffic source (added 2026-09-19). Runs on EVERY page, not
   just /contact — most visitors land on a blog post or the homepage before
   navigating internally to the contact form, so reading document.referrer
   on the contact page alone only ever sees the LAST internal click, never
   the original external source. Captured once per session (sessionStorage)
   on whichever page the visitor actually arrives on, then read back by the
   contact form regardless of how many pages they viewed in between.
   Ceiling: if there's no UTM and no referrer, that can mean true direct
   entry (typed URL, bookmark) OR a stripped referrer — browsers increasingly
   omit it cross-origin, and LinkedIn's in-app browser in particular often
   sends none at all. That case is labeled "direct/unknown" rather than a
   bare "direct" so it doesn't get read as confirmed direct traffic. */
/* Channel bucketing (added 2026-09-19) — mirrors GA4's own default channel
   grouping logic so a raw referring host reads as "Organic social
   (linkedin.com)" instead of a bare hostname nobody wants to eyeball on a
   Slack notification. window.F4W_CLASSIFY_HOST so contact.html's fallback
   copy stays in sync with this one instead of drifting. */
window.F4W_CLASSIFY_HOST = window.F4W_CLASSIFY_HOST || function (host) {
  var h = host.toLowerCase();
  var social = ['linkedin.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'threads.net', 'tiktok.com', 'youtube.com'];
  var ai = ['chatgpt.com', 'chat.openai.com', 'perplexity.ai', 'claude.ai', 'gemini.google.com', 'copilot.microsoft.com'];
  var search = ['google.', 'bing.com', 'duckduckgo.com', 'yahoo.com', 'ecosia.org'];
  for (var i = 0; i < ai.length; i++) { if (h.indexOf(ai[i]) !== -1) return 'AI search (' + host + ')'; }
  for (var i = 0; i < social.length; i++) { if (h.indexOf(social[i]) !== -1) return 'Organic social (' + host + ')'; }
  for (var i = 0; i < search.length; i++) { if (h.indexOf(search[i]) !== -1) return 'Organic search (' + host + ')'; }
  return 'Referral (' + host + ')';
};

(function () {
  var KEY = 'f4w_first_touch';
  try {
    if (!sessionStorage.getItem(KEY)) {
      var p = new URLSearchParams(location.search);
      var us = p.get('utm_source') || '';
      var um = p.get('utm_medium') || '';
      var ref = document.referrer || '';
      var refHost = '';
      try { refHost = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch (e) {}
      var val;
      if (us) val = 'Campaign: ' + us + (um ? '/' + um : '');
      else if (refHost && refHost !== location.hostname) val = window.F4W_CLASSIFY_HOST(refHost);
      else val = 'direct/unknown';
      sessionStorage.setItem(KEY, val);
    }
  } catch (e) { /* storage blocked (private mode etc.) — contact page falls back to live computation */ }
})();

(function () {
  function isContactLink(a) {
    if (!a || !a.getAttribute) return false;
    var href = a.getAttribute('href') || '';
    if (!href) return false;
    var path;
    try { path = new URL(a.href, location.origin).pathname; }
    catch (e) { path = href; }
    return /\/contact(\.html)?$/.test(path);
  }
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!isContactLink(a)) return;
    if (typeof gtag !== 'function') return;
    gtag('event', 'book_call_click', {
      link_text: (a.textContent || '').trim().slice(0, 60),
      link_location: location.pathname
    });
  }, true);
})();
