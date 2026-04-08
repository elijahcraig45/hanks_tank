# Hank's Tank — MLB Analytics Platform

> **Live:** [https://frontend-dot-hankstank.uc.r.appspot.com](https://frontend-dot-hankstank.uc.r.appspot.com)

A full-featured MLB analytics dashboard built as a personal data-engineering showcase. Combines real-time MLB data, a custom Node/TypeScript REST API, a Google BigQuery data warehouse, and daily ML predictions from a V8 ensemble model (CatBoost × 2 + LightGBM + MLP, **57.65% accuracy on 1,243-game 2025 holdout**) into a single production-grade React SPA deployed on Google Cloud App Engine.

This is one of three interconnected repositories:

| Repo | Role | Stack |
|---|---|---|
| **hanks_tank** ← you are here | React SPA frontend | React 18, Bootstrap 5, D3, App Engine |
| **[hanks_tank_backend](../hanks_tank_backend)** | REST API + data layer | TypeScript, Express, BigQuery, App Engine |
| **[hanks_tank_ml](../hanks_tank_ml)** | ML pipeline + daily inference | Python, CatBoost, LightGBM, Cloud Functions |

---

## ✨ Key Features

### 🔮 ML-Powered Game Predictions
- Daily predictions for every MLB game served from BigQuery via the backend API
- Win-probability bars, confidence tiers (HIGH / MEDIUM / LOW), and lineup-confirmation flags
- **Pre-game Scouting Report** on every game page: Elo ratings, Pythagorean win%, last-10 run differential, streak indicators, H2H history (3-year), starter ERA/wOBA, bullpen health
- Signal generation automatically branches on model version: V8 shows Elo/Pythagorean/form signals; V6-V7 shows wOBA matchup signals

### ⚾ Live Game Experience
- Real-time linescore, play-by-play with **differentiated result badges** (GO/FO/LD/PO/FC vs generic OUT)
- **D3 strike zone** with per-pitch-type color coding (13 pitch types), numbered pitch sequence, ⭐ home-run markers, and a **batter silhouette** that mirrors hand/position correctly between umpire and pitcher views
- Click any at-bat in the play-by-play to focus the strike zone on that sequence

### 📊 Stats Database (2015–2026)
- 35,000+ records in BigQuery exposed through the backend API
- Team batting / pitching with sortable, filterable tables and league-rank sparklines
- Player pages with headshot, career trend charts (Recharts), sabermetric grids (wOBA, BABIP, OPS+, K%, BB%, FIP, xFIP), and full Statcast heat-map via the strike zone component
- Season comparison, player comparison (side-by-side radar + delta tables), team comparison

### 🔬 Advanced Analysis
- Scatter plot matrix, correlation analysis, percentile rankings
- AI-assisted analysis (natural language queries forwarded to the backend)

---

## 🏗️ Architecture

```
Browser (React SPA)
    │
    ├─ /games, /game/:pk  ──► MLB Stats API (public, real-time)
    │
    └─ /api/*  ─────────────► hanks_tank_backend (App Engine)
                                    │
                                    ├─ BigQuery  (historical stats, predictions)
                                    ├─ FanGraphs (player analytics)
                                    └─ MLB API   (standings, live scores)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| UI framework | React 18, React Router 6 |
| Component library | React Bootstrap 2 / Bootstrap 5 |
| Visualizations | D3 v7, Recharts |
| State | React Hooks (no Redux) |
| API client | Centralized `ApiService` with retry, timeout, cache |
| Hosting | Google Cloud App Engine (frontend service) |
| CI/CD | `gcloud app deploy` via `build.sh` |

---

## 🚀 Local Development

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env.local
# Set REACT_APP_API_URL=http://localhost:8080

# 3. Start dev server
npm start
```

### Build & Deploy

```bash
npm run build
gcloud app deploy app.yaml --quiet
```

---

## 📁 Project Structure

```
src/
├── App.js                  # Route declarations
├── index.js                # Entry + global CSS imports
├── components/
│   ├── HomePage.js         # Dashboard: stats pills, games carousel, standings
│   ├── GamesToday.js       # /games — live scoreboard + V8 signals
│   ├── Game.js             # /game/:pk — scouting report, play-by-play, lineups
│   ├── LiveGameStrikeZone.js  # D3 strike zone with batter silhouette
│   ├── PredictionsPage.js  # /predictions — date-nav, confidence groups, why-cards
│   ├── PlayerPage.js       # /player/:id — stats, trends, Statcast heat-map
│   ├── TeamPage.js         # /team/:abbr — roster, batting, pitching, transactions
│   ├── PlayerBatting.js    # /PlayerBatting — leaderboard table
│   ├── PlayerPitching.js   # /PlayerPitching — leaderboard table
│   ├── TeamBatting.js      # /TeamBatting
│   ├── TeamPitching.js     # /TeamPitching
│   ├── SeasonComparison.js # Season-over-season delta charts
│   ├── PlayerComparison.js # Side-by-side player radar
│   ├── TeamComparison.js   # Team delta analysis
│   ├── AdvancedPlayerAnalysis.js
│   ├── StrikeZone.js       # Statcast heat-map (historical, from API)
│   ├── BoxScore.js         # Innings linescore table
│   ├── Navbar.js           # Custom dark nav with dropdowns
│   ├── Transactions.js
│   └── styles/             # Per-component CSS modules
├── services/
│   └── api.js              # Centralized ApiService (retry, cache, timeout)
└── config/
    └── constants.js        # Season constants, thresholds
```

---

## 🌐 Environment Variables

Create a `.env.local` file (never committed):

```
REACT_APP_API_URL=https://hankstank.uc.r.appspot.com
REACT_APP_DEFAULT_SEASON=2026
```

---

## 📄 License

MIT — see [LICENSE](LICENSE)

This frontend connects to the Hank's Tank Backend API for all data operations. The backend handles:
- MLB Stats API integration
- BigQuery historical data retrieval
- Data caching and optimization
- Intelligent routing between live and historical data sources

## Project Structure

```
src/
├── components/     # React components
├── services/       # API service layer
├── config/         # Configuration constants
├── utils/          # Utility functions
└── App.js         # Main application component
```

## License

MIT
- `AssistedAnalysis.js` - AI-powered insights and analysis

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/elijahcraig45/2024_mlb.git
cd 2024_mlb
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the application

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── styles/          # Component-specific CSS
│   ├── HomePage.js      # Landing page
│   ├── PlayerPage.js    # Player analytics
│   ├── TeamPage.js      # Team analytics
│   └── ...              # Other components
├── App.js               # Main application component
├── App.css              # Global styles
└── index.js             # Application entry point

public/
├── data/                # Static data files
│   ├── 2024_*.json     # 2024 season data
│   └── 2025_*.json     # 2025 season data
├── index.html           # HTML template
└── manifest.json        # PWA manifest
```

## 🔧 Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
**Note: This is a one-way operation!** Ejects from Create React App

## 📊 Data Sources

- **Static Data**: JSON files in `/public/data/` directory
- **Live Data**: Connected to MLB APIs via backend server
- **News Data**: Aggregated MLB news and Atlanta Braves updates

## 🔗 Backend Integration

This frontend connects to the companion backend API server for:
- Live game data
- Real-time statistics
- Database queries
- External API integrations

Backend repository: [mlb_pi](https://github.com/elijahcraig45/mlb_pi)

## 🎨 Styling

- **Bootstrap 5.3** for responsive grid and components
- **Custom CSS** in `/src/components/styles/`
- **Responsive design** optimized for desktop and mobile

## 📈 Analytics Features

- **Player Comparisons**: Side-by-side statistical analysis
- **Team Performance**: Historical and current season metrics
- **Advanced Metrics**: Sabermetrics and modern baseball analytics
- **Visualizations**: Interactive charts and graphs
- **Strike Zone Analysis**: Pitch location and outcome tracking

## 🚀 Deployment

Built with Create React App, this application can be deployed to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏆 About

**Hank's Tank 2025** - Named in honor of Hank Aaron, this analytics platform provides comprehensive baseball insights for the modern game. Built for analysts, fans, and anyone passionate about baseball statistics.

---

⚾ *Play Ball!* ⚾

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
