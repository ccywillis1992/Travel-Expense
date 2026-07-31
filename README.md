# Travel Expense Tracker

A mobile-first, offline-first web application designed to log travel expenses in under 5 seconds per entry with live budget tracking, multi-currency conversion, and Excel export.

## Features

- **Offline-First**: All data is stored safely in `localStorage`.
- **Fast Expense Logging**: Optimized touch controls, category chips, and live split calculations.
- **Historical Exchange Rates**: Snapshot rates from [Frankfurter API](https://api.frankfurter.app) when saving entries, with offline fallback.
- **PWA Capabilities**: Full offline application shell powered by `vite-plugin-pwa` and Service Workers.
- **Excel Export**: Export full trip expense sheets formatted cleanly as `.xlsx` using SheetJS (`xlsx`).
- **No Backend Required**: 100% privacy-preserving client-side architecture.

## Local Development & Testing

To run the application locally:

```bash
npm install
npm run dev
```

To run the automated test suite (Vitest):

```bash
npx vitest run
```

To create a production build and test PWA output:

```bash
npm run build
```

## PWA Icons Location

Placeholder PWA icons are located in:
- `/public/icons/pwa-192x192.png` (192x192 app icon)
- `/public/icons/pwa-512x512.png` (512x512 app icon)

To replace them with your custom logo assets, simply overwrite these PNG files while preserving their dimensions and filenames.

## Deployment to GitHub Pages

An automated GitHub Actions workflow deploys the project to GitHub Pages on every push to the `main` branch:

1. **Repository Setup**: Ensure your GitHub repository name matches `/travel-expense-tracker/` (or update `base` in `vite.config.ts` if using a custom repository name).
2. **Workflow File**: `.github/workflows/deploy.yml` runs `npm ci`, `npm run build`, and publishes `./dist` to GitHub Pages.
3. **GitHub Settings**: Under `Settings > Pages`, ensure the source is set to `Deploy from a branch` and set the branch to `gh-pages` (or `GitHub Actions`).

