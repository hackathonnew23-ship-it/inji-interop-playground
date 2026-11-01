# Live mode guide (for the teammate running the real Inji services)

Goal: make the **Live Inji** tab discover real credential formats and create a real Inji Verify request that Inji Wallet can answer.
Based on the Inji Certify, Inji Verify and MOSIP community docs. Versions differ, so if a step fails, read the README of the version you cloned.

## 0. Prerequisites
- Docker Desktop (Docker 26+, Compose 2.25+), Git, Node 20+.
- Windows: run any `.sh` scripts from **Git Bash**. Apple Silicon Mac: run `export DOCKER_DEFAULT_PLATFORM=linux/amd64` first.
- **Port clash:** Inji Verify UI uses port 3000. This playground now defaults to **3001** (`PORT=3001` in `.env.example`).

## 1. Fastest check: use MOSIP's hosted test environment for the issuer
In a browser, try opening:
`https://api.collab.mosip.net/v1/certify/issuance/.well-known/openid-credential-issuer`
If you see JSON, put that URL in `CERTIFY_META_URL` and skip step 3. (Public test servers can change or go down.)

## 2. Run Inji Verify (needed for the real QR flow)
1. `git clone https://github.com/mosip/inji-verify` then `cd inji-verify` and `git checkout develop`.
2. Follow the README: the `inji-verify` folder holds the UI (`docker compose up -d`, opens at http://localhost:3000) and `verify-service` holds the backend with `/vp-request` and `/vp-result`. Start the **verify-service** per its own README.
3. Set `VERIFY_URL` in `.env` to the base URL where `/vp-request` answers (often ends in `/v1/verify`).
4. If verification of credentials says invalid, the community advises checking `WEB_DID_BASE_URL` in the Verify docker-compose.

## 3. Run Inji Certify (only if the hosted issuer in step 1 does not work)
1. `git clone https://github.com/mosip/inji-certify`, `cd inji-certify`, then run the install script and choose **1. Sunbird RC**, then run it again and choose **2. Esignet**.
2. Create an issuer and credential schema with the Postman collections in the repo, then set the issuer id and schema id in `esignet-default.properties`.
3. Open the issuer `.well-known/openid-credential-issuer` URL in a browser and paste that exact URL into `CERTIFY_META_URL`.

## 4. Test it
1. `cp .env.example .env` and fill in the URLs.
2. `node --env-file=.env scripts/check-live.mjs`. Every line should say OK. **Copy the whole output if anything fails.**
3. `npm start`, open http://localhost:3001, go to **Live Inji**, click **Create real Inji Verify request**.
4. Scan the QR with Inji Wallet, share a credential, and wait for the result to appear.
5. Screenshot every step into `docs/test-results/` and commit them.

## What counts as done
- Minimum: check-live shows the third-party issuer OK and the Verify request returns a transaction id.
- Full: the QR is scanned by Inji Wallet and a verification result comes back.
