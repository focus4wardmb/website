/* Focus4ward — lightweight GA4 event tracking.
   Loaded site-wide (defer). Fires a `book_call_click` event whenever a
   "Book a call" / "Faisons le point" CTA (any link to the contact page) is
   clicked, so we can see top-of-funnel intent alongside the `generate_lead`
   conversion fired on contact-form submit.
   GA4 uses sendBeacon transport, so the event survives the navigation. */
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
