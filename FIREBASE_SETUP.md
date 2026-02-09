# Firebase Setup Guide

This project uses Firebase Authentication, Firestore, and Firebase Hosting.

## 1) Create a Firebase project
1. Go to https://console.firebase.google.com/
2. Create a new project

## 2) Enable Authentication (Email/Password)
1. Firebase Console → Authentication → Get started
2. Sign-in method → Email/Password → Enable
3. Authentication → Users → Add user
   - Use your preferred admin email (example: `admin@example.com`)
   - Set a strong password

Note: the admin UI is restricted to the admin email configured in `src/api/adminAuth.ts` and `firestore.rules`.

## 3) Create Firestore database
1. Firebase Console → Firestore Database → Create database
2. Start in production mode
3. Choose a region

## 4) Configure Firebase credentials
Create a `.env` file in the project root:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## 5) Deploy Firestore rules

```bash
firebase deploy --only firestore:rules
```

## 6) Deploy Hosting

```bash
npm run build
firebase deploy
```

## Notes
- Media is served from the repo via Firebase Hosting (Option A): place files in `public/gallery/` and redeploy.
- Firestore data is shared across devices: reviews and website settings update for all users.
