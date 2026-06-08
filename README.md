# ISU DB MAPS

*Automatically synced with your [v0.dev](https://v0.dev) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/shik-projects/v0-web-app-with-google-maps)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.dev-black?style=for-the-badge)](https://v0.dev/chat/projects/U0ynuoJ5OZ3)

## Overview

This repository will stay in sync with your deployed chats on [v0.dev](https://v0.dev).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.dev](https://v0.dev).

## Deployment

Your project is live at:

**[https://vercel.com/shik-projects/v0-web-app-with-google-maps](https://vercel.com/shik-projects/v0-web-app-with-google-maps)**

## Build your app

Continue building your app on:

**[https://v0.dev/chat/projects/U0ynuoJ5OZ3](https://v0.dev/chat/projects/U0ynuoJ5OZ3)**

## How It Works

1. Create and modify your project using [v0.dev](https://v0.dev)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## Map Data Performance (Snapshot + Offline Cache)

Pentru încărcare mai rapidă în teren, aplicația încearcă în această ordine:
1. Firestore (doar dacă sursa locală e setată explicit pe `firestore`)
2. Snapshot JSON versionat (`manifest.json` + layer files)
3. Fallback GitHub raw
4. Cache local IndexedDB (offline-first în hartă)

### Environment variables

```bash
NEXT_PUBLIC_MAP_SNAPSHOT_BASE_URL=/map-snapshots
NEXT_PUBLIC_MAP_SNAPSHOT_MANIFEST_PATH=manifest.json
```

### Generate snapshots from Firestore

```bash
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MAP_SNAPSHOT_KEEP_COUNT=5
npm run snapshots:generate
```

Comanda creează fișierele în `public/map-snapshots/<version>/` și actualizează:
- `public/map-snapshots/manifest.json`
- `public/map-snapshots/latest-version.txt`

### Automatizare GitHub Actions

Workflow-ul `.github/workflows/generate-map-snapshots.yml` rulează la 6 ore și la `workflow_dispatch`.
Adaugă în GitHub repository secrets:
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

### Trigger din Dashboard (buton „Generate snapshots now”)

Pentru butonul din dashboard, setează în `.env` (server-side):

```bash
GITHUB_SNAPSHOTS_TOKEN=ghp_xxx
GITHUB_REPO_OWNER=your-org-or-user
GITHUB_REPO_NAME=your-repo
GITHUB_WORKFLOW_FILE=generate-map-snapshots.yml
GITHUB_WORKFLOW_REF=main
```

Token-ul GitHub trebuie să poată porni workflow-uri (`actions/workflows:write` sau `repo + workflow`, în funcție de tipul token-ului).

### Manifest format

```json
{
  "version": "2026-04-09T12:00:00Z",
  "generatedAt": "2026-04-09T12:00:00Z",
  "layers": {
    "hydrants": "hydrants.json",
    "primarii": "primarii.json",
    "subunitati": "subunitati.json",
    "polygons": "polygons.json"
  }
}
```

Recomandat: găzduiește snapshot-urile pe același domeniu (ex: `public/map-snapshots`) sau în Firebase Hosting/Storage cu CDN.
