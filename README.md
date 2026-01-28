# Hank's Tank - MLB Analytics Platform

A professional React-based baseball analytics dashboard providing comprehensive MLB statistics, visualizations, and insights.

## 🌐 Live Application

**[https://frontend-dot-hankstank.uc.r.appspot.com](https://frontend-dot-hankstank.uc.r.appspot.com)**

## Features

- **Real-Time Data**: Live game scores and current season statistics
- **Historical Analysis**: Access to historical data from 2015-2025
- **Advanced Metrics**: Sabermetric statistics including wOBA, ISO, BABIP, and more
- **Team Analytics**: Comprehensive team performance dashboards with league rankings
- **Player Comparisons**: Side-by-side player analysis with radar charts
- **Interactive Visualizations**: Charts, graphs, and data tables
- **Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- React 18.2 with Hooks
- React Router 6
- Bootstrap 5.3 & React Bootstrap
- Recharts for data visualization
- Google Cloud App Engine hosting

## Installation

```bash
npm install
npm start
```

## Environment Variables

Create a `.env.local` file:

```
REACT_APP_API_URL=http://localhost:8080
REACT_APP_DEFAULT_SEASON=2026
```

## Build & Deploy

```bash
npm run build
gcloud app deploy
```

## API Integration

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
