# Hank's Tank Frontend

> **Live app:** https://frontend-dot-hankstank.uc.r.appspot.com  
> **Companion repos:** [hanks_tank_backend](../hanks_tank_backend) · [hanks_tank_ml](../hanks_tank_ml)

Hank's Tank is a production-style MLB analytics frontend built to showcase applied frontend engineering on top of a real data and ML stack. This repo owns the React SPA: live game views, prediction UX, scouting report presentation, team and player pages, and interactive stat visualizations.

## What this repo covers

- Live scoreboard and game pages backed by the MLB Stats API and the Hank's Tank backend
- Daily prediction cards with confidence tiers, matchup signals, and scouting report links
- Team, player, transaction, and comparison views over historical BigQuery-backed data
- Rich baseball-specific visuals including D3 strike-zone charts and Recharts trend views

## System context

```text
Browser (React SPA)
    |
    +-- direct live reads for selected game views --> MLB Stats API
    |
    +-- /api/* --> Hank's Tank Backend (App Engine)
                     |
                     +-- BigQuery datasets
                     |     - mlb_2026_season
                     |     - mlb_historical_data
                     |
                     +-- ML outputs from hanks_tank_ml
                     |     - game_predictions
                     |     - game_scouting_reports
                     |
                     +-- external baseball/news sources
```

## Frontend highlights

| Area | Notes |
|---|---|
| Predictions | Win-probability cards, confidence tiers, model-specific signal blocks, scouting report entry points |
| Game detail | Real-time linescore, play-by-play, strike-zone rendering, starter/scouting context |
| Stats UI | Sortable leaderboards, player/team pages, seasonal comparisons, transaction views |
| UX polish | Custom dark navigation, responsive layouts, component-scoped styling, centralized API client |

## Stack

| Layer | Technology |
|---|---|
| Framework | React 18, React Router 6 |
| UI | Bootstrap 5, React Bootstrap |
| Charts | D3 v7, Recharts |
| Data access | Centralized `ApiService` with timeout, retry, and caching behavior |
| Hosting | Google Cloud App Engine |
| CI/CD | GitHub Actions build/test workflow plus App Engine deploy on `main` |

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env.local` from `.env.example`.
3. Set local values:
   ```env
   REACT_APP_API_URL=http://localhost:8080/api
   REACT_APP_DEFAULT_SEASON=2026
   ```
4. Start the app:
   ```bash
   npm start
   ```

## Useful scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the development server |
| `npm test -- --watchAll=false` | Run the frontend test suite once |
| `npm run build` | Build a production bundle |
| `npm run build:prod` | Build with production env values |
| `npm run deploy` | Build and deploy to App Engine |

## Repository structure

```text
src/
├── App.js
├── components/
│   ├── Game.js
│   ├── GamesToday.js
│   ├── HomePage.js
│   ├── Navbar.js
│   ├── PlayerPage.js
│   ├── PredictionsPage.js
│   ├── TeamPage.js
│   └── styles/
├── config/
└── services/
    └── api.js
```

## Portfolio note

This repo is the UI surface of a larger system. The backend repo documents the REST/data layer, and the ML repo documents the scheduled prediction and scouting pipeline running in GCP.

## License

MIT
