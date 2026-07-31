# Travel Expense Tracker

A mobile-first, offline-first web application designed to log travel expenses in under 5 seconds per entry, per trip, with live budget, spent, and remaining calculations.

## Features

- **Offline-First**: All data is stored locally in `localStorage`.
- **Fast Expense Logging**: Optimized for quick entry on mobile.
- **Historical Exchange Rates**: Snapshot rates from [Frankfurter API](https://api.frankfurter.app) when saving entries, with offline fallback.
- **PWA Support**: Full PWA capabilities via Service Worker & Web Manifest.
- **No Backend / Account Required**: 100% client-side privacy.

## Local Development

To run the application locally:

```bash
npm install
npm run dev
```

Open your browser at `http://localhost:3000` (or the URL printed in terminal).

## Deployment

Automated GitHub Actions workflow builds and deploys to GitHub Pages on every push to the `main` branch.

- **GitHub Pages Base URL**: Configured in `vite.config.ts` under `base: '/travel-expense-tracker/'`.
- **Workflow**: `.github/workflows/deploy.yml` builds the app and publishes `./dist` to the `gh-pages` branch.
