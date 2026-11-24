# Ranking Devil mobile MVP

React Native + Expo + TypeScript mobile refactor.

## Run

```bash
cp .env.example .env
npm start
```

Then scan the Expo QR code with Expo Go, or run `npm run ios` / `npm run android`.

The email flow calls the deployed Cloud Run service in Sydney. Google and Apple buttons currently use a mobile-safe demo sign-in path until native OAuth client IDs and app identifiers are configured; the screen and callback boundary are already in place.

## Native OAuth next

- Register iOS and Android apps in Firebase for project `rankingdevil-508700`.
- Add Google iOS and Android OAuth client IDs.
- Add an iOS bundle identifier and Android package name.
- Configure Sign in with Apple in Apple Developer and Firebase.
- Replace the demo callbacks in `App.tsx` with Expo AuthSession / Apple Authentication credentials.

## Production notes

Keep `.env` local. Expo public variables are client-side identifiers only. Never ship service-account, Resend, or Cloud Run secret values in the app.
