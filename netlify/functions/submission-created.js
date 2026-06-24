// Netlify event function — fires automatically on every VERIFIED form
// submission (after Netlify's spam filtering). Posts a real-time alert to
// Slack so a website lead pings immediately instead of sitting in the Netlify
// backend. Replaces the old (non-delivering) daily Gmail-watcher path.
//
// Setup: in Netlify → Site configuration → Environment variables, add
//   SLACK_WEBHOOK_URL = <an incoming webhook URL for #incoming-web>
// Mark it as a secret (it's a credential). Until it's set, this no-ops
// gracefully (submissions are still saved by Netlify).
//
// Uses the Node https module (not global fetch) so it works on any Netlify
// Node runtime, and logs the Slack response so the Functions log is diagnostic.
const https = require('https');

function postToSlack(webhookUrl, text) {
  return new Promise((resolve) => {
    try {
      const u = new URL(webhookUrl);
      const body = JSON.stringify({ text });
      const req = https.request(
        {
          hostname: u.hostname,
          path: u.pathname + u.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve({ status: res.statusCode, data }));
        }
      );
      req.on('error', (e) => resolve({ status: 0, data: String(e) }));
      req.write(body);
      req.end();
    } catch (e) {
      resolve({ status: 0, data: String(e) });
    }
  });
}

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

    const r = await postToSlack(webhook, lines.join('\n'));
    console.log('Slack post status:', r.status, '| body:', r.data);
    return { statusCode: 200, body: 'slack status ' + r.status };
  } catch (e) {
    console.error('submission-created error:', e);
    return { statusCode: 200, body: 'error: ' + e.message }; // never block the submission
  }
};
