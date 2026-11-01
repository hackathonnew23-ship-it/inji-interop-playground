// Smoke test for live mode. Usage: node --env-file=.env scripts/check-live.mjs
const E = process.env;
const show = (ok, name, d) => console.log((ok ? 'OK   ' : 'FAIL ') + name + (d ? ' - ' + d : ''));
for (const [n, u] of [['Inji Certify metadata', E.CERTIFY_META_URL], ['Third-party issuer metadata', E.EXT_ISSUER_META_URL]]) {
  try { const r = await fetch(u, { signal: AbortSignal.timeout(8000) }); const m = r.ok && await r.json();
    const c = m && Object.values(m.credential_configurations_supported || m.credentials_supported || {});
    show(r.ok && c.length > 0, n, r.ok ? c.length + ' credential types, formats: ' + [...new Set(c.map(x => x.format))].join(', ') : 'HTTP ' + r.status);
  } catch (e) { show(false, n, e.message + ' (' + u + ')'); }
}
try {
  const r = await fetch(E.VERIFY_URL + '/vp-request', { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ clientId: E.VERIFY_CLIENT_ID, presentationDefinition: { id: 'smoke', input_descriptors: [{ id: 'any', constraints: { fields: [{ path: ['$.type'] }] } }] } }) });
  const d = await r.json(); show(r.ok, 'Inji Verify POST /vp-request', r.ok ? 'transaction ' + d.transactionId : 'HTTP ' + r.status);
  console.log('Raw response (send this to me if the QR link is empty):\n' + JSON.stringify(d, null, 2));
} catch (e) { show(false, 'Inji Verify POST /vp-request', e.message); }
