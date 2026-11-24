# Email verification API

Cloud Run API for Ranking Devil's numeric email verification codes.

## Endpoints

- `POST /auth/email/request-code` with `{ "email": "you@example.com" }`
- `POST /auth/email/verify-code` with `{ "email": "you@example.com", "code": "123456" }`
- `GET /health`

On success, verification returns a Firebase custom token. The client exchanges it through Firebase Auth, then uses the Firebase ID token for future requests.

## Security choices

- Codes are cryptographically random, valid for 10 minutes, and never stored in plain text.
- Firestore stores a hash of email + code + a server-side pepper.
- One active code per email; resends are throttled to 60 seconds.
- Five wrong attempts invalidate the code.
- Firestore TTL must be enabled for the `emailLoginCodes.expiresAt` field.

## First deployment

1. Verify a sending domain in Resend and decide the sender address, such as `auth@rankingdevil.app`.
2. In Google Cloud project `rankingdevil-508700`, create Secret Manager secrets named `RESEND_API_KEY` and `CODE_PEPPER`.
3. Enable Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Firestore, and Firebase Authentication.
4. From this directory, install and build:

```bash
npm install
npm run build
```

5. Deploy Cloud Run (choose a region near your users):

```bash
gcloud run deploy ranking-devil-auth \
  --source . \
  --project rankingdevil-508700 \
  --region australia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars EMAIL_FROM="Ranking Devil <auth@your-verified-domain.com>",ALLOWED_ORIGINS="http://127.0.0.1:5173" \
  --set-secrets RESEND_API_KEY=RESEND_API_KEY:latest,CODE_PEPPER=CODE_PEPPER:latest
```

6. Add the returned service URL to the web project's `VITE_AUTH_API_URL`, restart the web dev server, and add the production web domain to both `ALLOWED_ORIGINS` and Firebase Authentication's Authorized domains.

Never put Resend keys, the code pepper, or Firebase service-account keys into the mobile/web app.
