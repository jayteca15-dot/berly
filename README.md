# Berly Beauty — Salon Website

A modern, responsive salon website with an admin panel for managing site content (contact details, socials, promotions/specials, and gallery ordering) plus a public reviews system.

## Highlights

### Public site
- Luxury, mobile-first UI (React + Tailwind)
- Services, specials/promotions, gallery with lightbox, reviews, contact
- WhatsApp-only booking flow (opens a pre-filled message)
- Media served from `public/gallery/` (simple and hosting-friendly)

### Admin panel
- Secure sign-in via Firebase Authentication
- Manage contact details + social links
- Manage specials/promotions
- Gallery configuration:
  - Internal numbered images (`/gallery/1.jpeg`, `/gallery/2.jpeg`, …)
  - Custom ordering/positioning (including drag-and-drop)
  - Cache-bust refresh button for replaced images
- Featured nails designs block driven by image URLs/paths

## Tech Stack
- React + TypeScript
- Vite
- Tailwind CSS
- Firebase Authentication
- Firestore (site settings + reviews)
- Firebase Hosting

## Local Development

```bash
npm install
npm run dev
```

## Media (Option A: internal assets)
Place images/videos in:

- `public/gallery/`

Examples:
- `public/gallery/1.jpeg`, `public/gallery/2.jpeg`, …
- `public/gallery/1.mp4` (hero video)
- `public/gallery/nails1.jpeg`, `public/gallery/nails2.jpeg`, … (featured nails block)

Then build + deploy.

## Firebase Setup
See `FIREBASE_SETUP.md`.

## Deploy

```bash
npm run build
firebase deploy
```

## Security Notes
- Firestore rules (`firestore.rules`) restrict admin-only writes.
- Admin UI access is restricted to the configured admin email.
