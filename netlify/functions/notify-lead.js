// HTTP function called directly by the contact form on successful submit.
// Posts the lead to Slack in real time via SLACK_WEBHOOK_URL (Netlify env var).
//
// This replaces the `submission-created` event function, which Netlify does not
// reliably trigger for AJAX/JavaScript form submissions. Firing from the form's
// own success handler removes that dependency entirely.
//
// Lightly gated: only accepts requests whose Referer/Origin is focus4ward.co,
// so the public endpoint can't be casually spammed into the Slack channel.
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
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
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
    const h = event.headers || {};
    const ref = h.referer || h.origin || h.Referer || h.Origin || '';
    if (!/focus4ward\.co/.test(ref)) {
      return { statusCode: 200, body: 'ignored (origin)' };
    }
    const body = JSON.parse(event.body || '{}');
    const d = body.data || (body.payload && body.payload.data) || {};
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) {
      console.log('SLACK_WEBHOOK_URL not set');
      return { statusCode: 200, body: 'no webhook configured' };
    }
    const lines = [
      ':inbox_tray: *New website form submission*',
      `*Name:* ${d.name || '—'}   *Company:* ${d.company || '—'}`,
      `*Email:* ${d.email || '—'}   *Phone:* ${d.phone || '—'}`,
      `*Who:* ${d.role || '—'}   *Source:* ${d.source || '—'}`,
      `*Message:* ${d.message || '—'}`,
    ];
    const r = await postToSlack(webhook, lines.join('\n'));
    console.log('Slack post status:', r.status, '| body:', r.data);
    return { statusCode: 200, body: 'slack status ' + r.status };
  } catch (e) {
    console.error('notify-lead error:', e);
    return { statusCode: 200, body: 'error: ' + e.message };
  }
};
