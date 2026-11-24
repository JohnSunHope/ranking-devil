# Ranking Devil — mobile MVP plan

## Google Cloud project\n\n- **Project ID:** `rankingdevil-508700`\n\n## Chosen stack

- **Client:** React Native + Expo + TypeScript.
- **Identity:** Firebase Authentication in the Google Cloud project.
- **Application data:** Firestore initially; migrate read-heavy feeds to Cloud Run APIs when needed.
- **Email verification codes:** Cloud Run service + Firestore TTL collection + Secret Manager + transactional email provider. Firebase's built-in email verification is a link flow, not the requested numeric code flow.

## Current browser demo

The Vite prototype now presents a working visual authentication flow:

1. Google and Apple buttons complete a demo one-tap sign-in.
2. Email registration checks format, then requests a six-digit code.
3. The demo code is `0816`; production replaces that with the Cloud Run endpoint.
4. Successful verification enters the existing Ranking Devil prototype.

## Production token flow

```
App → Google / Apple OAuth → Firebase Auth → Firebase ID token
App → Cloud Run API: Authorization: Bearer <Firebase ID token>
Cloud Run → Firebase Admin SDK verifies token → Firestore / other Google Cloud services
```

Email-code registration:

```
App → POST /auth/email/request-code
Cloud Run → store hashed code + expiry in Firestore (TTL) → email provider
App → POST /auth/email/verify-code
Cloud Run → verify code → Firebase Admin creates / signs in user → returns Firebase custom token
App → Firebase Auth exchanges custom token for a Firebase ID token
```

## Configuration needed to turn on real authentication

1. **Google Cloud / Firebase project ID** and permission to configure Firebase Authentication.
2. **Firebase client config** (API key, auth domain, app ID, project ID). These identifiers are safe to ship in an app; do not send a service-account key.
3. **Google OAuth client IDs** for iOS, Android and web, plus the application package/bundle IDs you want to use.
4. **Apple Sign in configuration:** Apple Team ID, Key ID, Services ID, iOS bundle ID, and a private key uploaded directly to Secret Manager (not pasted into chat).
5. For numeric email codes: a transactional email provider such as Resend, SendGrid, Postmark, or SMTP. Store its API key directly in Secret Manager; provide only the sender domain/address and, if necessary, add me as a project member to configure it.
6. A Google Cloud principal / project access method with least privilege. No long-lived user token is required or appropriate.

## Suggested Google Cloud services

- Firebase Authentication
- Firestore (Native mode) with TTL
- Cloud Run
- Artifact Registry
- Secret Manager
- Cloud Logging and Error Reporting
- Cloud Build or GitHub Actions for deployment
