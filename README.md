# Inji Interop Playground

A browser sandbox to issue, hold, present and verify Verifiable Credentials across Inji Certify, Inji Wallet, Inji Verify and third-party OpenID4VCI / OpenID4VP products, and to see exactly where interoperability breaks.

## What works
- **Simulated mode (no setup):** real ES256 signing and verification in the browser, 8-way issuer x wallet x verifier matrix, 4 attack scenarios, protocol trace, JSON report export, 3D scene, guide robot.
- **Live mode (needs this backend):** discovers real credential formats from Inji Certify and a third-party issuer, and creates a real Inji Verify presentation request (QR) that a real Inji Wallet can answer.

## Architecture
```mermaid
flowchart LR
  UI[Playground UI<br/>index.html + Three.js] -->|/api/*| API[Orchestrator<br/>server.js]
  UI -. simulated mode .-> SIM[In-browser issuer / wallet / verifier<br/>WebCrypto ES256]
  API -->|GET .well-known/openid-credential-issuer| CERT[Inji Certify]
  API -->|GET .well-known/openid-credential-issuer| EXT[Third-party issuer]
  API -->|POST /vp-request, GET /vp-result/id| VER[Inji Verify]
  WAL[Inji Wallet mobile/web] -->|OpenID4VP direct_post| VER
  CERT -->|OpenID4VCI| WAL
```

## Install and run
1. Start Inji Certify and Inji Verify with their Docker Compose setups (see the `docker-compose` folders in github.com/mosip/inji-certify and github.com/mosip/inji-verify).
2. `cp .env.example .env` and set the three URLs to your running services.
3. `npm start` (Node 20+, no dependencies), then open http://localhost:3000.
4. No backend? Just open `index.html` in a browser for simulated mode, or host it on GitHub Pages.

## API (orchestrator)
| Endpoint | Purpose |
|---|---|
| GET /api/discover | Reads each issuer metadata and returns supported formats (`ldp_vc`, `sd-jwt`) plus verifier status |
| POST /api/verify/request | Calls Inji Verify `POST /vp-request`; returns `{txn, uri}` for the QR |
| GET /api/verify/result/:txn | Proxies Inji Verify `GET /vp-result/{txn}`; `{pending:true}` until the wallet submits |

Inji Verify endpoints used: `/vp-request`, `/vp-result/{transactionId}`. Issuer metadata path is `/.well-known/openid-credential-issuer` (under `/v1/certify/issuance/` on some Certify setups).

## Test data
Sample holder `Asha Rao`, ID `BLR-2026-0417`, detail `B.Tech Computer Science`, types University ID and Farmer Certificate. Keys are generated fresh in the browser on each load. No real personal data.

## Test cases
| # | Case | Expected |
|---|---|---|
| 1 | sd-jwt, Inji issuer to Inji wallet to Inji verifier | PASS |
| 2 | ldp_vc through Third-party Issuer | FAIL: issuer does not offer ldp_vc |
| 3 | ldp_vc into Third-party Wallet from Inji issuer, sd-jwt offer | FAIL: wallet cannot accept sd-jwt |
| 4 | Tampered claim | REJECTED: signature check fails |
| 5 | Expired credential | REJECTED: expiry check fails |
| 6 | Replayed nonce | REJECTED: nonce check fails |
| 7 | Revoked credential | REJECTED: revocation check fails |
| 8 | Live: scan QR with Inji Wallet, share credential | `/vp-result` returns a verification result |

Record your actual run results in `interop-report.json` (matrix tab, Export) and add screenshots.

## Known limits
Live mode has not been run against a deployed stack by the author of this scaffold. Field names in the Inji Verify `/vp-request` response, and the issuer metadata URL, differ between releases: adjust `server.js` if the QR link is empty. Full OpenID4VCI issuance against Inji Certify needs eSignet login and a wallet, so issuance is tested by scanning offers with Inji Wallet, not automated here.
## Team
- Nithya C, role: UI and 3D, Mangalore Institute Of Engineering And Technology
- Pranav S J, role: Frontend, National Institute of Technology Calicut
- ## Live test findings and known limits

Tested against Inji Verify (v1.0.0-alpha.1 style OpenID4VP 1.0 flow) exposed through a Cloudflare tunnel, with Inji Wallet 1.0.0-alpha.1 on Android.

What works:
- The playground discovers real credential formats from a third-party OpenID4VCI issuer (dc+sd-jwt, mso_mdoc).
- POST /vp-request to Inji Verify returns a transaction and request id; the playground builds the openid4vp:// link and QR from it.
- The signed request object is fetchable at /v1/verify/v2/vp-request/{id} (HTTP 200, application/oauth-authz-req+jwt).
- The verifier DID document resolves at /v1/verify/did.json.

What did not work:
- Inji Wallet rejected the QR with "Invalid request link".
- The request header names the signing key did:web:<host>:verify#key-0 (no /v1), while the DID document is served at /v1/verify/did.json. The URL /verify/did.json returns an HTML page instead of a DID document.
- Changing INJI_DID_VERIFY_PUBLIC_KEY_URI to include v1 did not change the wallet's result.
- The wallet had no usable mock credential matching the request at the time of testing, so the full present-and-verify round trip was not completed.

Reproduce: docs/LIVE-MODE.md and scripts/check-live.mjs. The 80-run simulated matrix in docs/test-results/ covers the full protocol logic.
