// Orchestrator: serves the playground and proxies real Inji / third-party services.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
const E = process.env, PORT = E.PORT || 3000;
const norm = f => /sd-jwt/.test(f) ? 'sd-jwt' : /ldp|json-ld/.test(f) ? 'ldp_vc' : String(f);
const j = (res, code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };

async function meta(name, url) {           // OpenID4VCI issuer metadata discovery
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const m = await r.json();
    const c = Object.values(m.credential_configurations_supported || m.credentials_supported || {});
    return { name, url, ok: true, formats: [...new Set(c.map(x => norm(x.format)))] };
  } catch (e) { return { name, url, ok: false, error: e.message, formats: [] }; }
}

async function createVpRequest() {         // POST {VERIFY_URL}/vp-request (Inji Verify)
  const body = { clientId: E.VERIFY_CLIENT_ID, presentationDefinition: {
    id: 'interop-any-credential',
    input_descriptors: [{ id: 'any', constraints: { fields: [{ path: ['$.type'] }] } }] } };
  const r = await fetch(E.VERIFY_URL + '/vp-request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok) return { error: 'Inji Verify answered ' + r.status, raw: d };
  const a = d.authorizationDetails || {};  // adjust if your Verify version names these differently
  const uri = a.requestUri ? `openid4vp://authorize?client_id=${encodeURIComponent(a.clientId || E.VERIFY_CLIENT_ID)}&request_uri=${encodeURIComponent(a.requestUri)}` : null;
  return { txn: d.transactionId, uri, raw: d };
}

http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  try {
    if (u.pathname === '/api/discover') return j(res, 200, {
      issuers: { inji: await meta('Inji Certify', E.CERTIFY_META_URL), ext: await meta('Third-party Issuer', E.EXT_ISSUER_META_URL) },
      verifier: { name: 'Inji Verify', url: E.VERIFY_URL, ok: !!E.VERIFY_URL, formats: (E.VERIFY_FORMATS || 'ldp_vc').split(',') } });
    if (u.pathname === '/api/verify/request' && req.method === 'POST') return j(res, 200, await createVpRequest());
    if (u.pathname.startsWith('/api/verify/result/')) {   // GET {VERIFY_URL}/vp-result/{txn}
      const r = await fetch(E.VERIFY_URL + '/vp-result/' + encodeURIComponent(u.pathname.split('/').pop()));
      return r.ok ? j(res, 200, await r.json()) : j(res, 200, { pending: true });
    }
    res.writeHead(200, { 'content-type': 'text/html' }); res.end(await readFile(new URL('./index.html', import.meta.url)));
  } catch (e) { j(res, 500, { error: e.message }); }
}).listen(PORT, () => console.log('Playground on http://localhost:' + PORT));
