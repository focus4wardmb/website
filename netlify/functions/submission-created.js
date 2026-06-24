// Netlify event function — fires automatically on every VERIFIED form
// submission (after Netlify's spam filtering). Posts a real-time alert to
// Slack so a website lead pings immediately instead of sitting in the Netlify
// backend. Replaces the old (non-delivering) daily Gmail-watcher path.
//
// Setup: in Netlify → Site configuration → Environment variables, add
//   SLACK_WEBHOOK_URL = <an incoming webhook URL for the target channel>
// (Slack → create an Incoming Webhook app pointed at #incoming-web.)
// Until that var is set, this no-ops gracefully (submissions still saved).
exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || '{}');
    const d = (payload && payload.data) || {};
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      console.log('SLACK_WEBHOOK_URL not set — submission saved, Slack skipped');
      return { statusCode: 200, body: 'no webhook configured' };
    }
    const lines = [
      ':inbox_tray: *New website form submission*',
      `*Name:* ${d.name || '—'}   *Company:* ${d.company || '—'}`,
      `*Email:* ${d.email || '—'}   *Phone:* ${d.phone || '—'}`,
      `*Who:* ${d.role || '—'}   *Source:* ${d.source || '—'}`,
      `*Message:* ${d.message || '—'}`,
      payload && payload.created_at ? `_submitted ${payload.created_at}_` : '',
    ].filter(Boolean);

    const resp = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: lines.join('\n') }),
    });
    if (!resp.ok) {
      console.error('Slack webhook failed:', resp.status, await resp.text());
    }
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.error('submission-created error:', e);
    return { statusCode: 200, body: 'error: ' + e.message }; // never block the submission
  }
};
