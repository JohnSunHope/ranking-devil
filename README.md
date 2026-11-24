# Ranking Devil

Ranking Devil is a mobile-first social comparison app. Users can rate and compare anything—from ski fields and supermarkets to pens and fictional characters—then publish the result for reactions, comments, and remixes.

## What is included

- Expo / React Native mobile application in `mobile/`
- React + Vite web prototype in `src/`
- Firebase Authentication integration
- Email verification API for Cloud Run in `services/auth-api/`
- Comparison tools for length, area, symbols, images, and numeric rankings
- Multi-object overview and swipeable detail views
- Devil Lab challenges: blind ranking, boomerang, opposing-side takeover, bracket, and 100-point allocation
- Chinese and English UI

## Local development

### Mobile app

```bash
cd mobile
cp .env.example .env
npm install
npm start
```

To open the app through Expo Go from another network:

```bash
npm start -- --tunnel
```

### Web prototype

```bash
npm install
npm run dev
```

### Authentication API

```bash
cd services/auth-api
cp .env.example .env
npm install
npm run dev
```

## Configuration

Environment files are intentionally excluded from Git. Copy the relevant `.env.example` file and supply your Firebase, Cloud Run, and Resend settings locally.

Firebase project used by the demo: `rankingdevil-508700`.

## Status

This repository is an evolving product prototype. Authentication, publishing, comments, reactions, and comparison data currently include demo behavior that should be replaced with persistent backend storage before production release.
